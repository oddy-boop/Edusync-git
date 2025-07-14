
-- ================================================================================================
-- EduSync SaaS - Definitive Schema & RLS Policy v9.1 (Multi-Tenant)
-- Description: This script transitions the database to a multi-school SaaS model.
--              It introduces a `schools` table and adds `school_id` to all relevant tables.
--              It creates a `super_admin` role and robust RLS policies for data isolation.
--              This version is idempotent, meaning it can be run multiple times safely.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor. THIS WILL MODIFY YOUR SCHEMA.
--               It is recommended to back up your data before running.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Create the `schools` table
-- ================================================================================================
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ,
    paystack_public_key_enc TEXT,
    paystack_secret_key_enc TEXT,
    resend_api_key_enc TEXT,
    google_api_key_enc TEXT
);

-- ================================================================================================
-- Section 2: Ensure a default school exists to prevent migration errors
-- ================================================================================================
INSERT INTO public.schools (id, name, domain)
VALUES ('10000000-0000-0000-0000-000000000001', 'St. Joseph Montessori', 'sjm')
ON CONFLICT (id) DO NOTHING;

-- ================================================================================================
-- Section 3: Add `school_id` to all relevant tables
-- ================================================================================================
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.school_announcements ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.school_fee_items ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_arrears ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.academic_results ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.behavior_incidents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- ================================================================================================
-- Section 4: Helper functions for RLS policies
-- ================================================================================================

-- Function to get the first school's ID (used for migrating existing data)
CREATE OR REPLACE FUNCTION get_first_school_id()
RETURNS UUID AS $$
  SELECT id FROM public.schools ORDER BY created_at LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to get the school_id of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Function to check if the user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- ================================================================================================
-- Section 5: Populate `school_id` for existing data and enforce NOT NULL
-- ================================================================================================
UPDATE public.app_settings SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.user_roles SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.students SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.teachers SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.school_announcements SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.school_fee_items SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.fee_payments SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.student_arrears SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.academic_results SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.attendance_records SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.behavior_incidents SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.assignments SET school_id = get_first_school_id() WHERE school_id IS NULL;
UPDATE public.timetable_entries SET school_id = get_first_school_id() WHERE school_id IS NULL;

-- Now that columns are populated, enforce NOT NULL constraint
ALTER TABLE public.app_settings ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.teachers ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.school_announcements ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.school_fee_items ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.fee_payments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.student_arrears ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.academic_results ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.attendance_records ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.behavior_incidents ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.timetable_entries ALTER COLUMN school_id SET NOT NULL;

-- Update primary key for app_settings to be composite
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (id, school_id);

-- Update user_roles to include super_admin
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
  (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'teacher'::text, 'student'::text]))
);


-- ================================================================================================
-- Section 6: Recreate RLS Policies for Multi-Tenant environment
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
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

-- Drop all old policies to ensure a clean slate
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

-- Create new policies
-- Policies for `schools` table
CREATE POLICY "Super admins can manage schools" ON public.schools FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Public can read school info by domain" ON public.schools FOR SELECT USING (true);

-- Policies for `app_settings`
CREATE POLICY "Super admins can manage all settings" ON public.app_settings FOR ALL USING (is_super_admin());
CREATE POLICY "Admins can manage their own school settings" ON public.app_settings FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "Public can read settings" ON public.app_settings FOR SELECT USING (true);

-- Policies for `user_roles`
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (is_super_admin());
CREATE POLICY "Admins can manage roles in their school" ON public.user_roles FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policies for all other tables
CREATE POLICY "School members can access students in their school" ON public.students FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access teachers in their school" ON public.teachers FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access announcements in their school" ON public.school_announcements FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access fee items in their school" ON public.school_fee_items FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access payments in their school" ON public.fee_payments FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access arrears in their school" ON public.student_arrears FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access results in their school" ON public.academic_results FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT USING (school_id = get_my_school_id() AND auth.uid() = (SELECT auth_user_id FROM public.students s WHERE s.student_id_display = academic_results.student_id_display AND s.school_id = academic_results.school_id LIMIT 1));
CREATE POLICY "School members can access attendance in their school" ON public.attendance_records FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access incidents in their school" ON public.behavior_incidents FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access assignments in their school" ON public.assignments FOR ALL USING (school_id = get_my_school_id());
CREATE POLICY "School members can access timetables in their school" ON public.timetable_entries FOR ALL USING (school_id = get_my_school_id());


-- ================================================================================================
-- Section 7: Storage Policies (Multi-Tenant)
-- ================================================================================================
-- Helper function to get school_id from object path (e.g., "school_uuid/logo.png")
CREATE OR REPLACE FUNCTION get_school_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
    school_id_text TEXT;
BEGIN
    school_id_text := split_part(path, '/', 1);
    RETURN school_id_text::UUID;
EXCEPTION WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Storage policies for 'school-assets' (Logos)
DROP POLICY IF EXISTS "Public can read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage their school's assets" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage all school assets" ON storage.objects;

CREATE POLICY "Public can read school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admins can manage their school's assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND get_my_school_id() = get_school_id_from_path(name));
CREATE POLICY "Super Admins can manage all school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND is_super_admin());

-- Storage policies for 'assignment-files'
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can manage their school's assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage all assignment files" ON storage.objects;

CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Admins and teachers can manage their school's assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND get_my_school_id() = get_school_id_from_path(name));
CREATE POLICY "Super Admins can manage all assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND is_super_admin());


-- ========================== END OF SCRIPT ==========================
