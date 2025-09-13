-- =========================
-- Admin Registration Debug Functions
-- Troubleshooting utilities for admin registration issues
-- =========================

BEGIN;

-- Debug function to check admin registration flow
CREATE OR REPLACE FUNCTION debug_admin_registration(user_email text)
RETURNS TABLE(
    step text,
    status text,
    details jsonb
) AS $$
DECLARE
    auth_user_record auth.users%ROWTYPE;
    invitation_record public.user_invitations%ROWTYPE;
    user_role_record public.user_roles%ROWTYPE;
    admin_record public.admins%ROWTYPE;
BEGIN
    -- Step 1: Check if auth user exists
    SELECT * INTO auth_user_record
    FROM auth.users
    WHERE LOWER(email) = LOWER(user_email);
    
    RETURN QUERY SELECT 
        'auth_user_check'::text,
        CASE WHEN auth_user_record.id IS NOT NULL THEN 'found' ELSE 'not_found' END::text,
        jsonb_build_object(
            'user_id', auth_user_record.id,
            'email', auth_user_record.email,
            'email_confirmed_at', auth_user_record.email_confirmed_at,
            'created_at', auth_user_record.created_at
        );
    
    -- Step 2: Check invitations
    SELECT * INTO invitation_record
    FROM public.user_invitations
    WHERE LOWER(email) = LOWER(user_email)
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN QUERY SELECT 
        'invitation_check'::text,
        CASE WHEN invitation_record.id IS NOT NULL THEN 'found' ELSE 'not_found' END::text,
        jsonb_build_object(
            'id', invitation_record.id,
            'role', invitation_record.role,
            'status', invitation_record.status,
            'school_id', invitation_record.school_id,
            'user_id', invitation_record.user_id,
            'expires_at', invitation_record.expires_at,
            'created_at', invitation_record.created_at
        );
    
    -- Step 3: Check user roles (if auth user exists)
    IF auth_user_record.id IS NOT NULL THEN
        SELECT * INTO user_role_record
        FROM public.user_roles
        WHERE user_id = auth_user_record.id;
        
        RETURN QUERY SELECT 
            'user_role_check'::text,
            CASE WHEN user_role_record.user_id IS NOT NULL THEN 'found' ELSE 'not_found' END::text,
            jsonb_build_object(
                'user_id', user_role_record.user_id,
                'role', user_role_record.role,
                'school_id', user_role_record.school_id,
                'created_at', user_role_record.created_at
            );
    END IF;
    
    -- Step 4: Check admin profile (if auth user exists)
    IF auth_user_record.id IS NOT NULL THEN
        SELECT * INTO admin_record
        FROM public.admins
        WHERE auth_user_id = auth_user_record.id;
        
        RETURN QUERY SELECT 
            'admin_profile_check'::text,
            CASE WHEN admin_record.id IS NOT NULL THEN 'found' ELSE 'not_found' END::text,
            jsonb_build_object(
                'id', admin_record.id,
                'school_id', admin_record.school_id,
                'auth_user_id', admin_record.auth_user_id,
                'name', admin_record.name,
                'email', admin_record.email,
                'created_at', admin_record.created_at
            );
    END IF;
    
    -- Step 5: Check audit logs related to this email
    RETURN QUERY SELECT 
        'audit_logs_check'::text,
        'found'::text,
        jsonb_agg(
            jsonb_build_object(
                'action', al.action,
                'details', al.details,
                'created_at', al.created_at
            )
        )
    FROM public.audit_logs al
    WHERE al.details->>'user_email' = user_email
    OR al.details->>'email' = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify trigger existence and functionality
CREATE OR REPLACE FUNCTION check_admin_triggers()
RETURNS TABLE(
    trigger_name text,
    table_name text,
    function_name text,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_name::text,
        t.event_object_table::text,
        t.action_statement::text,
        'active'::text as status
    FROM information_schema.triggers t
    WHERE t.trigger_name LIKE '%auto_accept_invitation%'
    OR t.trigger_name LIKE '%enhanced_auto_accept%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent auth.users activity
CREATE OR REPLACE FUNCTION get_recent_user_activity(limit_count int DEFAULT 10)
RETURNS TABLE(
    id uuid,
    email text,
    email_confirmed_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::text,
        u.email_confirmed_at,
        u.created_at,
        u.updated_at
    FROM auth.users u
    ORDER BY u.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix missing admin profiles
CREATE OR REPLACE FUNCTION fix_missing_admin_profiles()
RETURNS TABLE(
    user_email text,
    action_taken text,
    success boolean
) AS $$
DECLARE
    invitation_rec public.user_invitations%ROWTYPE;
    auth_user_rec auth.users%ROWTYPE;
    fix_count int := 0;
BEGIN
    -- Find confirmed admin invitations without corresponding admin profiles
    FOR invitation_rec IN 
        SELECT ui.*
        FROM public.user_invitations ui
        JOIN auth.users au ON LOWER(ui.email) = LOWER(au.email)
        WHERE ui.role = 'admin' 
        AND ui.status = 'accepted'
        AND au.email_confirmed_at IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.admins a 
            WHERE a.auth_user_id = au.id
        )
    LOOP
        -- Get the auth user
        SELECT * INTO auth_user_rec
        FROM auth.users
        WHERE LOWER(email) = LOWER(invitation_rec.email);
        
        BEGIN
            -- Create missing user role
            INSERT INTO public.user_roles (user_id, role, school_id)
            VALUES (auth_user_rec.id, 'admin', invitation_rec.school_id)
            ON CONFLICT DO NOTHING;
            
            -- Create missing admin profile
            INSERT INTO public.admins (school_id, auth_user_id, name, email)
            VALUES (
                invitation_rec.school_id,
                auth_user_rec.id,
                COALESCE(auth_user_rec.raw_user_meta_data->>'full_name', auth_user_rec.email),
                auth_user_rec.email
            );
            
            fix_count := fix_count + 1;
            
            RETURN QUERY SELECT 
                invitation_rec.email::text,
                'created_admin_profile'::text,
                true;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                invitation_rec.email::text,
                ('error: ' || SQLERRM)::text,
                false;
        END;
    END LOOP;
    
    -- Return summary if no specific fixes were made
    IF fix_count = 0 THEN
        RETURN QUERY SELECT 
            'no_missing_profiles'::text,
            'all_admin_profiles_exist'::text,
            true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
