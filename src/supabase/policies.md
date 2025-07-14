
-- ================================================================================================
-- EduSync Single-Tenant - Definitive Schema & RLS Policy v8.0
-- Description: This script reverts the database to a single-school model.
--              It removes the `schools` table and `school_id` from all other tables.
--              All policies are simplified for a single-school architecture.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor. THIS WILL MODIFY YOUR SCHEMA.
--               It is recommended to back up your data before running.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Drop multi-tenant policies and helper functions first
-- ================================================================================================

-- Drop all policies that might depend on the functions
DROP POLICY IF EXISTS "Super admins can manage schools" ON public.schools;
DROP POLICY IF EXISTS "Public can read school info by domain" ON public.schools;
DROP POLICY IF EXISTS "Super admins can manage all settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage their own school settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "School members can access students in their school" ON public.students;
DROP POLICY IF EXISTS "School members can access teachers in their school" ON public.teachers;
DROP POLICY IF EXISTS "School members can access announcements in their school" ON public.school_announcements;
DROP POLICY IF EXISTS "School members can access fee items in their school" ON public.school_fee_items;
DROP POLICY IF EXISTS "School members can access payments in their school" ON public.fee_payments;
DROP POLICY IF EXISTS "School members can access arrears in their school" ON public.student_arrears;
DROP POLICY IF EXISTS "School members can access results in their school" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own approved results" ON public.academic_results;
DROP POLICY IF EXISTS "School members can access attendance in their school" ON public.attendance_records;
DROP POLICY IF EXISTS "School members can access incidents in their school" ON public.behavior_incidents;
DROP POLICY IF EXISTS "School members can access assignments in their school" ON public.assignments;
DROP POLICY IF EXISTS "School members can access timetables in their school" ON public.timetable_entries;
DROP POLICY IF EXISTS "Public can read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage their school's assets" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage all school assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can manage their school's assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage all assignment files" ON storage.objects;

-- Now it's safe to drop the functions
DROP FUNCTION IF EXISTS get_my_school_id();
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS is_school_admin();
DROP FUNCTION IF EXISTS get_first_school_id();


-- ================================================================================================
-- Section 2: Remove `school_id` from tables and drop the `schools` table
-- ================================================================================================

ALTER TABLE public.app_settings DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.students DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.teachers DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.school_announcements DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.school_fee_items DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.fee_payments DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.student_arrears DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.academic_results DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.behavior_incidents DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.assignments DROP COLUMN IF EXISTS school_id;
ALTER TABLE public.timetable_entries DROP COLUMN IF EXISTS school_id;

DROP TABLE IF EXISTS public.schools;


-- ================================================================================================
-- Section 3: Simplify `app_settings` and `user_roles`
-- ================================================================================================

-- Restore app_settings primary key to just 'id'
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (id);

-- Remove homepage and public page content from app_settings
ALTER TABLE public.app_settings
    DROP COLUMN IF EXISTS school_slogan,
    DROP COLUMN IF EXISTS homepage_hero_slides,
    DROP COLUMN IF EXISTS about_history_image_url,
    DROP COLUMN IF EXISTS about_leader1_image_url,
    DROP COLUMN IF EXISTS about_leader2_image_url,
    DROP COLUMN IF EXISTS about_leader3_image_url,
    DROP COLUMN IF EXISTS admissions_form_url,
    DROP COLUMN IF EXISTS about_history_mission,
    DROP COLUMN IF EXISTS about_vision,
    DROP COLUMN IF EXISTS about_core_values,
    DROP COLUMN IF EXISTS admissions_step1_desc,
    DROP COLUMN IF EXISTS admissions_step2_desc,
    DROP COLUMN IF EXISTS admissions_step3_desc,
    DROP COLUMN IF EXISTS admissions_step4_desc,
    DROP COLUMN IF EXISTS admissions_tuition_info,
    DROP COLUMN IF EXISTS program_creche_desc,
    DROP COLUMN IF EXISTS program_kindergarten_desc,
    DROP COLUMN IF EXISTS program_primary_desc,
    DROP COLUMN IF EXISTS program_jhs_desc,
    DROP COLUMN IF EXISTS program_extracurricular_desc,
    DROP COLUMN IF EXISTS program_science_tech_desc,
    DROP COLUMN IF EXISTS about_leader1_name,
    DROP COLUMN IF EXISTS about_leader1_title,
    DROP COLUMN IF EXISTS about_leader2_name,
    DROP COLUMN IF EXISTS about_leader2_title,
    DROP COLUMN IF EXISTS about_leader3_name,
    DROP COLUMN IF EXISTS about_leader3_title,
    DROP COLUMN IF EXISTS facility1_name,
    DROP COLUMN IF EXISTS facility1_image_url,
    DROP COLUMN IF EXISTS facility2_name,
    DROP COLUMN IF EXISTS facility2_image_url,
    DROP COLUMN IF EXISTS facility3_name,
    DROP COLUMN IF EXISTS facility3_image_url,
    DROP COLUMN IF EXISTS program_creche_image_url,
    DROP COLUMN IF EXISTS program_kindergarten_image_url,
    DROP COLUMN IF EXISTS program_primary_image_url,
    DROP COLUMN IF EXISTS program_jhs_image_url,
    DROP COLUMN IF EXISTS program_extracurricular_image_url,
    DROP COLUMN IF EXISTS program_science_tech_image_url;

-- Simplify role check, removing 'super_admin'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_check' AND contype = 'c'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
    END IF;
END;
$$;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
  (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text]))
);


-- ================================================================================================
-- Section 4: Recreate RLS Policies for a Single-School environment
-- ================================================================================================

-- Helper function to check for admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Enable RLS on all tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Policies for app_settings
CREATE POLICY "Admins can manage school settings" ON public.app_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public can read settings" ON public.app_settings FOR SELECT USING (true);

-- Policies for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policies for students table
CREATE POLICY "Authenticated users can read student data" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins can manage students" ON public.students FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Policies for teachers table
CREATE POLICY "Authenticated users can read teacher data" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Policies for school_announcements table
CREATE POLICY "Authenticated can read announcements" ON public.school_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage announcements" ON public.school_announcements FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Policies for school_fee_items table
CREATE POLICY "Authenticated can read fee items" ON public.school_fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fee items" ON public.school_fee_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Policies for fee_payments table
CREATE POLICY "Users can see their own payments, admins see all" ON public.fee_payments FOR SELECT USING (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.students WHERE student_id_display = fee_payments.student_id_display LIMIT 1));
CREATE POLICY "Admins and service roles can create payments" ON public.fee_payments FOR INSERT TO authenticated, service_role WITH CHECK (is_admin() OR auth.uid() = received_by_user_id);
CREATE POLICY "Admins can manage payments" ON public.fee_payments FOR UPDATE, DELETE USING (is_admin());

-- Policies for student_arrears table
CREATE POLICY "Admins can manage arrears" ON public.student_arrears FOR ALL USING (is_admin());

-- Policies for academic_results table
CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM public.students WHERE student_id_display = academic_results.student_id_display LIMIT 1) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Admins and teachers can manage results" ON public.academic_results FOR ALL USING (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = academic_results.teacher_id LIMIT 1)) WITH CHECK (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = academic_results.teacher_id LIMIT 1));

-- Policies for attendance_records table
CREATE POLICY "Authenticated can read attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Admins and teachers manage attendance" ON public.attendance_records FOR ALL USING (is_admin() OR auth.uid() = marked_by_teacher_auth_id) WITH CHECK (is_admin() OR auth.uid() = marked_by_teacher_auth_id);

-- Policies for behavior_incidents table
CREATE POLICY "Admins and teachers manage behavior incidents" ON public.behavior_incidents FOR ALL USING (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = behavior_incidents.teacher_id LIMIT 1)) WITH CHECK (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = behavior_incidents.teacher_id LIMIT 1));

-- Policies for assignments table
CREATE POLICY "Authenticated users can read assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage assignments" ON public.assignments FOR ALL USING (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = assignments.teacher_id LIMIT 1)) WITH CHECK (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = assignments.teacher_id LIMIT 1));

-- Policies for timetable_entries table
CREATE POLICY "Authenticated users can read timetables" ON public.timetable_entries FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage timetables" ON public.timetable_entries FOR ALL USING (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = timetable_entries.teacher_id LIMIT 1)) WITH CHECK (is_admin() OR auth.uid() = (SELECT auth_user_id FROM public.teachers WHERE id = timetable_entries.teacher_id LIMIT 1));


-- ================================================================================================
-- Section 5: Storage Policies (Single-Tenant)
-- ================================================================================================

-- Policies for 'school-assets' bucket (logos)
CREATE POLICY "Public can read school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admins can manage school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND is_admin()) WITH CHECK (bucket_id = 'school-assets' AND is_admin());

-- Policies for 'assignment-files' bucket
CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Teachers can manage their own assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND auth.uid() = owner);
CREATE POLICY "Admins can manage assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND is_admin());

-- ========================== END OF SCRIPT ==========================

  