-- ==================================================================
-- EduSync Platform - Complete RLS Policies & Storage Setup
-- Version: 5.1
-- Description: Fixed type conversion issues and ensured consistent 
-- type handling in subqueries and array comparisons
-- ==================================================================

-- ==================================================================
-- Section 1: Grant necessary permissions
-- ==================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.user_roles TO postgres, anon, authenticated, service_role;


-- ==================================================================
-- Section 2: Drop All Existing Policies to Ensure Idempotency
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
-- Section 3: Helper Function
-- ==================================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ==================================================================
-- Section 4: Enable RLS on All Tables
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
-- Section 5: Policies for Core User & Role Tables
-- ==================================================================

-- Table: user_roles
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'admin');

-- Table: students
CREATE POLICY "Comprehensive student data access policy" ON public.students
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      grade_level::text = ANY (
        SELECT unnest(t.assigned_classes::text[]) 
        FROM public.teachers t 
        WHERE t.auth_user_id = auth.uid()
      )
    )
    OR (
      get_my_role() = 'student' AND
      auth_user_id = auth.uid()
    )
  )
  WITH CHECK (get_my_role() = 'admin');

-- Table: teachers
CREATE POLICY "Comprehensive teacher data access policy" ON public.teachers
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (get_my_role() = 'admin');


-- ==================================================================
-- Section 6: Policies for Application-Wide Data
-- ==================================================================

-- Table: app_settings
CREATE POLICY "Allow public read access to settings" ON public.app_settings
  FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to settings" ON public.app_settings
  FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- Table: school_announcements
CREATE POLICY "Manage and read school announcements" ON public.school_announcements
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR auth.role() = 'authenticated'
  )
  WITH CHECK (get_my_role() = 'admin');


-- ==================================================================
-- Section 7: Policies for Financial Data
-- ==================================================================

-- Table: school_fee_items
CREATE POLICY "Allow authenticated users to read fee items" ON public.school_fee_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admins to manage fee items" ON public.school_fee_items
  FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- Table: fee_payments
CREATE POLICY "Manage and read fee payments" ON public.fee_payments
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (get_my_role() = 'admin');

-- Table: student_arrears
CREATE POLICY "Manage and read student arrears" ON public.student_arrears
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (get_my_role() = 'admin');

-- ==================================================================
-- Section 8: Policies for Academic & Behavioral Data
-- ==================================================================

-- Table: academic_results
CREATE POLICY "Comprehensive academic results access" ON public.academic_results
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      class_id::text = ANY (
        SELECT unnest(t.assigned_classes::text[]) 
        FROM public.teachers t 
        WHERE t.auth_user_id = auth.uid()
      )
    )
    OR (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) AND
      approval_status = 'approved' AND
      published_at <= now()
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: attendance_records
CREATE POLICY "Comprehensive attendance records access" ON public.attendance_records
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      class_id::text = ANY (
        SELECT unnest(t.assigned_classes::text[]) 
        FROM public.teachers t 
        WHERE t.auth_user_id = auth.uid()
      )
    )
    OR (
      get_my_role() = 'student' AND
      student_id_display = (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      marked_by_teacher_auth_id = auth.uid()
    )
  );

-- Table: behavior_incidents
CREATE POLICY "Comprehensive behavior incidents access" ON public.behavior_incidents
  FOR ALL
  USING (get_my_role() = 'admin' OR get_my_role() = 'teacher')
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: assignments
CREATE POLICY "Comprehensive assignments access" ON public.assignments
  FOR ALL
  USING (
    get_my_role() = 'admin' OR get_my_role() = 'teacher'
    OR (
      get_my_role() = 'student' AND
      class_id::text = (SELECT s.grade_level::text FROM public.students s WHERE s.auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: timetable_entries
CREATE POLICY "Comprehensive timetable access" ON public.timetable_entries
  FOR ALL
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
    OR (
      get_my_role() = 'student' AND
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(periods) AS period
        WHERE period->'classNames' @> to_jsonb((SELECT s.grade_level::text FROM public.students s WHERE s.auth_user_id = auth.uid()))
      )
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'teacher' AND
      teacher_id = (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid())
    )
  );

-- Table: audit_logs
CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL USING (get_my_role() = 'admin');

-- ==================================================================
-- Section 9: Storage Bucket Creation and Policies
-- ==================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up any old policies
DROP POLICY IF EXISTS "Public read for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teacher manage own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage all assignment files" ON storage.objects;

-- Policies for 'school-assets' bucket
CREATE POLICY "Public read for school-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Admin full access for school-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'school-assets' AND get_my_role() = 'admin');

-- Policies for 'assignment-files' bucket
CREATE POLICY "Authenticated can view assignment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'assignment-files' AND auth.role() = 'authenticated');
CREATE POLICY "Teacher manage own assignment files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assignment-files' AND
    get_my_role() = 'teacher' AND
    (storage.foldername(name))[1] = (SELECT id FROM public.teachers WHERE auth_user_id = auth.uid())::text
  );
CREATE POLICY "Admin manage all assignment files" ON storage.objects
  FOR ALL USING (bucket_id = 'assignment-files' AND get_my_role() = 'admin');
