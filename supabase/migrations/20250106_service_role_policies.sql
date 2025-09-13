-- =========================
-- Service Role Policies Migration
-- Enables service role for AI assistant and system automation
-- Read access to all data for AI processing and system operations
-- =========================

BEGIN;

-- =========================
-- Service Role: AI Assistant Data Access
-- =========================

-- Schools: Service role can read all schools for AI assistant
CREATE POLICY "Service role can read schools for AI assistant" ON public.schools
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Students: Service role can read students for AI assistant
CREATE POLICY "Service role can read students for AI assistant" ON public.students
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Teachers: Service role can read teachers for AI assistant
CREATE POLICY "Service role can read teachers for AI assistant" ON public.teachers
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Admins: Service role can read admins for AI assistant
CREATE POLICY "Service role can read admins for AI assistant" ON public.admins
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Accountants: Service role can read accountants for AI assistant
CREATE POLICY "Service role can read accountants for AI assistant" ON public.accountants
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- User Roles: Service role can read user roles for AI assistant
CREATE POLICY "Service role can read user roles for AI assistant" ON public.user_roles
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- =========================
-- Service Role: Academic Data Access
-- =========================

-- Student Results: Service role can read student results for AI assistant
CREATE POLICY "Service role can read student results for AI assistant" ON public.student_results
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Attendance Records: Service role can read attendance for AI assistant
CREATE POLICY "Service role can read attendance records for AI assistant" ON public.attendance_records
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Staff Attendance: Service role can read staff attendance for AI assistant
CREATE POLICY "Service role can read staff attendance for AI assistant" ON public.staff_attendance
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Behavior Incidents: Service role can read behavior incidents for AI assistant
CREATE POLICY "Service role can read behavior incidents for AI assistant" ON public.behavior_incidents
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Assignments: Service role can read assignments for AI assistant
CREATE POLICY "Service role can read assignments for AI assistant" ON public.assignments
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Timetable Entries: Service role can read timetable for AI assistant
CREATE POLICY "Service role can read timetable entries for AI assistant" ON public.timetable_entries
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- =========================
-- Service Role: Financial Data Access
-- =========================

-- Platform Pricing: Service role can manage platform pricing
CREATE POLICY "Service role can manage platform pricing" ON public.platform_pricing
    FOR ALL 
    USING (auth.role() = 'service_role');

-- School Fees: Service role can manage school fees
CREATE POLICY "Service role can manage school fees" ON public.school_fees
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Fee Payments: Service role can read and insert fee payments for AI assistant
CREATE POLICY "Service role can manage fee payments for AI assistant" ON public.fee_payments
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Student Arrears: Service role can read student arrears for AI assistant
CREATE POLICY "Service role can read student arrears for AI assistant" ON public.student_arrears
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- School Fee Items: Service role can read fee items for AI assistant
CREATE POLICY "Service role can read school fee items for AI assistant" ON public.school_fee_items
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Expenditures: Service role can read expenditures for AI assistant
CREATE POLICY "Service role can read expenditures for AI assistant" ON public.expenditures
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Budget Categories: Service role can read budget categories for AI assistant
CREATE POLICY "Service role can read budget categories for AI assistant" ON public.budget_categories
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Payment Transactions: Service role can manage payment transactions
CREATE POLICY "Service role can manage payment transactions" ON public.payment_transactions
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Platform Revenue: Service role can manage platform revenue
CREATE POLICY "Service role can manage platform revenue" ON public.platform_revenue
    FOR ALL 
    USING (auth.role() = 'service_role');

-- School Payment Configs: Service role can manage payment configs
CREATE POLICY "Service role can manage payment configs" ON public.school_payment_configs
    FOR ALL 
    USING (auth.role() = 'service_role');

-- =========================
-- Service Role: Communication Data Access
-- =========================

-- School Announcements: Service role can manage announcements for AI assistant
CREATE POLICY "Service role can manage school announcements for AI assistant" ON public.school_announcements
    FOR ALL 
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

-- News Posts: Service role can read news posts for AI assistant
CREATE POLICY "Service role can read news posts for AI assistant" ON public.news_posts
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- Admission Applications: Service role can read admission applications for AI assistant
CREATE POLICY "Service role can read admission applications for AI assistant" ON public.admission_applications
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- =========================
-- Service Role: System Management
-- =========================

-- Assistant Logs: Service role can manage all assistant logs
CREATE POLICY "Service role can manage assistant logs" ON public.assistant_logs
    FOR ALL 
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

-- Audit Logs: Service role can read audit logs for system monitoring
CREATE POLICY "Service role can read audit logs for AI assistant" ON public.audit_logs
    FOR SELECT 
    USING (current_setting('role') = 'service_role');

-- User Invitations: Service role can manage invitations for automation
CREATE POLICY "Service role can manage user invitations" ON public.user_invitations
    FOR ALL 
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

-- =========================
-- Service Role: Automation Functions
-- =========================

-- Create function for service role to bypass RLS when needed
CREATE OR REPLACE FUNCTION service_role_bypass_rls() RETURNS boolean AS $$
BEGIN
    RETURN current_setting('role') = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is service role
CREATE OR REPLACE FUNCTION is_service_role() RETURNS boolean AS $$
BEGIN
    RETURN auth.role() = 'service_role' OR current_setting('role') = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- Service Role: Special Operations
-- =========================

-- Allow service role to perform system maintenance operations
-- This includes data migration, cleanup, and automated tasks

-- Platform-wide operations for service role
CREATE POLICY "Service role platform operations" ON public.schools
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Grant service role ability to manage user roles for automation
CREATE POLICY "Service role can manage user roles for automation" ON public.user_roles
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMIT;
