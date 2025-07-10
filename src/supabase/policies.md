-- ================================================================================================
-- EduSync SaaS Platform - Definitive Multi-Tenant Schema & RLS Policy v5.0
-- Description: This script refactors the database for multi-tenancy. It introduces a `schools`
--              table and adds a `school_id` to all relevant tables to isolate data. This version
--              adds the concept of a `super_admin` and a `domain` column for custom domains.
--
--              v5.0 Fix: Adds all missing columns to the `app_settings` table to support the
--                      public-facing website content management system.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Create the `schools` table
-- This table will hold information for each school client.
-- ================================================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.schools IS 'Stores information about each school (tenant) in the platform.';
COMMENT ON COLUMN public.schools.domain IS 'The custom domain associated with the school (e.g., portal.sjm.com)';


-- ================================================================================================
-- Section 2: Update `user_roles` with `super_admin`
-- This adds the 'super_admin' role to the list of allowed roles.
-- ================================================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_role_check'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
    END IF;
END;
$$;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (
  (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text, 'super_admin'::text]))
);


-- ================================================================================================
-- Section 3: Add `school_id` to all necessary tables and apply foreign key constraints.
-- ================================================================================================

-- Add school_id to app_settings
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS school_id UUID UNIQUE;
-- Defer adding FK constraint until after data migration if needed. For new setup, this is fine.
-- ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD PRIMARY KEY (school_id);
COMMENT ON COLUMN public.app_settings.school_id IS 'Uniquely identifies the school these settings belong to.';

-- Add school_id to user_roles and update primary key
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id UUID;
-- ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE public.user_roles ADD PRIMARY KEY (user_id);

-- Add school_id to all other tables
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.school_announcements ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.school_fee_items ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.student_arrears ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.academic_results ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.behavior_incidents ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS school_id UUID;

-- Now add the foreign key constraints after columns are created
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_school_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_school_id_fkey;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- Loop to add FK constraints to remaining tables to avoid repetition
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('students', 'teachers', 'school_announcements', 'school_fee_items', 'fee_payments', 'student_arrears', 'academic_results', 'attendance_records', 'behavior_incidents', 'assignments', 'timetable_entries')
    LOOP
        EXECUTE format('
            ALTER TABLE public.%I
            DROP CONSTRAINT IF EXISTS %I;
        ', t_name, t_name || '_school_id_fkey');

        EXECUTE format('
            ALTER TABLE public.%I
            ADD CONSTRAINT %I FOREIGN KEY (school_id)
            REFERENCES public.schools(id) ON DELETE CASCADE;
        ', t_name, t_name || '_school_id_fkey');
    END LOOP;
END;
$$;

-- ================================================================================================
-- Section 4: Add All Missing Columns to `app_settings` for Website Content Management
-- This is the critical fix for the public-facing pages.
-- ================================================================================================
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS school_address TEXT,
  ADD COLUMN IF NOT EXISTS school_phone TEXT,
  ADD COLUMN IF NOT EXISTS school_email TEXT,
  ADD COLUMN IF NOT EXISTS homepage_hero_slides JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS about_history_mission TEXT,
  ADD COLUMN IF NOT EXISTS about_vision TEXT,
  ADD COLUMN IF NOT EXISTS about_core_values TEXT,
  ADD COLUMN IF NOT EXISTS about_history_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_title TEXT,
  ADD COLUMN IF NOT EXISTS about_leader1_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_title TEXT,
  ADD COLUMN IF NOT EXISTS about_leader2_image_url TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_name TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_title TEXT,
  ADD COLUMN IF NOT EXISTS about_leader3_image_url TEXT,
  ADD COLUMN IF NOT EXISTS facility1_name TEXT,
  ADD COLUMN IF NOT EXISTS facility1_image_url TEXT,
  ADD COLUMN IF NOT EXISTS facility2_name TEXT,
  ADD COLUMN IF NOT EXISTS facility2_image_url TEXT,
  ADD COLUMN IF NOT EXISTS facility3_name TEXT,
  ADD COLUMN IF NOT EXISTS facility3_image_url TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step1_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step2_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step3_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_step4_desc TEXT,
  ADD COLUMN IF NOT EXISTS admissions_tuition_info TEXT,
  ADD COLUMN IF NOT EXISTS admissions_form_url TEXT,
  ADD COLUMN IF NOT EXISTS program_creche_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_creche_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_kindergarten_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_kindergarten_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_primary_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_primary_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_jhs_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_jhs_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_extracurricular_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_extracurricular_image_url TEXT,
  ADD COLUMN IF NOT EXISTS program_science_tech_desc TEXT,
  ADD COLUMN IF NOT EXISTS program_science_tech_image_url TEXT;


-- ================================================================================================
-- Section 5: Helper Functions for Multi-Tenancy
-- These functions will help RLS policies identify the user's role and school.
-- ================================================================================================

-- Returns the school_id of the currently authenticated user.
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS uuid AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Checks if the user is a super_admin.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Checks if the user is an admin of their associated school.
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND school_id IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- ================================================================================================
-- Section 6: All RLS Policies for a Multi-Tenant Architecture
-- ================================================================================================

-- --- Table: schools ---
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins can manage schools" ON public.schools;
DROP POLICY IF EXISTS "Public can read schools" ON public.schools;
CREATE POLICY "Super admins can manage schools" ON public.schools FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Public can read schools" ON public.schools FOR SELECT USING (true);


-- --- Table: app_settings ---
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage school settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read settings" ON public.app_settings;
CREATE POLICY "Public can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage school settings" ON public.app_settings FOR ALL
USING (is_super_admin() OR (school_id = get_my_school_id() AND is_school_admin()))
WITH CHECK (is_super_admin() OR (school_id = get_my_school_id() AND is_school_admin()));


-- --- Table: user_roles ---
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
USING (is_super_admin() OR (school_id = get_my_school_id() AND is_school_admin()))
WITH CHECK (is_super_admin() OR (school_id = get_my_school_id() AND is_school_admin()));


-- --- Table: students ---
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access students in their school" ON public.students;
CREATE POLICY "School members can access students in their school" ON public.students FOR ALL
USING (is_super_admin() OR school_id = get_my_school_id())
WITH CHECK (is_super_admin() OR school_id = get_my_school_id());


-- --- Table: teachers ---
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access teachers in their school" ON public.teachers;
CREATE POLICY "School members can access teachers in their school" ON public.teachers FOR ALL
USING (is_super_admin() OR school_id = get_my_school_id())
WITH CHECK (is_super_admin() OR school_id = get_my_school_id());


-- --- Table: school_announcements ---
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access announcements in their school" ON public.school_announcements;
CREATE POLICY "School members can access announcements in their school" ON public.school_announcements FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: school_fee_items ---
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access fee items in their school" ON public.school_fee_items;
CREATE POLICY "School members can access fee items in their school" ON public.school_fee_items FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: fee_payments ---
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access payments in their school" ON public.fee_payments;
DROP POLICY IF EXISTS "Service role can create payments" ON public.fee_payments;
CREATE POLICY "School members can access payments in their school" ON public.fee_payments FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());
CREATE POLICY "Service role can create payments" ON public.fee_payments FOR INSERT TO service_role WITH CHECK (true);

-- --- Table: student_arrears ---
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access arrears in their school" ON public.student_arrears;
CREATE POLICY "School members can access arrears in their school" ON public.student_arrears FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: academic_results ---
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access results in their school" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own approved results" ON public.academic_results;
CREATE POLICY "School members can access results in their school" ON public.academic_results FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());
CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT USING (school_id = get_my_school_id() AND student_id_display = (SELECT student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());

-- --- Table: attendance_records ---
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access attendance in their school" ON public.attendance_records;
CREATE POLICY "School members can access attendance in their school" ON public.attendance_records FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: behavior_incidents ---
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access incidents in their school" ON public.behavior_incidents;
CREATE POLICY "School members can access incidents in their school" ON public.behavior_incidents FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: assignments ---
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access assignments in their school" ON public.assignments;
CREATE POLICY "School members can access assignments in their school" ON public.assignments FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());

-- --- Table: timetable_entries ---
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members can access timetables in their school" ON public.timetable_entries;
CREATE POLICY "School members can access timetables in their school" ON public.timetable_entries FOR ALL USING (is_super_admin() OR school_id = get_my_school_id()) WITH CHECK (is_super_admin() OR school_id = get_my_school_id());


-- ================================================================================================
-- Section 7: Storage Policies
-- ================================================================================================

-- Policies for 'school-assets' bucket (logos, hero images, etc.)
DROP POLICY IF EXISTS "Public can read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage school assets" ON storage.objects;
CREATE POLICY "Public can read school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admins can manage school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND (is_school_admin() OR is_super_admin())) WITH CHECK (bucket_id = 'school-assets' AND (is_school_admin() OR is_super_admin()));

-- Policies for 'assignment-files' bucket
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage their own assignment files" ON storage.objects;
CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Admins can manage assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND (is_school_admin() OR is_super_admin())) WITH CHECK (bucket_id = 'assignment-files' AND (is_school_admin() OR is_super_admin()));
CREATE POLICY "Teachers can manage their own assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND owner = auth.uid()) WITH CHECK (bucket_id = 'assignment-files' AND owner = auth.uid());


-- ========================== END OF SCRIPT ==========================
