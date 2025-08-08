-- ==================================================================
-- EduSync Platform - Complete RLS Policies & Storage Setup
-- Version: 6.9.1 - Fix staff attendance insert policy for teachers
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
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = (select auth.uid()) LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- NEW: Secure function to record a fee payment.
CREATE OR REPLACE FUNCTION public.record_fee_payment(
    p_payment_id_display text,
    p_student_id_display text,
    p_student_name text,
    p_grade_level text,
    p_amount_paid numeric,
    p_payment_date date,
    p_payment_method text,
    p_term_paid_for text,
    p_notes text,
    p_received_by_name text,
    p_received_by_user_id uuid
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.fee_payments (
        payment_id_display,
        student_id_display,
        student_name,
        grade_level,
        amount_paid,
        payment_date,
        payment_method,
        term_paid_for,
        notes,
        received_by_name,
        received_by_user_id
    ) VALUES (
        p_payment_id_display,
        p_student_id_display,
        p_student_name,
        p_grade_level,
        p_amount_paid,
        p_payment_date,
        p_payment_method,
        p_term_paid_for,
        p_notes,
        p_received_by_name,
        p_received_by_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Revoke execute from public and grant it only to the service_role and authenticated roles.
-- This ensures only our backend or a logged-in user (via a server action) can call it.
REVOKE EXECUTE ON FUNCTION public.record_fee_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fee_payment TO service_role, authenticated;


-- ==================================================================
-- Section 3: Enable RLS on All Tables
-- ==================================================================
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
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;


-- ==================================================================
-- Section 4: Policies for Core User and Role Tables
-- ==================================================================

-- Table: user_roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Allow service_role to read user roles" ON public.user_roles
  FOR SELECT
  USING (auth.role() = 'service_role');


-- Table: students
-- FIX: Allow anon role to select specific columns for student ID login lookup.
CREATE POLICY "Public can look up student email by ID" ON public.students
  FOR SELECT
  USING (auth.role() = 'anon');

-- FIX: Allow authenticated users to view profiles based on their role.
CREATE POLICY "Authenticated users can view student data" ON public.students
  FOR SELECT
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      grade_level = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
    OR
    (
      get_my_role() = 'student' AND
      auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert/delete student profiles" ON public.students
  FOR INSERT, DELETE
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update student profiles" ON public.students
    FOR UPDATE
    USING (get_my_role() IN ('admin', 'super_admin'));


-- Table: teachers
CREATE POLICY "Comprehensive teacher data access policy" ON public.teachers
  FOR SELECT
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (SELECT auth.role()) = 'authenticated'
  );

CREATE POLICY "Admins can insert/delete teachers" ON public.teachers
  FOR INSERT, DELETE
  USING (
    get_my_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins and teachers can update teacher profiles" ON public.teachers
    FOR UPDATE
    USING (
        get_my_role() IN ('admin', 'super_admin')
        OR
        (get_my_role() = 'teacher' AND auth_user_id = auth.uid())
    );

-- ==================================================================
-- Section 5: Policies for Application-Wide Data
-- ==================================================================

-- Table: app_settings
CREATE POLICY "Allow public read access to settings" ON public.app_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin write access to settings" ON public.app_settings
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));


-- Table: school_announcements (Internal)
CREATE POLICY "Manage and read school announcements" ON public.school_announcements
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (SELECT auth.role()) = 'authenticated'
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
  );

-- Table: news_posts (Public)
CREATE POLICY "Admins can manage news posts" ON public.news_posts
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

CREATE POLICY "Public can read news posts" ON public.news_posts
  FOR SELECT
  USING (true);

-- Table: admission_applications
CREATE POLICY "Allow public to submit admission applications" ON public.admission_applications
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage admission applications" ON public.admission_applications
    FOR ALL
    USING (get_my_role() IN ('admin', 'super_admin'));

-- ==================================================================
-- Section 6: Policies for Financial Data
-- ==================================================================

-- Table: school_fee_items
CREATE POLICY "Allow authenticated users to read fee items" ON public.school_fee_items
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');
  
CREATE POLICY "Allow admins to manage fee items" ON public.school_fee_items
  FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

-- Table: fee_payments
-- CRITICAL FIX: This policy correctly allows students to see their own payments and admins to see all payments.
CREATE POLICY "Users can view and manage payments based on role" ON public.fee_payments
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
  );


-- Table: student_arrears
CREATE POLICY "Manage and read student arrears" ON public.student_arrears
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()))
  )
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

-- ==================================================================
-- Section 7: Policies for Academic & Behavioral Data
-- ==================================================================

-- Table: academic_results
CREATE POLICY "Comprehensive academic results access" ON public.academic_results
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = auth.uid()))
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND
      approval_status = 'approved' AND
      published_at <= now()
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: attendance_records (for students)
CREATE POLICY "Comprehensive attendance records access" ON public.attendance_records
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      class_id = ANY (SELECT t.assigned_classes FROM public.teachers t WHERE t.auth_user_id = auth.uid()))
    OR
    (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      marked_by_teacher_auth_id = auth.uid()
    )
  );

-- Table: staff_attendance
CREATE POLICY "Admins can manage staff attendance" ON public.staff_attendance
    FOR ALL
    USING (get_my_role() in ('admin', 'super_admin'));

CREATE POLICY "Teachers can view their own attendance" ON public.staff_attendance
    FOR SELECT
    USING (get_my_role() = 'teacher' AND teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid()));

-- FIX: Add policy to allow teachers to insert/update their own attendance record.
CREATE POLICY "Teachers can check-in for themselves" ON public.staff_attendance
    FOR INSERT, UPDATE
    USING (get_my_role() = 'teacher' AND teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid()))
    WITH CHECK (get_my_role() = 'teacher' AND teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid()));


-- Table: behavior_incidents
CREATE POLICY "Comprehensive behavior incidents access" ON public.behavior_incidents
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin', 'teacher')
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: assignments
CREATE POLICY "Comprehensive assignments access" ON public.assignments
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin', 'teacher')
    OR
    (
      get_my_role() = 'student' AND
      class_id = (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = auth.uid()))
    )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: timetable_entries
CREATE POLICY "Comprehensive timetable access" ON public.timetable_entries
  FOR ALL
  USING (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
    OR
    (
      get_my_role() = 'student' AND
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(periods) AS period
        WHERE (period -> 'classNames')::jsonb ? (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = auth.uid())::text
      )
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'super_admin')
    OR
    (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );


-- Table: audit_logs
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

-- ==================================================================
-- Section 8: Storage Bucket Creation and Policies
-- ==================================================================
-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', true) ON CONFLICT (id) DO NOTHING;


-- Policies for 'school-assets' bucket
CREATE POLICY "Public read access for school-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');

CREATE POLICY "Admin full access for school-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND get_my_role() IN ('admin', 'super_admin'));


-- Policies for 'assignment-files' bucket
-- 1. Teachers can INSERT files into the bucket.
CREATE POLICY "Allow teachers to insert new assignment files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher'
  );

-- 2. Teachers can SELECT, UPDATE, and DELETE their OWN files.
CREATE POLICY "Allow teachers to manage their own files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    owner = auth.uid()
  );

-- 3. Students can only SELECT (download) files that are linked to an assignment for their class.
CREATE POLICY "Students can download assignment files for their class" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'student' AND
    (
      EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.file_url LIKE '%' || name
        AND a.class_id = (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = auth.uid())
      )
    )
  );

-- 4. Admins have full superpower access to all files in the bucket.
CREATE POLICY "Admin can manage all assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND get_my_role() IN ('admin', 'super_admin'));
