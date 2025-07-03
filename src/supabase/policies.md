-- ================================================================================================
-- St. Joseph's Montessori - Definitive RLS Policy and Schema Fix Script v2
-- Description: This script corrects table column types and sets up all Row Level Security (RLS)
--              policies. It is designed to be run on a database where tables already exist.
--              It drops old policies, alters columns, and re-creates policies in the correct order.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Drop Existing Policies to Allow Schema Changes
-- ================================================================================================
-- This section removes old, potentially incorrect policies so that we can alter the table columns
-- without dependency errors.

DROP POLICY IF EXISTS "Teachers can manage their own incident logs" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;


-- ================================================================================================
-- Section 2: Alter Table Columns to Correct Data Types
-- Description: This fixes the root cause of uuid/text comparison errors by changing text columns
--              that should have been uuids. It also adds the foreign key constraints.
-- ================================================================================================

-- Alter behavior_incidents to use UUID for teacher_id
ALTER TABLE public.behavior_incidents
  ALTER COLUMN teacher_id TYPE uuid USING teacher_id::uuid;
  
-- Alter attendance_records to use UUID for the teacher's auth ID
ALTER TABLE public.attendance_records
  ALTER COLUMN marked_by_teacher_auth_id TYPE uuid USING marked_by_teacher_auth_id::uuid;
  
-- Add foreign key constraints after type alteration
ALTER TABLE public.behavior_incidents 
  ADD CONSTRAINT behavior_incidents_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_records 
  ADD CONSTRAINT attendance_records_marked_by_teacher_auth_id_fkey 
  FOREIGN KEY (marked_by_teacher_auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- ================================================================================================
-- Section 3: Helper Functions (with Security Hardening)
-- Description: These functions are used in the RLS policies. We set the search_path to prevent
--              potential security issues.
-- ================================================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.teachers
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ================================================================================================
-- Section 4: Re-create All RLS Policies with Correct Logic
-- Description: All old policies are dropped and re-created to be simple and correct.
-- ================================================================================================

-- --- Table: user_roles ---
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- Table: app_settings ---
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.app_settings;
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Enable all access for admins" ON public.app_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- Table: school_fee_items ---
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_fee_items;
CREATE POLICY "Enable read access for all users" ON public.school_fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_fee_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- Table: school_announcements ---
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.school_announcements;
CREATE POLICY "Enable read access for all users" ON public.school_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_announcements FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- Table: teachers ---
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can view their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;
CREATE POLICY "Admins have full access" ON public.teachers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can view their own profile" ON public.teachers FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Teachers can update their own profile" ON public.teachers FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- --- Table: students ---
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view profile" ON public.students;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Admins and teachers can view student profiles" ON public.students;
CREATE POLICY "Admins have full access" ON public.students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own profile" ON public.students FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "Admins and teachers can view student profiles" ON public.students FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = auth.uid() AND students.grade_level = ANY(t.assigned_classes)));

-- --- Table: fee_payments ---
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.fee_payments;
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;
CREATE POLICY "Enable all access for admins" ON public.fee_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));

-- --- Table: student_arrears ---
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.student_arrears;
DROP POLICY IF EXISTS "Students can view their own arrears" ON public.student_arrears;
CREATE POLICY "Admins have full access" ON public.student_arrears FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students can view their own arrears" ON public.student_arrears FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));

-- --- Table: assignments ---
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can manage their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students and Teachers can view assignments for their class" ON public.assignments;
CREATE POLICY "Admins have full access" ON public.assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students and Teachers can view assignments for their class" ON public.assignments FOR SELECT TO authenticated USING (class_id IN (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id = ANY(assigned_classes)));

-- --- Table: behavior_incidents (with corrected policy) ---
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can manage their own incident logs" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Teachers can view all incidents" ON public.behavior_incidents;
CREATE POLICY "Admins have full access" ON public.behavior_incidents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own incident logs" ON public.behavior_incidents FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid()); -- Correct: uuid = uuid
CREATE POLICY "Teachers can view all incidents" ON public.behavior_incidents FOR SELECT TO authenticated USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'teacher');

-- --- Table: attendance_records (with corrected policy) ---
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
CREATE POLICY "Admins have full access" ON public.attendance_records FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage attendance for their students" ON public.attendance_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND class_id = ANY(assigned_classes))) WITH CHECK (marked_by_teacher_auth_id = auth.uid()); -- Correct: uuid = uuid
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));

-- --- Table: academic_results ---
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.academic_results;
DROP POLICY IF EXISTS "Teachers can manage their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own published results" ON public.academic_results;
CREATE POLICY "Admins have full access" ON public.academic_results FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own results" ON public.academic_results FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their own published results" ON public.academic_results FOR SELECT TO authenticated USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()) AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now());

-- --- Table: timetable_entries ---
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.timetable_entries;
DROP POLICY IF EXISTS "Teachers can manage their own timetable" ON public.timetable_entries;
DROP POLICY IF EXISTS "Students can view their timetable" ON public.timetable_entries;
CREATE POLICY "Admins have full access" ON public.timetable_entries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own timetable" ON public.timetable_entries FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their timetable" ON public.timetable_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM jsonb_array_elements(periods) AS period WHERE (period->'classNames') ? (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid())));


-- ================================================================================================
-- Section 5: Storage Policies
-- ================================================================================================

-- Drop existing policies first to prevent errors
DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to manage their own assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to assignment files" ON storage.objects;

-- Policies for 'school-assets' bucket (logos, hero images)
CREATE POLICY "Allow public read access to school assets" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');
CREATE POLICY "Allow admin full access to school assets" ON storage.objects FOR ALL USING (bucket_id = 'school-assets' AND is_admin()) WITH CHECK (bucket_id = 'school-assets' AND is_admin());

-- Policies for 'assignment-files' bucket
CREATE POLICY "Allow public read access to assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');
CREATE POLICY "Allow teachers to manage their own assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND owner_id = auth.uid()) WITH CHECK (bucket_id = 'assignment-files' AND owner_id = auth.uid());
CREATE POLICY "Allow admin full access to assignment files" ON storage.objects FOR ALL USING (bucket_id = 'assignment-files' AND is_admin()) WITH CHECK (bucket_id = 'assignment-files' AND is_admin());

-- ========================== END OF SCRIPT ==========================
