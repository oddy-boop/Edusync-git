
-- ================================================================================================
-- St. Joseph's Montessori - Definitive RLS Policy and Schema Fix Script v2.8
-- Description: This script corrects table column types, sets up all Row Level Security (RLS)
--              policies, and adds columns to the app_settings table for website content management.
-- v2.8 Change: Adds text columns to `app_settings` for dynamic website content.
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

-- Alter behavior_incidents to use UUID for teacher_id and point it to the teachers table PK
ALTER TABLE public.behavior_incidents
  ALTER COLUMN teacher_id TYPE uuid USING teacher_id::uuid;
-- Drop existing FK if it points to auth.users (from previous versions of this script)
ALTER TABLE public.behavior_incidents DROP CONSTRAINT IF EXISTS behavior_incidents_teacher_id_fkey;
-- Add foreign key constraint to point to public.teachers table's primary key
ALTER TABLE public.behavior_incidents 
  ADD CONSTRAINT behavior_incidents_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;
  
-- Alter attendance_records to use UUID for the teacher's auth ID
ALTER TABLE public.attendance_records
  ALTER COLUMN marked_by_teacher_auth_id TYPE uuid USING marked_by_teacher_auth_id::uuid;
  
-- Add foreign key constraints after type alteration
ALTER TABLE public.attendance_records 
  ADD CONSTRAINT attendance_records_marked_by_teacher_auth_id_fkey 
  FOREIGN KEY (marked_by_teacher_auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- NEW in v2.8: Add columns to app_settings for website content management
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS school_slogan TEXT,
  ADD COLUMN IF NOT EXISTS about_history_mission TEXT,
  ADD COLUMN IF NOT EXISTS about_vision TEXT,
  ADD COLUMN IF NOT EXISTS about_core_values TEXT;

-- ================================================================================================
-- Section 3: Helper Functions (with Security Hardening)
-- Description: These functions are used in the RLS policies. We set the search_path to prevent
--              potential security issues.
-- ================================================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
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

-- --- Table: user_roles (Corrected non-recursive policies) ---
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Drop old policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Policy 1: Authenticated users can SELECT their own role record.
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Admins can manage (INSERT, UPDATE, DELETE) all user roles.
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
  
-- Policy 3: An admin can also SELECT all roles (in addition to their own from Policy 1).
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (is_admin());


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
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Students can view their own payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.fee_payments;

-- Policy 1: The server (using the service_role key) can do anything. This is for server actions and webhooks.
CREATE POLICY "Service role can manage all payments" ON public.fee_payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 2: Logged-in admins can do anything.
CREATE POLICY "Admins have full access to payments" ON public.fee_payments
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 3: Students can only read their own payment records.
CREATE POLICY "Students can view their own payments" ON public.fee_payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.auth_user_id = auth.uid() AND s.student_id_display = public.fee_payments.student_id_display
  ));


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
-- Corrected to use get_teacher_id(), which returns the PK from the teachers table. This makes it consistent with other tables.
CREATE POLICY "Teachers can manage their own incident logs" ON public.behavior_incidents FOR ALL TO authenticated USING (teacher_id = get_teacher_id()) WITH CHECK (teacher_id = get_teacher_id());
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

-- ================================================================================================
-- Section 6: Feature Enhancements (Run these as new features are added)
-- Description: These are ALTER statements for adding new features.
-- ================================================================================================

-- Add 'is_viewed_by_admin' column to track new behavior incidents (v2.6)
ALTER TABLE public.behavior_incidents
ADD COLUMN IF NOT EXISTS is_viewed_by_admin BOOLEAN DEFAULT FALSE;

-- ========================== END OF SCRIPT ==========================
