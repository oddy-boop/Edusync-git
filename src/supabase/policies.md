-- ================================================================================================
-- EduSync Multi-Tenant SaaS Platform - Definitive Schema & RLS Policy v7.0
-- Description: This script refactors the database from a single-school app to a multi-tenant SaaS model.
--              It introduces a `schools` table and scopes all data and policies to a `school_id`.
--
-- INSTRUCTIONS: Run this entire script in your Supabase SQL Editor. THIS WILL MODIFY YOUR SCHEMA.
--               It is recommended to back up your data before running.
-- ================================================================================================


-- ================================================================================================
-- Section 1: Create the `schools` table to manage tenants
-- This table will hold school-specific information, including encrypted API keys.
-- ================================================================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    domain character varying NOT NULL,
    -- Encrypted API Keys. `pgsodium` must be enabled in your Supabase project.
    paystack_secret_key_encrypted text,
    paystack_public_key_encrypted text,
    resend_api_key_encrypted text,
    google_api_key_encrypted text,
    -- Nonce for encryption
    nonce bytea,
    key_id uuid
);
ALTER TABLE public.schools ADD PRIMARY KEY (id);
ALTER TABLE public.schools ADD CONSTRAINT schools_domain_key UNIQUE (domain);

-- ================================================================================================
-- Section 2: Add `school_id` foreign key to all relevant tables
-- ================================================================================================

-- This function will help find the first school to use as a default
-- when migrating existing data that doesn't have a school_id.
CREATE OR REPLACE FUNCTION get_first_school_id()
RETURNS uuid AS $$
  SELECT id FROM public.schools LIMIT 1;
$$ LANGUAGE sql;


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

-- Update existing rows to link to the first school.
-- Important: You must have at least one school in the `schools` table for this to work.
-- If the schools table is empty, you need to add one manually first.
-- Example: INSERT INTO public.schools (name, domain) VALUES ('St. Josephs Montessori', 'sjm');
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


-- Make school_id NOT NULL after updating existing rows
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


-- Change app_settings to have a composite primary key with school_id
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (id, school_id);


-- ================================================================================================
-- Section 3: Re-introduce Super Admin role and Helper Functions
-- ================================================================================================

-- Add 'super_admin' to the list of allowed roles
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

-- Helper function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- Helper function to get the school_id for the currently logged-in user
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS uuid AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ================================================================================================
-- Section 4: Drop all old policies and recreate them for multi-tenancy
-- ================================================================================================

-- Drop all existing policies from the single-school setup
DROP POLICY IF EXISTS "Public can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage school settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "School members can access students" ON public.students;
DROP POLICY IF EXISTS "School members can access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated can read announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "Authenticated can read fee items" ON public.school_fee_items;
DROP POLICY IF EXISTS "Admins can manage fee items" ON public.school_fee_items;
DROP POLICY IF EXISTS "Users can see their own payments, admins see all" ON public.fee_payments;
DROP POLICY IF EXISTS "Admins and service roles can create payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Admins can manage arrears" ON public.student_arrears;
DROP POLICY IF EXISTS "Admins and teachers can manage results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own approved results" ON public.academic_results;
DROP POLICY IF EXISTS "Authenticated can read attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins and teachers manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins and teachers manage behavior incidents" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Authenticated users can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins and teachers can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can read timetables" ON public.timetable_entries;
DROP POLICY IF EXISTS "Admins and teachers can manage timetables" ON public.timetable_entries;
DROP POLICY IF EXISTS "Public can read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage school assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage their own assignment files" ON storage.objects;

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


-- --- Policies for `schools` table ---
CREATE POLICY "Super admins can manage schools" ON public.schools FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Public can read school info by domain" ON public.schools FOR SELECT USING (true);


-- --- Policies for `app_settings` ---
CREATE POLICY "Super admins can manage all settings" ON public.app_settings FOR ALL USING (is_super_admin());
CREATE POLICY "Admins can manage their own school settings" ON public.app_settings FOR ALL USING (school_id = get_my_school_id() AND is_school_admin()) WITH CHECK (school_id = get_my_school_id() AND is_school_admin());
CREATE POLICY "Public can read settings" ON public.app_settings FOR SELECT USING (true);


-- --- Policies for `user_roles` ---
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (is_super_admin());
CREATE POLICY "Admins can manage roles in their school" ON public.user_roles FOR ALL USING (school_id = get_my_school_id() AND is_school_admin()) WITH CHECK (school_id = get_my_school_id() AND is_school_admin());
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- --- Policies for all other data tables (scoped by school_id) ---
CREATE POLICY "School members can access students in their school" ON public.students FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access teachers in their school" ON public.teachers FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access announcements in their school" ON public.school_announcements FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access fee items in their school" ON public.school_fee_items FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access payments in their school" ON public.fee_payments FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access arrears in their school" ON public.student_arrears FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access results in their school" ON public.academic_results FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access attendance in their school" ON public.attendance_records FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access incidents in their school" ON public.behavior_incidents FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access assignments in their school" ON public.assignments FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());
CREATE POLICY "School members can access timetables in their school" ON public.timetable_entries FOR ALL USING (school_id = get_my_school_id()) WITH CHECK (school_id = get_my_school_id());

-- Special select policy for students to view their own results
CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM public.students WHERE student_id_display = academic_results.student_id_display LIMIT 1) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());


-- ================================================================================================
-- Section 5: Storage Policies (Multi-Tenant)
-- ================================================================================================

-- Policies for 'school-assets' bucket (logos, hero images, etc.)
CREATE POLICY "Public can read school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admins can manage their school's assets" ON storage.objects FOR ALL
    USING (bucket_id = 'school-assets' AND is_school_admin() AND (storage.foldername(name))[1] = get_my_school_id()::text)
    WITH CHECK (bucket_id = 'school-assets' AND is_school_admin() AND (storage.foldername(name))[1] = get_my_school_id()::text);
CREATE POLICY "Super Admins can manage all school assets" ON storage.objects FOR ALL
    USING (bucket_id = 'school-assets' AND is_super_admin())
    WITH CHECK (bucket_id = 'school-assets' AND is_super_admin());


-- Policies for 'assignment-files' bucket
CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Admins and teachers can manage their school's assignment files" ON storage.objects FOR ALL
    USING (bucket_id = 'assignment-files' AND (is_school_admin() OR auth.uid() = owner) AND (storage.foldername(name))[1] = get_my_school_id()::text)
    WITH CHECK (bucket_id = 'assignment-files' AND (is_school_admin() OR auth.uid() = owner) AND (storage.foldername(name))[1] = get_my_school_id()::text);
CREATE POLICY "Super Admins can manage all assignment files" ON storage.objects FOR ALL
    USING (bucket_id = 'assignment-files' AND is_super_admin())
    WITH CHECK (bucket_id = 'assignment-files' AND is_super_admin());


-- ========================== END OF SCRIPT ==========================
