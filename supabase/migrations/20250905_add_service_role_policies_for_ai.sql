-- Migration: Add service role policies for AI assistant
-- This allows the AI assistant to access data without user authentication

-- Service Role Policies for AI Assistant
-- These policies allow the AI assistant (running as service role) to read data

-- Students table
CREATE POLICY "Service role can read students for AI assistant" ON public.students
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Teachers table  
CREATE POLICY "Service role can read teachers for AI assistant" ON public.teachers
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Fee payments table
CREATE POLICY "Service role can read fee_payments for AI assistant" ON public.fee_payments
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Academic results table
CREATE POLICY "Service role can read academic_results for AI assistant" ON public.academic_results
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- School announcements table
CREATE POLICY "Service role can manage announcements for AI assistant" ON public.school_announcements
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- User roles table
CREATE POLICY "Service role can read user_roles for AI assistant" ON public.user_roles
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Schools table
CREATE POLICY "Service role can read schools for AI assistant" ON public.schools
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Accountants table
CREATE POLICY "Service role can read accountants for AI assistant" ON public.accountants
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Admins table
CREATE POLICY "Service role can read admins for AI assistant" ON public.admins
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Attendance records table
CREATE POLICY "Service role can read attendance_records for AI assistant" ON public.attendance_records
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- Assignments table
CREATE POLICY "Service role can read assignments for AI assistant" ON public.assignments
FOR SELECT 
USING (current_setting('role') = 'service_role');

-- School fee items table
CREATE POLICY "Service role can read school_fee_items for AI assistant" ON public.school_fee_items
FOR SELECT 
USING (current_setting('role') = 'service_role');
