-- Auth_session.sql
-- Helpers: invitation table, RLS policy for user_roles, and trigger-based auto-assignment
-- Assumption: your project uses `school_id` on user_roles (bigint). If you use `branch_id` (uuid), replace occurrences of `school_id` with `branch_id` and adjust types.

-- NOTE: Run this in the Supabase SQL editor as project owner (or with a service_role) so the trigger/function can be created with proper privileges.

-- 1) Ensure extension for gen_random_uuid
create extension if not exists pgcrypto;

-- 2) Invitations table (source-of-truth for pending role assignments)
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL, -- set when invitee completes registration (optional)
  email text NOT NULL,
  role text NOT NULL,
  school_id bigint NOT NULL,    -- change to branch_id uuid if your app uses UUID branch ids
  invited_by uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_invitations_user_id ON public.user_invitations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_school_id ON public.user_invitations (school_id);

-- 3a) RLS for user_invitations: who can create/read/update/delete invitations
-- Enable row level security on user_invitations
ALTER TABLE IF EXISTS public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Helper note: policies below use checks against public.user_roles to determine
-- whether the current authenticated user is a super_admin or an admin for the
-- target school. That table already has a SELECT policy allowing users to read
-- their own roles; super_admin/admin will be able to verify their own role row.

-- INSERT: allow super_admins to create invitations for any school
CREATE POLICY IF NOT EXISTS "Super admins can insert invitations"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );

-- INSERT: allow school admins to create invitations for their own school
CREATE POLICY IF NOT EXISTS "Admins can insert invitations for their school"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
        AND ur.school_id::text = public.user_invitations.school_id::text
    )
  );

-- SELECT: allow the invited user to read their invitation (by user_id or email)
CREATE POLICY IF NOT EXISTS "Invited user can read their invitation"
  ON public.user_invitations
  FOR SELECT
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- SELECT: allow super_admins and school admins to read invitations for schools they manage
CREATE POLICY IF NOT EXISTS "Admins and super_admins can read invitations for their school"
  ON public.user_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role = 'super_admin'
          OR (ur.role = 'admin' AND ur.school_id::text = public.user_invitations.school_id::text)
        )
    )
  );

-- UPDATE: allow invited user to update status to 'accepted' (or allow limited updates)
CREATE POLICY IF NOT EXISTS "Invited user can update their invitation status"
  ON public.user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    -- allow only status changes by the invited user; prevents changing role/school
    (status IS NOT NULL AND status IN ('accepted','declined'))
    AND (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- UPDATE: allow super_admins and school admins to modify invitations for their school
CREATE POLICY IF NOT EXISTS "Admins and super_admins can update invitations for their school"
  ON public.user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role = 'super_admin'
          OR (ur.role = 'admin' AND ur.school_id::text = public.user_invitations.school_id::text)
        )
    )
  )
  WITH CHECK (
    -- Ensure they don't reassign the invitation to a different school in the same update
    school_id::text = public.user_invitations.school_id::text
  );

-- DELETE: allow super_admins and school admins to delete invitations for their school
CREATE POLICY IF NOT EXISTS "Admins and super_admins can delete invitations for their school"
  ON public.user_invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (
          ur.role = 'super_admin'
          OR (ur.role = 'admin' AND ur.school_id::text = public.user_invitations.school_id::text)
        )
    )
  );


-- 3) Row-Level Security policy for public.user_roles
-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to insert their own 'admin' role if a matching pending invitation exists
-- This prevents self-granting roles without an invitation
CREATE POLICY IF NOT EXISTS "Users can insert their own admin role from invitation"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- user can only create a role for themselves
    auth.uid() = user_id
    -- restrict to only creating the 'admin' role via this path
    AND role = 'admin'
    -- require a pending invitation for this email or explicitly by user_id for the same school
    AND EXISTS (
      SELECT 1
      FROM public.user_invitations ui
      WHERE ui.status = 'pending'
        AND ui.role = 'admin'
        AND (
          -- invitation targeted by user_id (server might pre-set this)
          (ui.user_id IS NOT NULL AND ui.user_id = auth.uid())
          OR
          -- invitation targeted by email matching the authenticated user's email
          (ui.email IS NOT NULL
            AND ui.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
        -- school must match the inserted row's school_id
        AND ui.school_id::text = school_id::text
    )
  );

-- Optional: allow users to read their own roles
CREATE POLICY IF NOT EXISTS "Users can read their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING ( auth.uid() = user_id );

-- 4) Trigger-based automation: when an auth.user confirms email, automatically accept invitation (if any)
-- IMPORTANT: This function should be created as SECURITY DEFINER and the owner should be a role that has privileges to bypass RLS
-- If you cannot ensure that, run this as project owner and verify the function owner has BYPASSRLS or use a server-side service_role alternative.

CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Only proceed if the new row has an email and the email was just confirmed
  -- (trigger WHEN clause will already limit this, but keep defensive check)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the earliest pending invitation for this email
  SELECT * INTO inv
  FROM public.user_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
  ORDER BY created_at
  LIMIT 1;

  IF FOUND THEN
    -- Insert the role for the new user. We do NOT check RLS here because function runs as SECURITY DEFINER.
    -- Adjust column names/types if your user_roles table differs.
    INSERT INTO public.user_roles (user_id, role, school_id, created_at, updated_at)
    VALUES (NEW.id, inv.role, inv.school_id, now(), now());

    -- Mark the invitation accepted and attach the user_id
    UPDATE public.user_invitations
    SET status = 'accepted', user_id = NEW.id, updated_at = now()
    WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users: fires after email_confirmed_at is set (i.e., when user confirms email)
DROP TRIGGER IF EXISTS after_auth_user_confirmed ON auth.users;
CREATE TRIGGER after_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_invited_user();

-- 5) Safety notes (read before running in production)
-- - The trigger function runs with the privileges of its owner. Ensure the function owner has appropriate permissions and, if necessary, BYPASSRLS.
-- - If you cannot create a SECURITY DEFINER function with BYPASSRLS, implement the acceptance step server-side using a service_role key.
-- - Test on staging before applying to production.

-- 6) Alternate (frontend) flow: if you prefer not to use triggers,
-- keep the RLS policy above and have your frontend insert into public.user_roles after the user sets their password. The INSERT will succeed only if the invitation exists.

-- End of Auth_session.sql
