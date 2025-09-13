-- =========================
-- Accountant Policies Migration
-- Enables accountant role with financial management access
-- Financial data, fee management, payment processing within their school
-- =========================

BEGIN;

-- =========================
-- Accountant: Profile Management
-- =========================

-- Accountants: Can view and update their own profile
CREATE POLICY "Accountants can manage their own profile" ON public.accountants
    FOR ALL 
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- User Roles: Accountants can view their own role
CREATE POLICY "Accountants can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND role = 'accountant'
    );

-- =========================
-- Accountant: School Information Access
-- =========================

-- Schools: Accountants can view their own school's information
CREATE POLICY "Accountants can view their own school" ON public.schools
    FOR SELECT 
    USING (
        id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Accountant: Financial Management (Full Access)
-- =========================

-- School Fees: Accountants can manage their school's fee structure
CREATE POLICY "Accountants can manage their school's fees" ON public.school_fees
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- School Fee Items: Accountants can manage their school's fee items
CREATE POLICY "Accountants can manage their school's fee items" ON public.school_fee_items
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Fee Payments: Accountants can manage their school's fee payments
CREATE POLICY "Accountants can manage their school's fee payments" ON public.fee_payments
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Student Arrears: Accountants can manage their school's student arrears
CREATE POLICY "Accountants can manage their school's student arrears" ON public.student_arrears
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Expenditures: Accountants can manage their school's expenditures
CREATE POLICY "Accountants can manage their school's expenditures" ON public.expenditures
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- Budget Categories: Accountants can manage their school's budget categories
CREATE POLICY "Accountants can manage their school's budget categories" ON public.budget_categories
    FOR ALL 
    USING (is_my_school_record(school_id))
    WITH CHECK (is_my_school_record(school_id));

-- =========================
-- Accountant: Payment System Access
-- =========================

-- Payment Transactions: Accountants can view their school's payment transactions
CREATE POLICY "Accountants can view their school's payment transactions" ON public.payment_transactions
    FOR SELECT 
    USING (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    );

-- School Payment Configs: Accountants can manage their school's payment config
CREATE POLICY "Accountants can manage their school's payment config" ON public.school_payment_configs
    FOR ALL 
    USING (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    )
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    );

-- =========================
-- Accountant: Student Information Access
-- =========================

-- Students: Accountants can view students in their school for financial purposes
CREATE POLICY "Accountants can view students in their school" ON public.students
    FOR SELECT 
    USING (is_my_school_record(school_id));

-- Student Results: Accountants can view student results for fee calculation purposes
CREATE POLICY "Accountants can view student results in their school" ON public.student_results
    FOR SELECT 
    USING (is_my_school_record(school_id));

-- =========================
-- Accountant: Administrative Tasks
-- =========================

-- Audit Logs: Accountants can view financial-related audit logs for their school
CREATE POLICY "Accountants can view their school's financial audit logs" ON public.audit_logs
    FOR SELECT 
    USING (
        is_my_school_record(school_id) 
        AND (
            table_name IN ('fee_payments', 'student_arrears', 'expenditures', 'school_fees', 'school_fee_items')
            OR action LIKE '%payment%'
            OR action LIKE '%financial%'
            OR action LIKE '%fee%'
        )
    );

-- Accountants can create audit logs for their financial activities
CREATE POLICY "Accountants can create financial audit logs" ON public.audit_logs
    FOR INSERT 
    WITH CHECK (
        performed_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
        AND table_name IN ('fee_payments', 'student_arrears', 'expenditures', 'school_fees', 'school_fee_items')
    );

-- =========================
-- Accountant: Reporting Access
-- =========================

-- Teachers: Accountants can view basic teacher information for payroll/reporting
CREATE POLICY "Accountants can view teachers in their school" ON public.teachers
    FOR SELECT 
    USING (is_my_school_record(school_id));

-- Staff Attendance: Accountants can view staff attendance for payroll purposes
CREATE POLICY "Accountants can view staff attendance in their school" ON public.staff_attendance
    FOR SELECT 
    USING (is_my_school_record(school_id));

-- =========================
-- Accountant: Communication (Limited)
-- =========================

-- School Announcements: Accountants can view and create financial-related announcements
CREATE POLICY "Accountants can view school announcements" ON public.school_announcements
    FOR SELECT 
    USING (
        school_id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Accountants can create financial announcements
CREATE POLICY "Accountants can create financial announcements" ON public.school_announcements
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() 
        AND school_id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
        AND (
            title ILIKE '%fee%' 
            OR title ILIKE '%payment%' 
            OR title ILIKE '%financial%'
            OR title ILIKE '%arrear%'
            OR title ILIKE '%budget%'
        )
    );

-- Accountants can update their own announcements
CREATE POLICY "Accountants can update their own announcements" ON public.school_announcements
    FOR UPDATE 
    USING (
        created_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.accountants 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Accountant: Platform Information Access
-- =========================

-- Platform Pricing: Accountants can view platform pricing for fee calculations
CREATE POLICY "Accountants can view platform pricing" ON public.platform_pricing
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    );

-- =========================
-- Accountant: System Access
-- =========================

-- Assistant Logs: Accountants can view their own assistant interactions
CREATE POLICY "Accountants can view their own assistant logs" ON public.assistant_logs
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    );

-- Accountants can create assistant logs for themselves
CREATE POLICY "Accountants can create their own assistant logs" ON public.assistant_logs
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'accountant'
        )
    );

COMMIT;
