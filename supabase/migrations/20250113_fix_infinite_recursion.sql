-- =========================
-- Fix Infinite Recursion in RLS Policies
-- Replaces direct user_roles queries with helper functions
-- =========================

BEGIN;

-- =========================
-- Drop all policies that cause circular dependency
-- =========================

-- Drop super admin policies that query user_roles directly
DROP POLICY IF EXISTS "Super admins can manage all schools" ON public.schools;
DROP POLICY IF EXISTS "Super admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all teachers" ON public.teachers;
DROP POLICY IF EXISTS "Super admins can manage all students" ON public.students;
DROP POLICY IF EXISTS "Super admins can manage all fee payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Super admins can manage all academic results" ON public.academic_results;
DROP POLICY IF EXISTS "Super admins can manage all announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "Super admins can manage all news posts" ON public.news_posts;
DROP POLICY IF EXISTS "Super admins can manage all admission applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Super admins can manage all contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Super admins can manage all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can manage all platform pricing" ON public.platform_pricing;

-- Drop admin policies that query user_roles directly
DROP POLICY IF EXISTS "Admins can manage their own school settings" ON public.schools;
DROP POLICY IF EXISTS "Admins can manage user roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage teachers in their school" ON public.teachers;
DROP POLICY IF EXISTS "Admins can view students in their school" ON public.students;

-- Drop teacher policies that query user_roles directly  
DROP POLICY IF EXISTS "Teachers can view their own role" ON public.user_roles;

-- Drop student policies that query user_roles directly
DROP POLICY IF EXISTS "Students can view their own role" ON public.user_roles;

-- Drop accountant policies that query user_roles directly
DROP POLICY IF EXISTS "Accountants can view their own role" ON public.user_roles;

-- =========================
-- Recreate policies using helper functions (no circular dependency)
-- =========================

-- Super Admin Policies - using get_my_role() instead of direct user_roles queries
CREATE POLICY "Super admins can manage all schools" ON public.schools
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all user roles" ON public.user_roles
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all teachers" ON public.teachers
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all students" ON public.students
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all fee payments" ON public.fee_payments
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all academic results" ON public.academic_results
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all announcements" ON public.school_announcements
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all news posts" ON public.news_posts
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all admission applications" ON public.admission_applications
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all contact messages" ON public.contact_messages
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all audit logs" ON public.audit_logs
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Super admins can manage all platform pricing" ON public.platform_pricing
    FOR ALL 
    USING (get_my_role() = 'super_admin')
    WITH CHECK (get_my_role() = 'super_admin');

-- Admin Policies - using helper functions
CREATE POLICY "Admins can manage their own school settings" ON public.schools
    FOR ALL 
    USING (
        get_my_role() = 'admin' 
        AND id = get_my_school_id()
    )
    WITH CHECK (
        get_my_role() = 'admin' 
        AND id = get_my_school_id()
    );

CREATE POLICY "Admins can manage user roles in their school" ON public.user_roles
    FOR ALL 
    USING (
        get_my_role() = 'admin' 
        AND school_id = get_my_school_id()
    )
    WITH CHECK (
        get_my_role() = 'admin' 
        AND school_id = get_my_school_id()
    );

CREATE POLICY "Admins can manage teachers in their school" ON public.teachers
    FOR ALL 
    USING (
        get_my_role() = 'admin' 
        AND school_id = get_my_school_id()
    )
    WITH CHECK (
        get_my_role() = 'admin' 
        AND school_id = get_my_school_id()
    );

CREATE POLICY "Admins can view students in their school" ON public.students
    FOR SELECT 
    USING (
        get_my_role() = 'admin' 
        AND school_id = get_my_school_id()
    );

-- Role-specific policies - simplified using helper functions
CREATE POLICY "Teachers can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND get_my_role() = 'teacher'
    );

CREATE POLICY "Students can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND get_my_role() = 'student'
    );

CREATE POLICY "Accountants can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND get_my_role() = 'accountant'
    );

COMMIT;
