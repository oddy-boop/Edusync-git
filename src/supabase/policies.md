-- ==================================================================
-- EduSync Platform - Complete RLS Policies & Storage Setup
-- Version: 4.0
-- Description: This version corrects the user_roles policy to ensure
-- the get_my_role() function does not cause errors for anon users on
-- public pages, which was preventing app_settings from being read.
-- ==================================================================

-- ==================================================================
-- Section 1: Drop All Existing Policies to Ensure Idempotency
-- ==================================================================
-- This block removes any old policies on the tables to ensure a clean slate.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;

-- ==================================================================
-- Section 2: Helper Function
-- ==================================================================
-- Gets the role of the currently authenticated user for use in policies.
-- Using `(select auth.uid())` is a performance optimization.
-- SECURITY DEFINER is used to bypass RLS on the user_roles table for this specific query.
-- SET search_path = '' prevents search path hijacking attacks.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = (select auth.uid()) LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ==================================================================
-- Section 3: Enable RLS on All Tables
-- ==================================================================
-- This ensures that no table is left unprotected.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ==================================================================
-- Section 4: Policies for Core User & Role Tables
-- ==================================================================

-- Table: user_roles
-- **FIXED**: Allow any authenticated user to read roles, which is necessary for the get_my_role() function to work.
-- Admins retain write privileges.
CREATE POLICY "Admins can manage roles, authenticated users can read" ON public.user_roles
  FOR ALL
  USING (
    get_my_role() = 'admin' -- Admins can do anything
    OR
    (SELECT auth.role()) = 'authenticated' -- Any logged-in user can read roles.
  )
  WITH CHECK (
    get_my_role() = 'admin' -- Only admins can create/update roles
  );


-- Table: students
CREATE POLICY "Comprehensive student data access policy" ON public.students
  FOR ALL
  USING (
    get_my_role() = 'admin' -- Admin has full access to all students
    OR
    ( -- Teachers can view students in their assigned classes
      get_my_role() = 'teacher' AND
      grade_level = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view their own profile
      get_my_role() = 'student' AND
      auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() = 'admin' -- Only admins can create/update student records directly
  );

-- Table: teachers
CREATE POLICY "Comprehensive teacher data access policy" ON public.teachers
  FOR ALL
  USING (
    get_my_role() = 'admin' -- Admins can see all teachers
    OR
    (SELECT auth.role()) = 'authenticated' -- Any authenticated user can view teacher profiles
  )
  WITH CHECK (
    get_my_role() = 'admin' -- Only admins can create/modify teacher records
  );


-- ==================================================================
-- Section 5: Policies for Application-Wide Data
-- ==================================================================

-- Table: app_settings
CREATE POLICY "Allow public read access to settings" ON public.app_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin write access to settings" ON public.app_settings
  FOR INSERT, UPDATE, DELETE
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- Table: school_announcements
CREATE POLICY "Manage and read school announcements" ON public.school_announcements
  FOR ALL
  USING (
    get_my_role() = 'admin' -- Admins can manage all
    OR
    (SELECT auth.role()) = 'authenticated' -- All logged-in users can read
  )
  WITH CHECK (
    get_my_role() = 'admin' -- Only admins can create/edit/delete
  );


-- ==================================================================
-- Section 6: Policies for Financial Data
-- ==================================================================

-- Table: school_fee_items
CREATE POLICY "Allow authenticated users to read fee items" ON public.school_fee_items
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');
  
CREATE POLICY "Allow admins to manage fee items" ON public.school_fee_items
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Table: fee_payments
CREATE POLICY "Manage and read fee payments" ON public.fee_payments
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (get_my_role() = 'admin');

-- Table: student_arrears
CREATE POLICY "Manage and read student arrears" ON public.student_arrears
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (get_my_role() = 'admin');

-- ==================================================================
-- Section 7: Policies for Academic & Behavioral Data
-- ==================================================================

-- Table: academic_results
CREATE POLICY "Comprehensive academic results access" ON public.academic_results
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can access results for students in their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view their own approved and published results
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid())) AND
      approval_status = 'approved' AND
      published_at <= now()
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can create/update results they own
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: attendance_records
CREATE POLICY "Comprehensive attendance records access" ON public.attendance_records
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can view records for their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view their own records
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can create/update records
      get_my_role() = 'teacher' AND
      marked_by_teacher_auth_id = (SELECT auth.uid()))
    )
  );

-- Table: behavior_incidents
CREATE POLICY "Comprehensive behavior incidents access" ON public.behavior_incidents
  FOR ALL
  USING (
    get_my_role() = 'admin' OR get_my_role() = 'teacher'
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can only manage incidents they created
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: assignments
CREATE POLICY "Comprehensive assignments access" ON public.assignments
  FOR ALL
  USING (
    get_my_role() = 'admin' OR get_my_role() = 'teacher'
    OR
    ( -- Students can view assignments for their class
      get_my_role() = 'student' AND
      class_id = (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can only manage their own assignments
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: timetable_entries
CREATE POLICY "Comprehensive timetable access" ON public.timetable_entries
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can view their own entries
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view entries that contain their class
      get_my_role() = 'student' AND
      (periods ->> 'classNames')::jsonb ? (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))::text
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can create/update their own entries
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );


-- Table: audit_logs
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ==================================================================
-- Section 8: Storage Bucket Creation and Policies
-- ==================================================================
-- This section creates the necessary storage buckets if they don't exist
-- and sets the security policies for them.

-- Create 'school-assets' bucket for public school assets like logos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'assignment-files' bucket for teacher-uploaded assignment files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;


-- Clean up any old policies on storage.objects before creating new ones.
DROP POLICY IF EXISTS "Public read access for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assignment-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teacher can manage their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage all assignment files" ON storage.objects;

-- Policies for 'school-assets' bucket
CREATE POLICY "Public read access for school-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');

CREATE POLICY "Admin full access for school-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND get_my_role() = 'admin');


-- Policies for 'assignment-files' bucket
CREATE POLICY "Authenticated users can view assignment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assignment-files' AND (SELECT auth.role()) = 'authenticated');

CREATE POLICY "Teacher can manage their own assignment files" ON storage.objects
  FOR INSERT, UPDATE, DELETE
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    -- The folder name is the teacher's profile ID (from the teachers table)
    (storage.foldername(name))[1] = (SELECT t.id::text FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    (storage.foldername(name))[1] = (SELECT t.id::text FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Admin can manage all assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND get_my_role() = 'admin');
