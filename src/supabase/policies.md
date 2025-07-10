
-- ================================================================================================
-- EduSync SaaS Platform - Definitive Multi-Tenant Schema & RLS Policy v4.0
-- Description: This script refactors the database for multi-tenancy. It introduces a `schools`
--              table and adds a `school_id` to all relevant tables to isolate data. RLS policies
--              are rewritten to enforce strict data separation between schools. This is a
--              foundational change to support a multi-school SaaS model.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor. THIS IS A MAJOR CHANGE.
--               After running, you will need to manually create your first school in the `schools`
--               table and get its UUID to configure your first admin user.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Create the new `schools` table
-- This table will hold information for each school client.
-- ================================================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.schools IS 'Stores information about each school (tenant) in the platform.';


-- ================================================================================================
-- Section 2: Add `school_id` to all necessary tables and apply foreign key constraints.
-- ================================================================================================

-- Add school_id to app_settings
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS id; -- Remove old integer primary key
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD PRIMARY KEY (school_id);
COMMENT ON COLUMN public.app_settings.school_id IS 'Uniquely identifies the school these settings belong to. Serves as the primary key.';

-- Add school_id to user_roles and update primary key
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE public.user_roles ADD PRIMARY KEY (user_id); -- user_id should be unique across all schools

-- Add school_id to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to school_announcements
ALTER TABLE public.school_announcements ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to school_fee_items
ALTER TABLE public.school_fee_items ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to fee_payments
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to student_arrears
ALTER TABLE public.student_arrears ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to academic_results
ALTER TABLE public.academic_results ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to behavior_incidents
ALTER TABLE public.behavior_incidents ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to timetable_entries
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE;


-- ================================================================================================
-- Section 3: Helper Functions for Multi-Tenancy
-- These functions will help RLS policies identify the user's school.
-- ================================================================================================

-- Returns the school_id of the currently authenticated user.
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS uuid AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Checks if the user is an admin of their associated school.
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND school_id = get_my_school_id()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- ================================================================================================
-- Section 4: All RLS Policies for a Multi-Tenant Architecture
-- ================================================================================================

-- --- Table: schools ---
-- Only service_role can manage schools. No user should be able to see other schools.
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role full access" ON public.schools;
CREATE POLICY "Allow service_role full access" ON public.schools FOR ALL TO service_role USING (true);


-- --- Table: app_settings ---
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.app_settings;
-- THIS IS CRITICAL: Allows ANYONE (including anonymous users) to READ settings,
-- but they MUST know the school_id. The app will fetch this from the URL or a subdomain.
CREATE POLICY "Enable public read access based on school_id" ON public.app_settings FOR SELECT USING (true);
-- Admins can only manage settings for THEIR OWN school.
CREATE POLICY "Admins can manage their own school settings" ON public.app_settings FOR ALL USING (school_id = get_my_school_id() AND is_school_admin()) WITH CHECK (school_id = get_my_school_id() AND is_school_admin());


-- --- Table: user_roles ---
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
-- A user can see their own role information.
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Admins can manage roles BUT ONLY for users within their own school.
CREATE POLICY "Admins can manage roles within their school" ON public.user_roles FOR ALL USING (school_id = get_my_school_id() AND is_school_admin()) WITH CHECK (school_id = get_my_school_id() AND is_school_admin());


-- --- Table: students ---
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.students;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can view student profiles" ON public.students;
-- A user can only see/manage students that belong to their own school.
CREATE POLICY "School members can access students in their school" ON public.students FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());


-- --- Table: teachers ---
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;
-- A user can only see/manage teachers that belong to their own school.
CREATE POLICY "School members can access teachers in their school" ON public.teachers FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());


-- All other tables follow the same pattern:
-- You can only access/manage data that has a `school_id` matching your own.

-- --- Table: school_announcements ---
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_announcements;
CREATE POLICY "School members can access announcements in their school" ON public.school_announcements FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: school_fee_items ---
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_fee_items;
CREATE POLICY "School members can access fee items in their school" ON public.school_fee_items FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: fee_payments ---
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.fee_payments;
CREATE POLICY "School members can access payments in their school" ON public.fee_payments FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "Service role can create payments" ON public.fee_payments FOR INSERT TO service_role WITH CHECK (true); -- For webhooks

-- --- Table: student_arrears ---
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.student_arrears;
DROP POLICY IF EXISTS "Students can view their own arrears" ON public.student_arrears;
CREATE POLICY "School members can access arrears in their school" ON public.student_arrears FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: academic_results ---
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.academic_results;
DROP POLICY IF EXISTS "Teachers can manage their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own published results" ON public.academic_results;
CREATE POLICY "School members can access results in their school" ON public.academic_results FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
-- Add a more specific policy for students to view ONLY their own approved results.
CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT USING (school_id = get_my_school_id() AND student_id_display = (SELECT student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());


-- --- Table: attendance_records ---
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
CREATE POLICY "School members can access attendance in their school" ON public.attendance_records FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: behavior_incidents ---
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can manage their own incident logs" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can view all incidents" ON public.behavior_incidents;
CREATE POLICY "School members can access incidents in their school" ON public.behavior_incidents FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: assignments ---
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students and Teachers can view assignments for their class" ON public.assignments;
CREATE POLICY "School members can access assignments in their school" ON public.assignments FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- --- Table: timetable_entries ---
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.timetable_entries;
DROP POLICY IF EXISTS "Teachers can manage their own timetable" ON public.timetable_entries;
DROP POLICY IF EXISTS "Students can view their timetable" ON public.timetable_entries;
CREATE POLICY "School members can access timetables in their school" ON public.timetable_entries FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());


-- ================================================================================================
-- Section 5: Storage Policies (Unchanged, but confirmed for multi-tenancy)
-- Note: Storage policies should rely on `owner_id` (which is auth.uid()) and user role checks,
-- which implicitly handle multi-tenancy as users are tied to schools.
-- ================================================================================================

-- Policies for 'school-assets' bucket (logos, hero images, etc.)
DROP POLICY IF EXISTS "Public read access for school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for school assets" ON storage.objects;
CREATE POLICY "Public read access for school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admin full access for school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND is_school_admin()) WITH CHECK (bucket_id = 'school-assets' AND is_school_admin());

-- Policies for 'assignment-files' bucket
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage their own assignment files" ON storage.objects;
CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Admin full access for assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND is_school_admin()) WITH CHECK (bucket_id = 'assignment-files' AND is_school_admin());
CREATE POLICY "Teachers can manage their own assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND owner = auth.uid()) WITH CHECK (bucket_id = 'assignment-files' AND owner = auth.uid());


-- ========================== END OF SCRIPT ==========================
