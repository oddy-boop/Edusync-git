
-- ================================================================================================
-- St. Joseph's Montessori - Definitive RLS Policy and Schema Fix Script v3.5
-- Description: This script sets up all required Row Level Security (RLS) policies for the
--              entire application. It ensures that anonymous users can read public website
--              content from app_settings, while securing all other data based on user roles.
--              This version corrects storage policies to allow admins to delete files.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor to apply all rules.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Helper Functions (with Security Hardening)
-- ================================================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.teachers
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ================================================================================================
-- Section 2: Table Schema Corrections (Includes fixes from prior versions)
-- ================================================================================================

-- Alter table columns to their correct types to prevent future errors.
ALTER TABLE public.behavior_incidents
  ALTER COLUMN teacher_id TYPE uuid USING teacher_id::uuid;
ALTER TABLE public.behavior_incidents DROP CONSTRAINT IF EXISTS behavior_incidents_teacher_id_fkey;
ALTER TABLE public.behavior_incidents 
  ADD CONSTRAINT behavior_incidents_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
  
ALTER TABLE public.attendance_records
  ALTER COLUMN marked_by_teacher_auth_id TYPE uuid USING marked_by_teacher_auth_id::uuid;
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_marked_by_teacher_auth_id_fkey;
ALTER TABLE public.attendance_records 
  ADD CONSTRAINT attendance_records_marked_by_teacher_auth_id_fkey 
  FOREIGN KEY (marked_by_teacher_auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add website content columns to app_settings if they don't exist.
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS school_slogan TEXT,
  ADD COLUMN IF NOT EXISTS about_history_mission TEXT,
  ADD COLUMN IF NOT EXISTS about_vision TEXT,
  ADD COLUMN IF NOT EXISTS about_core_values TEXT,
  ADD COLUMN IF NOT EXISTS about_history_image_url TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step1_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step2_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step3_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step4_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_tuition_info TEXT,
  ADD COLUMN IF NOT EXISTS program_creche_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_kindergarten_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_primary_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_jhs_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_extracurricular_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_science_tech_desc TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_title TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_title TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_title TEXT,
  ADD COLUMN IF NOT EXISTS facility1_name TEXT,
  ADD COLUMN IF NOT EXISTS facility1_image_url TEXT,
  ADD COLUMN IF NOT EXISTS facility2_name TEXT,
  ADD COLUMN IF NOT EXISTS facility2_image_url TEXT,
  ADD COLUMN IF NOT EXISTS facility3_name TEXT,
  ADD COLUMN IF NOT EXISTS facility3_image_url TEXT,
  ADD COLUMN IF NOT EXISTS admissions_form_url TEXT,
  ADD COLUMN IF NOT EXISTS program_creche_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_kindergarten_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_primary_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_jhs_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_extracurricular_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_science_tech_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_viewed_by_admin BOOLEAN DEFAULT FALSE;

-- Remove old hero image column and add new JSONB column for slideshow
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS school_hero_image_url;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS homepage_hero_slides JSONB;


-- ================================================================================================
-- Section 3: All RLS Policies (Clean Slate with Recursion Fix)
-- ================================================================================================

-- --- Table: app_settings (Critical for public website) ---
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.app_settings;
-- THIS IS THE KEY POLICY: Allow anonymous visitors to READ the settings for the public website.
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);
-- Allow admins to do everything.
CREATE POLICY "Enable all access for admins" ON public.app_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- --- Table: user_roles (Definitive Non-Recursive Policies) ---
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles; -- Drop old policies

-- Allows any authenticated user to read their own role.
-- This is essential and non-recursive, allowing is_admin() to function.
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allows admins to perform ALL operations on the user_roles table.
-- The is_admin() function can safely be called here because the SELECT
-- operation it performs on this very table is permitted by the policy above.
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- --- Table: school_fee_items ---
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_fee_items;
CREATE POLICY "Enable read access for all users" ON public.school_fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_fee_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- --- Table: school_announcements ---
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_announcements;
CREATE POLICY "Enable read access for all users" ON public.school_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_announcements FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- --- Table: teachers ---
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;
CREATE POLICY "Admins have full access" ON public.teachers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can view their own profile" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Teachers can update their own profile" ON public.teachers FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);


-- --- Table: students ---
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.students;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can view student profiles" ON public.students;
CREATE POLICY "Admins have full access" ON public.students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own profile" ON public.students FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Admins and teachers can view student profiles" ON public.students FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = auth.uid() AND students.grade_level = ANY(t.assigned_classes)));


-- --- Table: fee_payments ---
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.fee_payments;
CREATE POLICY "Service role can manage all payments" ON public.fee_payments FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins have full access to payments" ON public.fee_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = auth.uid() AND s.student_id_display = public.fee_payments.student_id_display));


-- --- Table: student_arrears ---
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.student_arrears;
DROP POLICY IF EXISTS "Students can view their own arrears" ON public.student_arrears;
CREATE POLICY "Admins have full access" ON public.student_arrears FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own arrears" ON public.student_arrears FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));


-- --- Table: assignments ---
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students and Teachers can view assignments for their class" ON public.assignments;
CREATE POLICY "Admins have full access" ON public.assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students and Teachers can view assignments for their class" ON public.assignments FOR SELECT TO authenticated USING (class_id IN (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id = ANY(assigned_classes)));


-- --- Table: behavior_incidents ---
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can manage their own incident logs" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can view all incidents" ON public.behavior_incidents;
CREATE POLICY "Admins have full access" ON public.behavior_incidents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own incident logs" ON public.behavior_incidents FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Teachers can view all incidents" ON public.behavior_incidents FOR SELECT TO authenticated USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'teacher');


-- --- Table: attendance_records ---
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
CREATE POLICY "Admins have full access" ON public.attendance_records FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage attendance for their students" ON public.attendance_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id = ANY(assigned_classes))) WITH CHECK (marked_by_teacher_auth_id = auth.uid());
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));


-- --- Table: academic_results ---
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.academic_results;
DROP POLICY IF EXISTS "Teachers can manage their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own published results" ON public.academic_results;
CREATE POLICY "Admins have full access" ON public.academic_results FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own results" ON public.academic_results FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their own published results" ON public.academic_results FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());


-- --- Table: timetable_entries ---
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.timetable_entries;
DROP POLICY IF EXISTS "Teachers can manage their own timetable" ON public.timetable_entries;
DROP POLICY IF EXISTS "Students can view their timetable" ON public.timetable_entries;
CREATE POLICY "Admins have full access" ON public.timetable_entries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own timetable" ON public.timetable_entries FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their timetable" ON public.timetable_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM jsonb_array_elements(periods) AS period WHERE (period->'classNames') ? (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid())));


-- ================================================================================================
-- Section 4: Storage Policies (Corrected for Admin Deletion)
-- ================================================================================================

-- Drop old policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to manage their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to assignment files" ON storage.objects;

-- Corrected Policies for 'school-assets' bucket (logos, hero images, etc.)
CREATE POLICY "Public read access for school assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admin full access for school assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND (SELECT is_admin()))
  WITH CHECK (bucket_id = 'school-assets' AND (SELECT is_admin()));

-- Policies for 'assignment-files' bucket
CREATE POLICY "Public read access for assignment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Admin full access for assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND (SELECT is_admin()))
  WITH CHECK (bucket_id = 'assignment-files' AND (SELECT is_admin()));
CREATE POLICY "Teachers can manage their own assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND owner_id = auth.uid())
  WITH CHECK (bucket_id = 'assignment-files' AND owner_id = auth.uid());


-- ========================== END OF SCRIPT ==========================
