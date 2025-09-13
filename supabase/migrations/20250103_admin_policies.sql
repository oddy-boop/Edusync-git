-- =========================
-- School Admin Policies Migration
-- Enables admin role with school-scoped management access
-- School data, users, fees, academic records within their school boundary
-- =========================

BEGIN;

-- =========================
-- Admin: School-Scoped Management
-- =========================

-- Teachers: Admins can manage their school's teachers
CREATE POLICY "Admins can manage their school's teachers" ON public.teachers
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Students: Admins can manage their school's students  
CREATE POLICY "Admins can manage their school's students" ON public.students
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Admins: Admins can manage other admins in their school
CREATE POLICY "Admins can manage their school's admins" ON public.admins
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Accountants: Admins can manage their school's accountants
CREATE POLICY "Admins can manage their school's accountants" ON public.accountants
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- =========================
-- Admin: School Settings Management  
-- =========================

-- Schools: Admins can manage their own school's settings
CREATE POLICY "Admins can manage their own school settings" ON public.schools
    FOR ALL 
    USING (get_my_school_id() = id)
    WITH CHECK (get_my_school_id() = id);

-- School Payment Configs: Admins can manage their school's payment config
CREATE POLICY "Admins can manage their school's payment config" ON public.school_payment_configs
    FOR ALL 
    USING (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =========================
-- Admin: Financial Management
-- =========================

-- School Fees: Admins can manage their school's fee structure
CREATE POLICY "Admins can manage their school's fees" ON public.school_fees
    FOR ALL 
    USING (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Enable RLS on financial tables
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- School Fee Items: Admins can manage their school's fee items
CREATE POLICY "Admins can manage their school's fee items" ON public.school_fee_items
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Fee Payments: Admins can manage their school's payments
CREATE POLICY "Admins can manage their school's fee payments" ON public.fee_payments
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Student Arrears: Admins can manage their school's student arrears
CREATE POLICY "Admins can manage their school's student arrears" ON public.student_arrears
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Expenditures: Admins can manage their school's expenditures
CREATE POLICY "Admins can manage their school's expenditures" ON public.expenditures
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Budget Categories: Admins can manage their school's budget categories
CREATE POLICY "Admins can manage their school's budget categories" ON public.budget_categories
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Payment Transactions: Admins can view their school's payment transactions
CREATE POLICY "Admins can view their school's payment transactions" ON public.payment_transactions
    FOR SELECT 
    USING (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =========================
-- Admin: Academic Management
-- =========================

-- Enable RLS on academic tables
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Student Results: Admins can manage their school's student results
CREATE POLICY "Admins can manage their school's student results" ON public.student_results
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Attendance Records: Admins can manage their school's attendance
CREATE POLICY "Admins can manage their school's attendance records" ON public.attendance_records
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Staff Attendance: Admins can manage their school's staff attendance
CREATE POLICY "Admins can manage their school's staff attendance" ON public.staff_attendance
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Behavior Incidents: Admins can manage their school's behavior incidents
CREATE POLICY "Admins can manage their school's behavior incidents" ON public.behavior_incidents
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Assignments: Admins can manage their school's assignments
CREATE POLICY "Admins can manage their school's assignments" ON public.assignments
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Timetable Entries: Admins can manage their school's timetable
CREATE POLICY "Admins can manage their school's timetable entries" ON public.timetable_entries
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- =========================
-- Admin: Communication Management
-- =========================

-- School Announcements: Admins can manage their school's announcements
CREATE POLICY "Admins can manage their school's announcements" ON public.school_announcements
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- News Posts: Admins can manage their school's news posts
CREATE POLICY "Admins can manage their school's news posts" ON public.news_posts
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Enable RLS on admission applications
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- Admission Applications: Admins can manage their school's admission applications
CREATE POLICY "Admins can manage their school's admission applications" ON public.admission_applications
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- =========================
-- Admin: System Management
-- =========================

-- Audit Logs: Admins can view their school's audit logs
CREATE POLICY "Admins can view their school's audit logs" ON public.audit_logs
    FOR SELECT 
    USING (is_my_school_record(school_id));

-- Assistant Logs: Admins can view their own assistant interactions
CREATE POLICY "Admins can view their own assistant logs" ON public.assistant_logs
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can create assistant logs for themselves
CREATE POLICY "Admins can create their own assistant logs" ON public.assistant_logs
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =========================
-- Admin: User Management
-- =========================

-- User Roles: Admins can view and manage roles within their school
CREATE POLICY "Admins can manage user roles in their school" ON public.user_roles
    FOR ALL 
    USING (
        -- Can manage their own role or roles within their school
        user_id = auth.uid() OR (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid() 
                AND ur.role = 'admin'
                AND ur.school_id = public.user_roles.school_id
            )
        )
    )
    WITH CHECK (
        -- Can create/update their own role or roles within their school  
        user_id = auth.uid() OR (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid() 
                AND ur.role = 'admin'
                AND ur.school_id = public.user_roles.school_id
            )
        )
    );

COMMIT;
