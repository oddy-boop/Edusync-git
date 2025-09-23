-- 20250921_user_roles_rls.sql
-- Enables row level security on user_roles and creates conservative policies.
-- Idempotent: drops existing policies with the same names and recreates them.

-- Ensure helper functions used by policies exist and run with RLS disabled.
-- These are created idempotently so this migration can be applied safely regardless
-- of prior migration ordering.
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

CREATE OR REPLACE FUNCTION public.get_my_school_id() RETURNS bigint AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

-- Enable RLS on user_roles
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if present (safe to run multiple times)
DROP POLICY IF EXISTS "user_roles_user_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_super_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_super_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_school_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage_school" ON public.user_roles;

-- Users can SELECT their own role rows
CREATE POLICY "user_roles_user_select" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can INSERT their own role row (used for invitation flows)
CREATE POLICY "user_roles_user_insert" ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own role row (rare, but allow updating metadata limited to own rows)
CREATE POLICY "user_roles_user_update" ON public.user_roles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super-admins (identified by being in user_roles as 'super_admin') can SELECT/INSERT/UPDATE/DELETE any row
CREATE POLICY "user_roles_super_admin_select" ON public.user_roles
  FOR SELECT
  USING (get_my_role() = 'super_admin');

CREATE POLICY "user_roles_super_admin_manage" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- School admins (users with an 'admin' role and an admins row linking them to a school) can SELECT rows for their school
CREATE POLICY "user_roles_school_admin_select" ON public.user_roles
  FOR SELECT
  USING (get_my_role() = 'admin' AND get_my_school_id() = public.user_roles.school_id);

CREATE POLICY "user_roles_admin_manage_school" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'admin' AND get_my_school_id() = public.user_roles.school_id)
  WITH CHECK (get_my_role() = 'admin' AND get_my_school_id() = public.user_roles.school_id);

-- Ensure authenticated role has minimal object privileges (these GRANTs are idempotent)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;