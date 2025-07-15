
-- ==================================================================
-- EduSync Platform - Complete RLS Policies
-- Version: 3.1
-- Description: A complete, idempotent, and performant policy set.
-- This version addresses all linter warnings for performance and
-- consolidates multiple policies into single, comprehensive ones.
-- ==================================================================

-- ==================================================================
-- Section 1: Drop All Existing Policies to Ensure Idempotency
-- ==================================================================
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

-- Gets the role of the currently authenticated user.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================
-- Section 3: Enable RLS on All Tables
-- ==================================================================
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
CREATE POLICY "Allow full access for admins and self-read for users" ON public.user_roles
  FOR ALL
  USING (
    get_my_role() = 'admin' OR
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    get_my_role() = 'admin'
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
CREATE POLICY "Manage and read app settings" ON public.app_settings
  FOR ALL
  USING (
    get_my_role() = 'admin' -- Admins can do everything
    OR
    (SELECT auth.role()) = 'authenticated' -- Any logged-in user can read settings
  )
  WITH CHECK (
    get_my_role() = 'admin' -- Only admins can change settings
  );

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
CREATE POLICY "Manage and read school fee items" ON public.school_fee_items
  FOR ALL USING (get_my_role() = 'admin' OR (SELECT auth.role()) = 'authenticated')
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
CREATE POLICY "Manage academic results" ON public.academic_results
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can manage results for students in their assigned classes
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
    ( -- Teachers can create/update results for students in their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );


-- Table: attendance_records
CREATE POLICY "Manage attendance records" ON public.attendance_records
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
    ( -- Teachers can create/update records for their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: behavior_incidents
CREATE POLICY "Manage behavior incidents" ON public.behavior_incidents
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can view all incidents, but only manage their own
      get_my_role() = 'teacher'
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can only create/update incidents they own
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: assignments
CREATE POLICY "Manage assignments" ON public.assignments
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    get_my_role() = 'teacher'
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
CREATE POLICY "Manage timetable entries" ON public.timetable_entries
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
    OR
    (
      get_my_role() = 'student' AND
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(periods) AS p
        WHERE p->'classNames' ? (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()))
      )
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR ALL USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ==================================================================
-- Section 8: Storage Policies
-- ==================================================================
-- Note: Replace 'school-assets' and 'assignment-files' with your actual bucket names if different.

-- Policy for 'school-assets' bucket (e.g., logos)
DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
CREATE POLICY "Allow public read access to school assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow admin to manage school assets" ON storage.objects;
CREATE POLICY "Allow admin to manage school assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND get_my_role() = 'admin');


-- Policy for 'assignment-files' bucket
DROP POLICY IF EXISTS "Allow public read access to assignment files" ON storage.objects;
CREATE POLICY "Allow public read access to assignment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assignment-files');

DROP POLICY IF EXISTS "Allow teachers to manage their assignment files" ON storage.objects;
CREATE POLICY "Allow teachers to manage their assignment files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    (storage.foldername(name))[1] = (SELECT t.id::text FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Allow admin to manage all assignment files" ON storage.objects;
CREATE POLICY "Allow admin to manage all assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND get_my_role() = 'admin');
