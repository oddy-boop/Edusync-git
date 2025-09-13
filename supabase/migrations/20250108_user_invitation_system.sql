-- =========================
-- User Invitation System Migration
-- Role-based user registration and invitation management
-- Secure role assignment with school affiliation
-- =========================

BEGIN;

-- =========================
-- Enable RLS on User Invitations
-- =========================

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- =========================
-- Invitation Management Policies
-- =========================

-- Super Admins: Can create invitations for any school and any role
CREATE POLICY "Super admins can create invitations for any school" ON public.user_invitations
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
        )
    );

-- School Admins: Can create invitations for their own school (admin, teacher, student, accountant)
CREATE POLICY "Admins can create invitations for their school" ON public.user_invitations
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND ur.school_id = public.user_invitations.school_id
        )
        AND role IN ('admin', 'teacher', 'student', 'accountant')
    );

-- =========================
-- Invitation Viewing Policies
-- =========================

-- Super Admins and School Admins: Can read invitations they can manage
CREATE POLICY "Admins and super admins can read invitations for schools they manage" ON public.user_invitations
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (
                ur.role = 'super_admin'
                OR (ur.role = 'admin' AND ur.school_id = public.user_invitations.school_id)
            )
        )
    );

-- Invited Users: Can read their own invitations (by user_id when set)
CREATE POLICY "Invited users can read their own invitations" ON public.user_invitations
    FOR SELECT 
    TO authenticated
    USING (
        user_id IS NOT NULL AND user_id = auth.uid()
    );

-- =========================
-- Invitation Update Policies
-- =========================

-- Invited Users: Can update their invitation status to 'accepted'
CREATE POLICY "Invited users can update their invitation status" ON public.user_invitations
    FOR UPDATE 
    TO authenticated
    USING (
        user_id IS NOT NULL AND user_id = auth.uid()
    )
    WITH CHECK (
        user_id IS NOT NULL AND user_id = auth.uid()
        AND status IN ('accepted', 'rejected')
        -- Note: Cannot prevent role/school changes in RLS policy due to OLD not being available
        -- This validation should be handled at the application level
    );

-- Admins: Can update invitations they created
CREATE POLICY "Admins can update invitations they manage" ON public.user_invitations
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (
                ur.role = 'super_admin'
                OR (ur.role = 'admin' AND ur.school_id = public.user_invitations.school_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (
                ur.role = 'super_admin'
                OR (ur.role = 'admin' AND ur.school_id = public.user_invitations.school_id)
            )
        )
    );

-- =========================
-- Invitation Deletion Policies
-- =========================

-- Admins: Can delete invitations they manage
CREATE POLICY "Admins and super admins can delete invitations they manage" ON public.user_invitations
    FOR DELETE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (
                ur.role = 'super_admin'
                OR (ur.role = 'admin' AND ur.school_id = public.user_invitations.school_id)
            )
        )
    );

-- =========================
-- User Role Assignment Policies (Based on Invitations)
-- =========================

-- Users can insert their own role based on pending invitations
CREATE POLICY "Users can insert their own role from pending invitation" ON public.user_roles
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        -- User can only create a role for themselves
        auth.uid() = user_id
        -- Must have a pending invitation for this role and school
        AND EXISTS (
            SELECT 1
            FROM public.user_invitations ui
            WHERE ui.status = 'pending'
            AND ui.role = public.user_roles.role
            AND ui.school_id = public.user_roles.school_id
            AND (
                -- Direct invitation by user_id (server-side invite flow)
                (ui.user_id IS NOT NULL AND ui.user_id = auth.uid())
                -- OR email-based invitation (client-side signup flow)
                OR (ui.user_id IS NULL AND LOWER(ui.email) = LOWER(auth.email()))
            )
        )
    );

-- Allow users to read their own roles
CREATE POLICY "Users can read their own roles" ON public.user_roles
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- =========================
-- Automatic Role Assignment Functions
-- =========================

-- Function to automatically accept invitation and create user role when user confirms email
CREATE OR REPLACE FUNCTION auto_accept_invitation_on_confirm()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record public.user_invitations%ROWTYPE;
BEGIN
    -- Only process when email is confirmed (email_confirmed_at is set)
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        
        -- Find pending invitation for this email
        SELECT * INTO invitation_record
        FROM public.user_invitations
        WHERE LOWER(email) = LOWER(NEW.email)
        AND status = 'pending'
        AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF invitation_record.id IS NOT NULL THEN
            -- Update invitation with user_id and accept it
            UPDATE public.user_invitations
            SET 
                user_id = NEW.id,
                status = 'accepted',
                updated_at = now()
            WHERE id = invitation_record.id;
            
            -- Create user role record
            INSERT INTO public.user_roles (user_id, role, school_id)
            VALUES (NEW.id, invitation_record.role, invitation_record.school_id);
            
            -- Create specific role profile based on role type
            IF invitation_record.role = 'teacher' THEN
                INSERT INTO public.teachers (school_id, auth_user_id, full_name, email)
                VALUES (
                    invitation_record.school_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                    NEW.email
                );
            ELSIF invitation_record.role = 'student' THEN
                INSERT INTO public.students (school_id, auth_user_id, full_name, student_id_display, grade_level, date_of_birth, guardian_contact, guardian_name)
                VALUES (
                    invitation_record.school_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                    'STU-' || LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM students)::text, 6, '0'),
                    COALESCE(NEW.raw_user_meta_data->>'grade_level', 'Unassigned'),
                    COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::date, CURRENT_DATE),
                    COALESCE(NEW.raw_user_meta_data->>'guardian_contact', 'N/A'),
                    COALESCE(NEW.raw_user_meta_data->>'guardian_name', 'N/A')
                );
            ELSIF invitation_record.role = 'admin' THEN
                INSERT INTO public.admins (school_id, auth_user_id, name, email)
                VALUES (
                    invitation_record.school_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                    NEW.email
                );
            ELSIF invitation_record.role = 'accountant' THEN
                INSERT INTO public.accountants (school_id, auth_user_id, name, email)
                VALUES (
                    invitation_record.school_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                    NEW.email
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic role assignment
CREATE TRIGGER trigger_auto_accept_invitation_on_confirm
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_accept_invitation_on_confirm();

-- =========================
-- Invitation Management Functions
-- =========================

-- Function to create invitation with validation
CREATE OR REPLACE FUNCTION create_user_invitation(
    p_email text,
    p_role text,
    p_school_id bigint,
    p_invited_by uuid DEFAULT auth.uid()
)
RETURNS uuid AS $$
DECLARE
    invitation_id uuid;
    inviter_role text;
    inviter_school_id bigint;
BEGIN
    -- Get inviter's role and school
    SELECT role, school_id INTO inviter_role, inviter_school_id
    FROM public.user_roles
    WHERE user_id = p_invited_by;
    
    -- Validate permissions
    IF inviter_role = 'super_admin' THEN
        -- Super admin can invite anyone to any school
        NULL;
    ELSIF inviter_role = 'admin' AND inviter_school_id = p_school_id THEN
        -- School admin can invite to their own school (except super_admin)
        IF p_role = 'super_admin' THEN
            RAISE EXCEPTION 'School admins cannot create super_admin invitations';
        END IF;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions to create invitation';
    END IF;
    
    -- Check if user already exists with this email
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;
    
    -- Check if pending invitation already exists
    IF EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE LOWER(email) = LOWER(p_email) 
        AND status = 'pending' 
        AND expires_at > now()
        AND school_id = p_school_id
    ) THEN
        RAISE EXCEPTION 'Pending invitation already exists for this email and school';
    END IF;
    
    -- Create invitation
    INSERT INTO public.user_invitations (email, role, school_id, invited_by)
    VALUES (p_email, p_role, p_school_id, p_invited_by)
    RETURNING id INTO invitation_id;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.user_invitations
    WHERE status = 'pending' AND expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- Enhanced Admin Registration System
-- Handles automatic profile creation when users accept invitations
-- =========================

-- Enhanced auto-registration function with better error handling
CREATE OR REPLACE FUNCTION enhanced_auto_accept_invitation()
RETURNS TRIGGER AS $$
DECLARE
    invitation_record public.user_invitations%ROWTYPE;
    error_msg text;
BEGIN
    BEGIN
        -- Handle email confirmation trigger (UPDATE only)
        IF TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
            
            -- Find pending invitation for this email
            SELECT * INTO invitation_record
            FROM public.user_invitations
            WHERE LOWER(email) = LOWER(NEW.email)
            AND status = 'pending'
            AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1;
            
            IF invitation_record.id IS NOT NULL THEN
                -- Update invitation status
                UPDATE public.user_invitations
                SET 
                    user_id = NEW.id,
                    status = 'accepted',
                    updated_at = now()
                WHERE id = invitation_record.id;
                
                -- Create user role if not exists
                IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
                    INSERT INTO public.user_roles (user_id, role, school_id)
                    VALUES (NEW.id, invitation_record.role, invitation_record.school_id);
                END IF;
                
                -- Create profile based on role
                IF invitation_record.role = 'admin' AND NOT EXISTS(SELECT 1 FROM public.admins WHERE auth_user_id = NEW.id) THEN
                    INSERT INTO public.admins (school_id, auth_user_id, name, email)
                    VALUES (
                        invitation_record.school_id, 
                        NEW.id, 
                        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                        NEW.email
                    );
                ELSIF invitation_record.role = 'teacher' AND NOT EXISTS(SELECT 1 FROM public.teachers WHERE auth_user_id = NEW.id) THEN
                    INSERT INTO public.teachers (school_id, auth_user_id, full_name, email)
                    VALUES (
                        invitation_record.school_id, 
                        NEW.id, 
                        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                        NEW.email
                    );
                ELSIF invitation_record.role = 'student' AND NOT EXISTS(SELECT 1 FROM public.students WHERE auth_user_id = NEW.id) THEN
                    INSERT INTO public.students (school_id, auth_user_id, full_name, student_id_display, grade_level, date_of_birth, guardian_contact, guardian_name)
                    VALUES (
                        invitation_record.school_id, 
                        NEW.id, 
                        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                        'STU-' || LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM students)::text, 6, '0'),
                        COALESCE(NEW.raw_user_meta_data->>'grade_level', 'Unassigned'),
                        COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::date, CURRENT_DATE),
                        COALESCE(NEW.raw_user_meta_data->>'guardian_contact', 'N/A'),
                        COALESCE(NEW.raw_user_meta_data->>'guardian_name', 'N/A')
                    );
                ELSIF invitation_record.role = 'accountant' AND NOT EXISTS(SELECT 1 FROM public.accountants WHERE auth_user_id = NEW.id) THEN
                    INSERT INTO public.accountants (school_id, auth_user_id, name, email)
                    VALUES (
                        invitation_record.school_id, 
                        NEW.id, 
                        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                        NEW.email
                    );
                END IF;
            END IF;
        END IF;

        -- Handle direct insert (for cases where email is already confirmed)
        IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL THEN
            
            -- Find pending invitation for this email
            SELECT * INTO invitation_record
            FROM public.user_invitations
            WHERE LOWER(email) = LOWER(NEW.email)
            AND status = 'pending'
            AND expires_at > now()
            ORDER BY created_at DESC
            LIMIT 1;
            
            IF invitation_record.id IS NOT NULL THEN
                -- Update invitation status
                UPDATE public.user_invitations
                SET 
                    user_id = NEW.id,
                    status = 'accepted',
                    updated_at = now()
                WHERE id = invitation_record.id;
                
                -- Create user role
                INSERT INTO public.user_roles (user_id, role, school_id)
                VALUES (NEW.id, invitation_record.role, invitation_record.school_id)
                ON CONFLICT DO NOTHING;
                
                -- Create profile
                IF invitation_record.role = 'admin' THEN
                    INSERT INTO public.admins (school_id, auth_user_id, name, email)
                    VALUES (
                        invitation_record.school_id, 
                        NEW.id, 
                        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                        NEW.email
                    );
                END IF;
            END IF;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        error_msg := SQLERRM;
        INSERT INTO public.audit_logs (action, details, performed_by, created_at)
        VALUES (
            'invitation_trigger_error', 
            jsonb_build_object('error', error_msg, 'user_email', NEW.email),
            NEW.id,
            now()
        );
    END;
    
    -- Return appropriate record based on trigger operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual admin profile creation function (for debugging)
CREATE OR REPLACE FUNCTION manual_create_admin_profile(user_uuid uuid, user_email text)
RETURNS text AS $$
DECLARE
    invitation_record public.user_invitations%ROWTYPE;
    result_msg text;
BEGIN
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM public.user_invitations
    WHERE LOWER(email) = LOWER(user_email)
    AND role = 'admin'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF invitation_record.id IS NOT NULL THEN
        -- Create user role if missing
        INSERT INTO public.user_roles (user_id, role, school_id)
        VALUES (user_uuid, 'admin', invitation_record.school_id)
        ON CONFLICT DO NOTHING;
        
        -- Create admin profile if missing
        INSERT INTO public.admins (school_id, auth_user_id, name, email)
        VALUES (
            invitation_record.school_id,
            user_uuid,
            user_email,
            user_email
        )
        ON CONFLICT DO NOTHING;
        
        result_msg := 'Admin profile created successfully';
    ELSE
        result_msg := 'No admin invitation found for email: ' || user_email;
    END IF;
    
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_auto_accept_invitation_on_confirm ON auth.users;
DROP TRIGGER IF EXISTS trigger_enhanced_auto_accept_invitation_update ON auth.users;
DROP TRIGGER IF EXISTS trigger_enhanced_auto_accept_invitation_insert ON auth.users;

-- Create new triggers
CREATE TRIGGER trigger_enhanced_auto_accept_invitation_update
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_accept_invitation();

CREATE TRIGGER trigger_enhanced_auto_accept_invitation_insert
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_accept_invitation();

COMMIT;
