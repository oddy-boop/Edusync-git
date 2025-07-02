-- ================================================================================================
-- St. Joseph's Montessori - Step 1: Table Creation
-- Description: This script creates all necessary tables for the application to run.
--              It is the first step in setting up a new database.
-- ================================================================================================

-- Stores user roles (admin, teacher, student).
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores teacher profile information.
CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    contact_number text,
    subjects_taught text[] NOT NULL DEFAULT ARRAY[]::text[],
    assigned_classes text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores student profile information.
CREATE TABLE IF NOT EXISTS public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id_display text UNIQUE NOT NULL,
    full_name text NOT NULL,
    date_of_birth date,
    grade_level text,
    guardian_name text,
    guardian_contact text,
    contact_email text,
    total_paid_override numeric,
    notification_preferences jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores application-wide settings.
CREATE TABLE IF NOT EXISTS public.app_settings (
    id smallint PRIMARY KEY CHECK (id = 1),
    current_academic_year text NOT NULL,
    school_name text NOT NULL,
    school_slogan text,
    school_address text,
    school_phone text,
    school_email text,
    school_logo_url text,
    school_hero_image_url text,
    enable_email_notifications boolean DEFAULT true,
    email_footer_signature text,
    updated_at timestamptz DEFAULT now()
);

-- Stores behavior incidents reported by teachers.
CREATE TABLE IF NOT EXISTS public.behavior_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    class_id text,
    teacher_id uuid NOT NULL,
    teacher_name text,
    type text,
    description text NOT NULL,
    date date NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores assignments created by teachers.
CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    teacher_name text NOT NULL,
    class_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date date,
    file_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores school-wide announcements.
CREATE TABLE IF NOT EXISTS public.school_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    target_audience text NOT NULL CHECK (target_audience IN ('All', 'Students', 'Teachers')),
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name text,
    published_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Defines the fee structure for different grades and terms.
CREATE TABLE IF NOT EXISTS public.school_fee_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level text NOT NULL,
    term text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL CHECK (amount >= 0),
    academic_year text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(grade_level, term, description, academic_year)
);

-- Records individual fee payments made by students.
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id_display text UNIQUE NOT NULL,
    student_id_display text NOT NULL,
    student_name text,
    grade_level text,
    amount_paid numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text,
    term_paid_for text,
    notes text,
    received_by_name text,
    received_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Stores academic results for students.
CREATE TABLE IF NOT EXISTS public.academic_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
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
    published_at timestamptz,
    requested_published_at timestamptz,
    approval_status text NOT NULL,
    admin_remarks text,
    approval_timestamp timestamptz,
    approved_by_admin_auth_id uuid,
    attendance_summary jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores daily attendance records for students.
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL,
    student_name text,
    class_id text,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes text,
    marked_by_teacher_auth_id uuid NOT NULL,
    marked_by_teacher_name text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(student_id_display, date)
);

-- Stores student fee arrears carried over from previous years.
CREATE TABLE IF NOT EXISTS public.student_arrears (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL,
    student_name text,
    grade_level_at_arrear text,
    academic_year_from text,
    academic_year_to text,
    amount numeric NOT NULL,
    status text,
    notes text,
    created_by_user_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores timetable entries created by teachers.
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    day_of_week text NOT NULL,
    periods jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(teacher_id, day_of_week)
);

-- ================================================================================================
-- Section 2: Storage Bucket Creation
-- ================================================================================================

-- Creates the bucket for public school assets like logos and hero images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Creates the bucket for files attached to assignments by teachers.
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;

-- ========================== END OF SCRIPT ==========================
