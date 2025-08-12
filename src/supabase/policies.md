-- ==================================================================
-- EduSync Platform - Complete RLS Policies & Storage Setup
-- Version: 7.1 - Adds public read access to schools
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

-- Clean up any old policies on storage.objects before creating new ones.
DROP POLICY IF EXISTS "Public read access for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can insert their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage all assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Students can download assignment files for their class" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to insert new assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to manage their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read assignment files" ON storage.objects;


-- ==================================================================
-- Section 2: Helper Functions
-- ==================================================================
-- Gets the role of the currently calling user.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Gets the school_id of the currently calling user.
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ==================================================================
-- Section 3: Enable RLS on All Tables
-- ==================================================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;


-- ==================================================================
-- Section 4: Policies for Core User and School Management Tables
-- ==================================================================

-- Table: schools (the main tenant table)
CREATE POLICY "Super Admins can manage all schools" ON public.schools
  FOR ALL
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admins and staff can view their own school's details" ON public.schools
  FOR SELECT
  USING (id = get_my_school_id());
  
CREATE POLICY "Public can view school information" ON public.schools
  FOR SELECT
  USING (true);

-- Table: user_roles
CREATE POLICY "Super Admins can manage all user roles" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admins can manage user roles within their own school" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'admin' AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Table: students
CREATE POLICY "Users can view students within their own school" ON public.students
  FOR SELECT
  USING (school_id = get_my_school_id());

CREATE POLICY "Admins can manage students in their school" ON public.students
  FOR INSERT, UPDATE, DELETE
  USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: teachers
CREATE POLICY "Users can view teachers within their own school" ON public.teachers
  FOR SELECT
  USING (school_id = get_my_school_id());

CREATE POLICY "Admins can manage teachers in their school" ON public.teachers
  FOR INSERT, DELETE
  USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "Teachers can update their own profiles" ON public.teachers
    FOR UPDATE
    USING (auth_user_id = auth.uid());

-- ==================================================================
-- Section 5: Policies for Application-Wide Data (Multi-Tenant)
-- ==================================================================

-- Table: school_announcements
CREATE POLICY "Users can view announcements for their school" ON public.school_announcements
  FOR SELECT
  USING (school_id = get_my_school_id());

CREATE POLICY "Admins can manage announcements for their school" ON public.school_announcements
  FOR INSERT, UPDATE, DELETE
  USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: news_posts
CREATE POLICY "Public can read news posts" ON public.news_posts
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage news for their school" ON public.news_posts
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: admission_applications
CREATE POLICY "Allow public to submit admission applications" ON public.admission_applications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage applications for their school" ON public.admission_applications
    FOR ALL
    USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id());


-- ==================================================================
-- Section 6: Policies for Financial Data (Multi-Tenant)
-- ==================================================================

-- Table: school_fee_items
CREATE POLICY "Authenticated users can read fee items for their school" ON public.school_fee_items
  FOR SELECT
  USING (school_id = get_my_school_id());
  
CREATE POLICY "Admins/Accountants can manage fee items for their school" ON public.school_fee_items
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: fee_payments
CREATE POLICY "Users can manage/view payments for their school" ON public.fee_payments
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id()
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND
      school_id = get_my_school_id()
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id()
  );

-- Table: student_arrears
CREATE POLICY "Users can manage/view arrears for their school" ON public.student_arrears
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id()
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND
      school_id = get_my_school_id()
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id()
  );

-- Table: expenditures
CREATE POLICY "Admins/Accountants can manage expenditures for their school" ON public.expenditures
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin', 'accountant') AND school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- ==================================================================
-- Section 7: Policies for Academic & Behavioral Data (Multi-Tenant)
-- ==================================================================

-- Table: academic_results
CREATE POLICY "Manage/view academic results within a school" ON public.academic_results
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: attendance_records
CREATE POLICY "Manage/view student attendance within a school" ON public.attendance_records
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: staff_attendance
CREATE POLICY "Manage/view staff attendance within a school" ON public.staff_attendance
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: behavior_incidents
CREATE POLICY "Manage/view behavior incidents within a school" ON public.behavior_incidents
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: assignments
CREATE POLICY "Manage/view assignments within a school" ON public.assignments
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: timetable_entries
CREATE POLICY "Manage/view timetables within a school" ON public.timetable_entries
  FOR ALL
  USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Table: audit_logs
CREATE POLICY "Admins can manage audit logs for their school" ON public.audit_logs
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id())
  WITH CHECK (get_my_role() IN ('admin', 'super_admin') AND school_id = get_my_school_id());

-- ==================================================================
-- Section 8: Storage Bucket Policies
-- ==================================================================
-- Policies remain largely the same, but we add school context where possible.

-- Policies for 'school-assets' bucket (Logos etc.)
CREATE POLICY "Public read access for school-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');

CREATE POLICY "Admin full access for school-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND get_my_role() IN ('admin', 'super_admin'));

-- Policies for 'assignment-files' bucket
CREATE POLICY "Allow teachers to insert new assignment files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'assignment-files' AND get_my_role() = 'teacher');

CREATE POLICY "Allow teachers to manage their own files" ON storage.objects
  FOR ALL
  USING (bucket_id = 'assignment-files' AND get_my_role() = 'teacher' AND owner = auth.uid());

CREATE POLICY "Students can download assignment files for their class" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'student' AND
    (
      EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.file_url LIKE '%' || name
        AND a.school_id = get_my_school_id()
        AND a.class_id = (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Admin can manage all assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND get_my_role() IN ('admin', 'super_admin'));
