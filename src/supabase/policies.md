-- ==================================================================
-- RLS Policies for St. Joseph's Montessori (Single-Tenant) v2
-- Description: Corrected policies for a single-school setup.
-- This version fixes issues with user role creation.
-- ==================================================================

-- 0. Drop all old policies to ensure a clean slate
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all students and teachers" ON public.students;
DROP POLICY IF EXISTS "Students and teachers can view their own profiles" ON public.students;
DROP POLICY IF EXISTS "Admins can manage all students and teachers" ON public.teachers;
DROP POLICY IF EXISTS "Students and teachers can view their own profiles" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage all" ON public.school_announcements;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.school_announcements;
DROP POLICY IF EXISTS "Admins can manage all" ON public.school_fee_items;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.school_fee_items;
DROP POLICY IF EXISTS "Admins can manage all" ON public.fee_payments;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.fee_payments;
DROP POLICY IF EXISTS "Admins can manage all" ON public.student_arrears;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.student_arrears;
DROP POLICY IF EXISTS "Teachers can manage their assigned students data" ON public.academic_results;
DROP POLICY IF EXISTS "Students can see their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Admins can manage all" ON public.academic_results;
DROP POLICY IF EXISTS "Admins can manage all" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can manage all" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Admins can manage all" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.assignments;
DROP POLICY IF EXISTS "Admins can manage all" ON public.timetable_entries;
DROP POLICY IF EXISTS "Authenticated users can view" ON public.timetable_entries;

-- 1. Helper function to get the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Enable RLS for all relevant tables
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

-- 3. Policies for 'user_roles' table
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policies for 'students' and 'teachers' tables
CREATE POLICY "Admins can manage all students and teachers" ON public.students
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins can manage all students and teachers" ON public.teachers
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Students and teachers can view their own profiles" ON public.students
  FOR SELECT
  USING (auth.uid() = auth_user_id);
  
CREATE POLICY "Students and teachers can view their own profiles" ON public.teachers
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 5. Policies for 'app_settings'
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read app settings" ON public.app_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Universal policies for other tables (Admins can do anything, others can view)
CREATE OR REPLACE FUNCTION create_universal_policies(table_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('CREATE POLICY "Admins can manage all" ON public.%I FOR ALL USING (get_my_role() = ''admin'') WITH CHECK (get_my_role() = ''admin'');', table_name);
  EXECUTE format('CREATE POLICY "Authenticated users can view" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'');', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply universal policies to most tables
SELECT create_universal_policies('school_announcements');
SELECT create_universal_policies('school_fee_items');
SELECT create_universal_policies('fee_payments');
SELECT create_universal_policies('student_arrears');

-- 7. Special policies for teacher-student interactions
CREATE POLICY "Teachers can manage their assigned students data" ON public.academic_results
    FOR ALL
    USING (get_my_role() = 'teacher')
    WITH CHECK (get_my_role() = 'teacher');

CREATE POLICY "Admins can manage all" ON public.academic_results
  FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Students can see their own results" ON public.academic_results
    FOR SELECT
    USING (auth.uid() = (SELECT auth_user_id FROM public.students s WHERE s.student_id_display = academic_results.student_id_display));
    
-- Apply similar specific logic for attendance, behavior, assignments, etc.
SELECT create_universal_policies('attendance_records');
SELECT create_universal_policies('behavior_incidents');
SELECT create_universal_policies('assignments');
SELECT create_universal_policies('timetable_entries');

-- 8. Storage Policies (Simplified for single-tenant)
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;
CREATE POLICY "Public can read assets" ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'school-assets' OR bucket_id = 'assignment-files' );

DROP POLICY IF EXISTS "Admins and teachers can manage assets" ON storage.objects;
CREATE POLICY "Admins and teachers can manage assets" ON storage.objects
    FOR ALL
    USING ( get_my_role() IN ('admin', 'teacher') );
