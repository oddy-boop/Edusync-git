-- =========================
-- Audit Logs INSERT Policies Migration
-- Allows different user roles to create audit logs for their actions
-- =========================

BEGIN;

-- =========================
-- Audit Logs: INSERT Policies for User Roles
-- =========================

-- Super Admins: Can create audit logs for any action across all schools
CREATE POLICY "Super admins can create audit logs" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (
        performed_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Admins: Can create audit logs for their school
CREATE POLICY "Admins can create audit logs for their school" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (
        performed_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Teachers: Can create audit logs for their school (academic activities)
CREATE POLICY "Teachers can create academic audit logs" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (
        performed_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
        AND (
            table_name IN ('student_results', 'attendance_records', 'behavior_incidents', 'assignments')
            OR action LIKE '%academic%'
            OR action LIKE '%attendance%'
            OR action LIKE '%behavior%'
        )
    );

-- Students: Can create limited audit logs for their own actions
CREATE POLICY "Students can create limited audit logs" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (
        performed_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND action IN ('user_login', 'user_logout', 'password_changed', 'profile_updated')
    );

-- Service Role: Can create audit logs for system operations
CREATE POLICY "Service role can create audit logs" ON public.audit_logs
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

COMMIT;
