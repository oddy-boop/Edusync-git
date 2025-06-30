-- ===============================================================================================
--
--  SCHEMA: Complete Table Definitions
--  DESC:   This script creates all necessary tables, relationships (foreign keys), and
--          performance-enhancing indexes for the St. Joseph's Montessori application.
--          It is designed to be run on a clean database.
--
-- ===============================================================================================

-- ----------------------------------------
-- TABLE: user_roles
-- DESC:  Associates an authenticated user (from auth.users) with a specific role in the app.
-- ----------------------------------------
CREATE TABLE public.user_roles (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.user_roles IS 'Maps user UUIDs to their application-specific roles (admin, teacher, student).';

-- ----------------------------------------
-- TABLE: app_settings
-- DESC:  Stores global configuration for the application.
-- ----------------------------------------
CREATE TABLE public.app_settings (
    id smallint PRIMARY KEY DEFAULT 1,
    current_academic_year text NOT NULL DEFAULT '2024-2025',
    school_name text NOT NULL DEFAULT 'St. Joseph''s Montessori',
    school_address text,
    school_phone text,
    school_email text,
    school_logo_url text,
    school_hero_image_url text,
    enable_email_notifications boolean NOT NULL DEFAULT true,
    email_footer_signature text,
    school_slogan text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_settings_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.app_settings IS 'Global configuration settings for the school application, limited to a single row.';

-- ----------------------------------------
-- TABLE: teachers
-- DESC:  Stores profile information for teachers, linked to their auth user.
-- ----------------------------------------
CREATE TABLE public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    contact_number text,
    subjects_taught text,
    assigned_classes text[] DEFAULT ARRAY[]::text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.teachers IS 'Profile information for teachers.';
-- Index for performance when querying by auth_user_id
CREATE INDEX idx_teachers_auth_user_id ON public.teachers(auth_user_id);


-- ----------------------------------------
-- TABLE: students
-- DESC:  Stores profile information for students, linked to their auth user.
-- ----------------------------------------
CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id_display text NOT NULL UNIQUE,
    full_name text NOT NULL,
    date_of_birth date,
    grade_level text,
    guardian_name text,
    guardian_contact text,
    contact_email text UNIQUE,
    notification_preferences jsonb DEFAULT '{"enableAssignmentSubmissionEmails": true, "enableSchoolAnnouncementEmails": true}',
    total_paid_override numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.students IS 'Profile information for students.';
-- Indexes for performance
CREATE INDEX idx_students_auth_user_id ON public.students(auth_user_id);
CREATE INDEX idx_students_grade_level ON public.students(grade_level);


-- ----------------------------------------
-- TABLE: school_announcements
-- DESC:  Stores school-wide announcements.
-- ----------------------------------------
CREATE TABLE public.school_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name text,
    title text NOT NULL,
    message text NOT NULL,
    target_audience text NOT NULL CHECK (target_audience IN ('All', 'Students', 'Teachers')),
    published_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.school_announcements IS 'Stores school-wide announcements targeted to specific roles.';


-- ----------------------------------------
-- TABLE: school_fee_items
-- DESC:  Defines individual fee items for specific grade levels, terms, and academic years.
-- ----------------------------------------
CREATE TABLE public.school_fee_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level text NOT NULL,
    term text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL CHECK (amount >= 0),
    academic_year text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.school_fee_items IS 'Defines individual fee items for different grades and terms.';
-- Index for performance
CREATE INDEX idx_school_fee_items_grade_level_academic_year ON public.school_fee_items(grade_level, academic_year);


-- ----------------------------------------
-- TABLE: fee_payments
-- DESC:  Logs all fee payments made by students.
-- ----------------------------------------
CREATE TABLE public.fee_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id_display text NOT NULL UNIQUE,
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    grade_level text,
    amount_paid numeric NOT NULL CHECK (amount_paid >= 0),
    payment_date date NOT NULL,
    payment_method text,
    term_paid_for text,
    notes text,
    received_by_name text,
    received_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fee_payments IS 'Logs all fee payments made by students.';
-- Index for performance
CREATE INDEX idx_fee_payments_student_id_display ON public.fee_payments(student_id_display);


-- ----------------------------------------
-- TABLE: behavior_incidents
-- DESC:  Logs student behavior incidents reported by teachers.
-- ----------------------------------------
CREATE TABLE public.behavior_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    class_id text,
    teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    teacher_name text,
    type text NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.behavior_incidents IS 'Logs student behavior incidents.';
-- Indexes for performance
CREATE INDEX idx_behavior_incidents_student_id_display ON public.behavior_incidents(student_id_display);
CREATE INDEX idx_behavior_incidents_teacher_id ON public.behavior_incidents(teacher_id);


-- ----------------------------------------
-- TABLE: assignments
-- DESC:  Stores assignments created by teachers for specific classes.
-- ----------------------------------------
CREATE TABLE public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name text,
    class_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date date,
    file_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.assignments IS 'Stores assignments created by teachers.';
-- Indexes for performance
CREATE INDEX idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX idx_assignments_class_id ON public.assignments(class_id);


-- ----------------------------------------
-- TABLE: attendance_records
-- DESC:  Logs daily attendance for each student.
-- ----------------------------------------
CREATE TABLE public.attendance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    class_id text NOT NULL,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes text,
    marked_by_teacher_auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    marked_by_teacher_name text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(student_id_display, date)
);
COMMENT ON TABLE public.attendance_records IS 'Daily student attendance records.';
-- Indexes for performance
CREATE INDEX idx_attendance_records_student_id_display ON public.attendance_records(student_id_display);
CREATE INDEX idx_attendance_records_class_id_date ON public.attendance_records(class_id, date);


-- ----------------------------------------
-- TABLE: academic_results
-- DESC:  Stores terminal academic results for students.
-- ----------------------------------------
CREATE TABLE public.academic_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name text,
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    class_id text NOT NULL,
    term text NOT NULL,
    year text NOT NULL,
    subject_results jsonb,
    overall_average text,
    overall_grade text,
    overall_remarks text,
    attendance_summary jsonb,
    approval_status text NOT NULL DEFAULT 'pending',
    approved_by_admin_auth_id uuid REFERENCES auth.users(id),
    approval_timestamp timestamp with time zone,
    admin_remarks text,
    published_at timestamp with time zone,
    requested_published_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.academic_results IS 'Stores terminal academic results for students.';
-- Indexes for performance
CREATE INDEX idx_academic_results_student_id_display ON public.academic_results(student_id_display);
CREATE INDEX idx_academic_results_teacher_id ON public.academic_results(teacher_id);


-- ----------------------------------------
-- TABLE: student_arrears
-- DESC:  Logs outstanding fee balances carried over from previous academic years.
-- ----------------------------------------
CREATE TABLE public.student_arrears (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    grade_level_at_arrear text,
    academic_year_from text,
    academic_year_to text,
    amount numeric NOT NULL CHECK (amount >= 0),
    status text NOT NULL DEFAULT 'outstanding',
    notes text,
    created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.student_arrears IS 'Logs outstanding student fee balances from previous years.';
-- Index for performance
CREATE INDEX idx_student_arrears_student_id_display ON public.student_arrears(student_id_display);


-- ----------------------------------------
-- TABLE: timetable_entries
-- DESC:  Stores weekly timetable schedules created by teachers.
-- ----------------------------------------
CREATE TABLE public.timetable_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week text NOT NULL,
    periods jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(teacher_id, day_of_week)
);
COMMENT ON TABLE public.timetable_entries IS 'Weekly timetable entries created by teachers.';
-- Index for performance
CREATE INDEX idx_timetable_entries_teacher_id ON public.timetable_entries(teacher_id);
