-- Fix RLS policies for stude-- CRITICAL: Allow authenticated users to view schools they have access to
-- This allows admins to view their associated school data
DROP POLICY IF EXISTS "Users can view their associated school" ON public.schools;
CREATE POLICY "Users can view their associated school" ON public.schools FOR SELECT USING (
  id IN (
    SELECT school_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Allow admins to update their associated school
DROP POLICY IF EXISTS "Admins can update their school" ON public.schools;
CREATE POLICY "Admins can update their school" ON public.schools FOR UPDATE USING (
  id IN (
    SELECT school_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Also allow public access to schools for unauthenticated users (homepage, etc.)
DROP POLICY IF EXISTS "Allow public access to schools" ON public.schools;
CREATE POLICY "Allow public access to schools" ON public.schools FOR SELECT USING (true);sues

-- Add missing policy for students to view timetable for their class
CREATE POLICY "Students can view timetable for their class" ON public.timetable_entries FOR SELECT USING (class_id = (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid()));

-- Fix academic results policy - academic_results table doesn't have auth_user_id field
-- Instead, we need to match via student_id_display
DROP POLICY IF EXISTS "Students can view their own results" ON public.academic_results;
CREATE POLICY "Students can view their own results" ON public.academic_results FOR SELECT USING (
    student_id_display = (SELECT students.student_id_display FROM public.students WHERE students.auth_user_id = auth.uid())
    AND approval_status = 'approved'
);

-- Ensure attendance policy is working correctly
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT USING (
    student_id_display = (SELECT students.student_id_display FROM public.students WHERE students.auth_user_id = auth.uid())
);

-- CRITICAL: Allow unauthenticated access to students table for login lookup
-- This allows the login form to look up student_id_display and contact_email for authentication
DROP POLICY IF EXISTS "Allow login lookup for students" ON public.students;
CREATE POLICY "Allow login lookup for students" ON public.students FOR SELECT USING (true);

-- CRITICAL: Allow authenticated users to view their own user role
-- This is needed for the auth context and API calls after login
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- CRITICAL: Allow authenticated users to view schools they have access to
-- This allows admins to view their associated school data
DROP POLICY IF EXISTS "Users can view their associated school" ON public.schools;
CREATE POLICY "Users can view their associated school" ON public.schools FOR SELECT USING (
  id IN (
    SELECT school_id FROM user_roles WHERE user_id = auth.uid()
  )
);

-- Also allow public access to schools for unauthenticated users (homepage, etc.)
DROP POLICY IF EXISTS "Allow public access to schools" ON public.schools;
CREATE POLICY "Allow public access to schools" ON public.schools FOR SELECT USING (true);
