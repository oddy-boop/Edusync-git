-- ==================================================================
-- RLS Policies for St. Joseph's Montessori (Single-Tenant)
-- Description: A simplified policy set for a single-school setup.
-- ==================================================================

-- Helper function to get the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- 1. Enable RLS for all relevant tables
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

-- 2. Policies for 'user_roles' table
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Policies for 'students' and 'teachers' tables
DROP POLICY IF EXISTS "Admins can manage all students and teachers" ON public.students;
CREATE POLICY "Admins can manage all students and teachers" ON public.students
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage all students and teachers" ON public.teachers;
CREATE POLICY "Admins can manage all students and teachers" ON public.teachers
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Students and teachers can view their own profiles" ON public.students;
CREATE POLICY "Students and teachers can view their own profiles" ON public.students
  FOR SELECT
  USING (auth.uid() = auth_user_id);
  
DROP POLICY IF EXISTS "Students and teachers can view their own profiles" ON public.teachers;
CREATE POLICY "Students and teachers can view their own profiles" ON public.teachers
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 4. Policies for 'app_settings'
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read app settings" ON public.app_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Universal policies for other tables (Admins can do anything, others can view)
CREATE OR REPLACE FUNCTION create_universal_policies(table_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Admins can manage all" ON public.%I;', table_name);
  EXECUTE format('CREATE POLICY "Admins can manage all" ON public.%I FOR ALL USING (get_my_role() = ''admin'') WITH CHECK (get_my_role() = ''admin'');', table_name);
  
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view" ON public.%I;', table_name);
  EXECUTE format('CREATE POLICY "Authenticated users can view" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'');', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply universal policies to most tables
SELECT create_universal_policies('school_announcements');
SELECT create_universal_policies('school_fee_items');
SELECT create_universal_policies('fee_payments');
SELECT create_universal_policies('student_arrears');

-- 6. Special policies for teacher-student interactions
DROP POLICY IF EXISTS "Teachers can manage their assigned students data" ON public.academic_results;
CREATE POLICY "Teachers can manage their assigned students data" ON public.academic_results
    FOR ALL
    USING (get_my_role() = 'teacher')
    WITH CHECK (get_my_role() = 'teacher');

DROP POLICY IF EXISTS "Students can see their own results" ON public.academic_results;
CREATE POLICY "Students can see their own results" ON public.academic_results
    FOR SELECT
    USING (auth.uid() = (SELECT auth_user_id FROM public.students s WHERE s.student_id_display = academic_results.student_id_display));
    
-- Apply similar specific logic for attendance, behavior, assignments, etc.
SELECT create_universal_policies('attendance_records');
SELECT create_universal_policies('behavior_incidents');
SELECT create_universal_policies('assignments');
SELECT create_universal_policies('timetable_entries');

-- Storage Policies (Simplified for single-tenant)
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;
CREATE POLICY "Public can read assets" ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'school-assets' OR bucket_id = 'assignment-files' );

DROP POLICY IF EXISTS "Admins and teachers can manage assets" ON storage.objects;
CREATE POLICY "Admins and teachers can manage assets" ON storage.objects
    FOR ALL
    USING ( get_my_role() IN ('admin', 'teacher') );
