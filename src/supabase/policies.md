-- ================================================================================================
-- St. Joseph's Montessori - Step 1: Table Definitions
-- Description: This script creates all the necessary tables for the application.
-- It should be run on a new, empty database.
-- ================================================================================================

-- Table to store user roles (e.g., admin, teacher)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student'))
);
COMMENT ON TABLE public.user_roles IS 'Stores the role for each authenticated user.';

-- Table for application-wide settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id smallint PRIMARY KEY DEFAULT 1,
    current_academic_year text,
    school_name text,
    school_address text,
    school_phone text,
    school_email text,
    school_logo_url text,
    school_hero_image_url text,
    enable_email_notifications boolean DEFAULT true,
    email_footer_signature text,
    school_slogan text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT id_check CHECK (id = 1)
);
COMMENT ON TABLE public.app_settings IS 'Stores global configuration settings for the application.';

-- Table for teacher profiles
CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    contact_number text,
    subjects_taught text[],
    assigned_classes text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.teachers IS 'Stores profile information for teachers.';

-- Table for student profiles
CREATE TABLE IF NOT EXISTS public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    student_id_display text UNIQUE NOT NULL,
    full_name text NOT NULL,
    date_of_birth date,
    grade_level text,
    guardian_name text,
    guardian_contact text,
    contact_email text,
    notification_preferences jsonb,
    total_paid_override numeric(10, 2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.students IS 'Stores profile information for students.';

-- Table for school fee structure
CREATE TABLE IF NOT EXISTS public.school_fee_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level text NOT NULL,
    term text NOT NULL,
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    academic_year text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(grade_level, term, description, academic_year)
);
COMMENT ON TABLE public.school_fee_items IS 'Defines individual fee items for each grade, term, and year.';

-- Table for fee payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id_display text UNIQUE NOT NULL,
    student_id_display text NOT NULL,
    student_name text,
    grade_level text,
    amount_paid numeric(10, 2) NOT NULL,
    payment_date date NOT NULL,
    payment_method text,
    term_paid_for text,
    notes text,
    received_by_name text,
    received_by_user_id uuid,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.fee_payments IS 'Logs all fee payments made by students.';

-- Table for student arrears
CREATE TABLE IF NOT EXISTS public.student_arrears (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL,
    student_name text,
    grade_level_at_arrear text,
    academic_year_from text NOT NULL,
    academic_year_to text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    status text DEFAULT 'outstanding',
    notes text,
    created_by_user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.student_arrears IS 'Tracks outstanding fee balances carried over from previous years.';

-- Table for school announcements
CREATE TABLE IF NOT EXISTS public.school_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    target_audience text NOT NULL,
    author_id uuid,
    author_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    published_at timestamptz
);
COMMENT ON TABLE public.school_announcements IS 'Stores school-wide announcements.';

-- Table for assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name text,
    class_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date date,
    file_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.assignments IS 'Stores assignments created by teachers for classes.';

-- Table for student behavior incidents
CREATE TABLE IF NOT EXISTS public.behavior_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL,
    student_name text,
    class_id text,
    teacher_id uuid REFERENCES auth.users(id),
    teacher_name text,
    type text NOT NULL,
    description text,
    date date NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.behavior_incidents IS 'Logs student behavior incidents recorded by teachers.';

-- Table for daily attendance records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL,
    student_name text,
    class_id text,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes text,
    marked_by_teacher_auth_id uuid REFERENCES auth.users(id),
    marked_by_teacher_name text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id_display, date)
);
COMMENT ON TABLE public.attendance_records IS 'Stores daily attendance records for students.';

-- Table for academic results
CREATE TABLE IF NOT EXISTS public.academic_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
    teacher_name text,
    student_id_display text NOT NULL,
    student_name text,
    class_id text,
    term text,
    year text,
    subject_results jsonb,
    overall_average text,
    overall_grade text,
    overall_remarks text,
    attendance_summary jsonb,
    approval_status text DEFAULT 'pending',
    approved_by_admin_auth_id uuid,
    approval_timestamp timestamptz,
    admin_remarks text,
    published_at timestamptz,
    requested_published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.academic_results IS 'Stores academic results for students for each term.';

-- Table for teacher timetables
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week text NOT NULL,
    periods jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(teacher_id, day_of_week)
);
COMMENT ON TABLE public.timetable_entries IS 'Stores timetable schedules for teachers.';


-- ================================================================================================
-- Section 2: Drop Existing Policies (for a clean slate)
-- ================================================================================================

-- Drop policies for all tables to ensure a fresh start
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
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
-- Section 3: Helper Functions (Required for Policies)
-- ================================================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.teachers
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


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
