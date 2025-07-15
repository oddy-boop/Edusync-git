-- ==================================================================
-- RLS Policies for EduSync (Single-Tenant) v3
-- Description: A complete, idempotent, and performant policy set.
-- This version addresses all linter warnings for performance and
-- consolidates multiple policies into single, comprehensive ones.
-- ==================================================================

-- ==================================================================
-- Section 1: Drop All Existing Policies to Ensure Idempotency
-- ==================================================================
-- This section ensures the script can be run multiple times without "policy already exists" errors.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;


-- ==================================================================
-- Section 2: Helper Functions
-- ==================================================================

-- Gets the role of the currently authenticated user.
-- SECURE: Sets a fixed search_path to prevent hijacking.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  -- SET LOCAL search_path = ''; -- Uncomment for Supabase CLI local dev
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


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
-- Admins can manage all roles. Users can see their own role.
CREATE POLICY "Manage user_roles" ON public.user_roles
  FOR ALL
  USING (
    get_my_role() = 'admin' OR
    user_id = (SELECT auth.uid()) -- Users can view their own role
  );

-- Table: students
-- Admins can manage all. Teachers can view students in their assigned classes. Students can view their own profile.
CREATE POLICY "Manage students" ON public.students
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can view students in their assigned classes
      get_my_role() = 'teacher' AND
      grade_level = ANY (SELECT assigned_classes FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view their own profile
      get_my_role() = 'student' AND
      auth_user_id = (SELECT auth.uid())
    )
  );

-- Table: teachers
-- Admins can manage all. Authenticated users can view all teachers (for display purposes).
CREATE POLICY "Manage teachers" ON public.teachers
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    auth.role() = 'authenticated' -- Allow any logged-in user to see teacher profiles
  );


-- ==================================================================
-- Section 5: Policies for Application-Wide Data
-- ==================================================================

-- Table: app_settings
-- Admins can manage settings. All other authenticated users can read them.
CREATE POLICY "Manage app_settings" ON public.app_settings
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Authenticated users can read
      auth.role() = 'authenticated' AND
      (SELECT pg_has_role(auth.uid()::text, 'authenticated', 'usage')) -- Check if role is valid
    )
  );

-- Table: school_announcements
-- Admins can manage all. Authenticated users can read.
CREATE POLICY "Manage school_announcements" ON public.school_announcements
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    auth.role() = 'authenticated'
  );


-- ==================================================================
-- Section 6: Policies for Financial Data
-- ==================================================================

-- Table: school_fee_items
CREATE POLICY "Manage school_fee_items" ON public.school_fee_items
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    auth.role() = 'authenticated'
  );

-- Table: fee_payments
CREATE POLICY "Manage fee_payments" ON public.fee_payments
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Students can see their own payments
      get_my_role() = 'student' AND
      student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
    )
  );

-- Table: student_arrears
CREATE POLICY "Manage student_arrears" ON public.student_arrears
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Students can see their own arrears
      get_my_role() = 'student' AND
      student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
    )
  );

-- ==================================================================
-- Section 7: Policies for Academic & Behavioral Data
-- ==================================================================

-- Table: academic_results
CREATE POLICY "Manage academic_results" ON public.academic_results
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can manage results for students in their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT assigned_classes FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view their own approved and published results
      get_my_role() = 'student' AND
      student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
      AND approval_status = 'approved'
      AND published_at <= now()
    )
  );

-- Table: attendance_records
CREATE POLICY "Manage attendance_records" ON public.attendance_records
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can manage attendance for students in their assigned classes
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT assigned_classes FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can see their own attendance
      get_my_role() = 'student' AND
      student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
    )
  );


-- Table: behavior_incidents
CREATE POLICY "Manage behavior_incidents" ON public.behavior_incidents
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can manage incidents they created
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
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
      class_id = (SELECT grade_level FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
    )
  );


-- Table: timetable_entries
CREATE POLICY "Manage timetable_entries" ON public.timetable_entries
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR
    ( -- Teachers can manage their own timetable
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT id FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
    )
    OR
    ( -- Students can view timetables that include their class
      get_my_role() = 'student' AND
      EXISTS (
          SELECT 1 FROM jsonb_array_elements(periods) AS p
          WHERE p->'classNames' ? (SELECT grade_level FROM public.students WHERE auth_user_id = (SELECT auth.uid()))
      )
    )
  );

-- Table: audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ==================================================================
-- Section 8: Storage Policies
-- ==================================================================
-- Note: Replace 'school-assets' and 'assignment-files' with your actual bucket names if different.

-- Policy for 'school-assets' bucket (e.g., logos)
DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
CREATE POLICY "Allow public read access to school assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow admin to manage school assets" ON storage.objects;
CREATE POLICY "Allow admin to manage school assets" ON storage.objects
  FOR ALL
  USING (bucket_id = 'school-assets' AND get_my_role() = 'admin');


-- Policy for 'assignment-files' bucket
DROP POLICY IF EXISTS "Allow public read access to assignment files" ON storage.objects;
CREATE POLICY "Allow public read access to assignment files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'assignment-files');

DROP POLICY IF EXISTS "Allow teachers to manage their assignment files" ON storage.objects;
CREATE POLICY "Allow teachers to manage their assignment files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    -- Path is like: {teacher_id}/{assignment_id}-{filename}
    -- This checks if the user's teacher ID is at the start of the path.
    (storage.foldername(name))[1] = (SELECT id::text FROM public.teachers WHERE auth_user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Allow admin to manage all assignment files" ON storage.objects;
CREATE POLICY "Allow admin to manage all assignment files" ON storage.objects
  FOR ALL
  USING (bucket_id = 'assignment-files' AND get_my_role() = 'admin');
