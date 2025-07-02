-- ================================================================================================
-- St. Joseph's Montessori - Definitive Schema and Policy Fix Script
-- Description: This script corrects column types and applies a full set of RLS policies.
--              It is safe to run on a database where tables already exist.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Alter Table Column Types (The Core Fix)
-- Description: This section changes the incorrect 'text' columns to the correct 'uuid' type.
-- ================================================================================================

-- Alter the behavior_incidents table
ALTER TABLE public.behavior_incidents
  ALTER COLUMN teacher_id TYPE uuid USING teacher_id::uuid;
-- Add the foreign key constraint after type change
ALTER TABLE public.behavior_incidents
  ADD CONSTRAINT behavior_incidents_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id);

-- Alter the attendance_records table
ALTER TABLE public.attendance_records
  ALTER COLUMN marked_by_teacher_auth_id TYPE uuid USING marked_by_teacher_auth_id::uuid;
-- Add the foreign key constraint after type change
ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_marked_by_teacher_auth_id_fkey FOREIGN KEY (marked_by_teacher_auth_id) REFERENCES auth.users(id);


-- ================================================================================================
-- Section 2: Helper Functions (Required for Policies)
-- ================================================================================================

-- Function to check if the current user is an admin.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get the current teacher's profile ID (from the teachers table).
CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.teachers
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- ================================================================================================
-- Section 3: Drop Existing Policies (for a clean slate)
-- ================================================================================================

-- Drop policies for all tables to ensure a fresh start
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.app_settings;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_fee_items;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_announcements;

DROP POLICY IF EXISTS "Admins have full access" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;

DROP POLICY IF EXISTS "Admins have full access" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view profile" ON public.students;

DROP POLICY IF EXISTS "Enable all access for admins" ON public.fee_payments;
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;

DROP POLICY IF EXISTS "Admins have full access" ON public.student_arrears;
DROP POLICY IF EXISTS "Students can view their own arrears" ON public.student_arrears;

DROP POLICY IF EXISTS "Admins have full access" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students and Teachers can view assignments for their class" ON public.assignments;

DROP POLICY IF EXISTS "Admins have full access" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can manage their own incident logs" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can view all incidents" ON public.behavior_incidents;

DROP POLICY IF EXISTS "Admins have full access" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;

DROP POLICY IF EXISTS "Admins have full access" ON public.academic_results;
DROP POLICY IF EXISTS "Teachers can manage their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own published results" ON public.academic_results;

DROP POLICY IF EXISTS "Admins have full access" ON public.timetable_entries;
DROP POLICY IF EXISTS "Teachers can manage their own timetable" ON public.timetable_entries;
DROP POLICY IF EXISTS "Students can view their timetable" ON public.timetable_entries;

DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to manage their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to assignment files" ON storage.objects;


-- ================================================================================================
-- Section 4: RLS Policies for Each Table
-- ================================================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin());

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.app_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.school_fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_fee_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.school_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_announcements FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.teachers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can view their own profile" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Teachers can update their own profile" ON public.teachers FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Authenticated users can view profile" ON public.students FOR SELECT TO authenticated USING (auth.uid() = auth_user_id OR EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND students.grade_level = ANY(assigned_classes)));

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for admins" ON public.fee_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display::text FROM public.students WHERE auth_user_id = auth.uid()));

ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.student_arrears FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own arrears" ON public.student_arrears FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display::text FROM public.students WHERE auth_user_id = auth.uid()));

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students and Teachers can view assignments for their class" ON public.assignments FOR SELECT TO authenticated USING (class_id::text IN (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id::text = ANY(assigned_classes)));

ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.behavior_incidents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own incident logs" ON public.behavior_incidents FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can view all incidents" ON public.behavior_incidents FOR SELECT TO authenticated USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'teacher');

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.attendance_records FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage attendance for their students" ON public.attendance_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id::text = ANY(assigned_classes))) WITH CHECK (marked_by_teacher_auth_id = auth.uid());
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display::text FROM public.students WHERE auth_user_id = auth.uid()));

ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.academic_results FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own results" ON public.academic_results FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their own published results" ON public.academic_results FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.timetable_entries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own timetable" ON public.timetable_entries FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their timetable" ON public.timetable_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM jsonb_array_elements(periods) AS period WHERE (period->'classNames') ? (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid())::text));


-- ================================================================================================
-- Section 5: Storage Policies
-- ================================================================================================

CREATE POLICY "Allow public read access to school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Allow admin full access to school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND is_admin()) WITH CHECK (bucket_id = 'school-assets' AND is_admin());

CREATE POLICY "Allow public read access to assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Allow teachers to manage their own assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND owner_id = auth.uid()) WITH CHECK (bucket_id = 'assignment-files' AND owner_id = auth.uid());
CREATE POLICY "Allow admin full access to assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND is_admin()) WITH CHECK (bucket_id = 'assignment-files' AND is_admin());
