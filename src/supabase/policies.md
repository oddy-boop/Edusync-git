-- ================================================================================================
-- St. Joseph's Montessori - Complete Database Schema & RLS Policy Script
-- Version: 3.4.0 (Student Profile Creation Fix)
-- Description: This script sets up the entire database schema, including tables, helper functions,
--              triggers, indexes, and a full set of consolidated, performant RLS policies.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Table Creation
-- Tables are created with appropriate constraints, foreign keys, and default values.
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
    subjects_taught text,
    assigned_classes text[],
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
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
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
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
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
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
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
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name text,
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
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
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
    student_name text,
    class_id text,
    date date NOT NULL,
    status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    notes text,
    marked_by_teacher_auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    marked_by_teacher_name text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(student_id_display, date)
);

-- Stores student fee arrears carried over from previous years.
CREATE TABLE IF NOT EXISTS public.student_arrears (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_display text NOT NULL REFERENCES public.students(student_id_display) ON DELETE CASCADE,
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
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week text NOT NULL,
    periods jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(teacher_id, day_of_week)
);

-- ================================================================================================
-- Section 2: Helper Functions (For RLS Policies)
-- These functions are defined with `SECURITY DEFINER` and a fixed `search_path` to prevent
-- hijacking and ensure they safely access tables.
-- ================================================================================================

-- Function to get the role of the currently authenticated user.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- Function to get the assigned classes for the currently authenticated teacher.
CREATE OR REPLACE FUNCTION public.get_my_assigned_classes()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid()
$$;

-- Function to get a teacher's profile ID (PK) from their auth ID.
CREATE OR REPLACE FUNCTION public.get_teacher_id_by_auth_id(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.teachers WHERE auth_user_id = p_auth_user_id
$$;

-- Function to check if a student's grade level exists in a timetable's periods.
CREATE OR REPLACE FUNCTION public.check_student_in_timetable(p_periods jsonb, p_grade_level text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
    period jsonb;
BEGIN
    IF p_periods IS NULL THEN
        RETURN FALSE;
    END IF;
    FOR period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        IF period->'classNames' @> to_jsonb(p_grade_level) THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    RETURN FALSE;
END;
$$;


-- ================================================================================================
-- Section 3: Index Creation
-- Indexes are created on foreign keys and frequently queried columns to improve performance.
-- ================================================================================================

CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON public.students(grade_level);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_user_id ON public.teachers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id_display);
CREATE INDEX IF NOT EXISTS idx_academic_results_student_id ON public.academic_results(student_id_display);
CREATE INDEX IF NOT EXISTS idx_academic_results_teacher_id ON public.academic_results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_results_approval_status ON public.academic_results(approval_status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id_display);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_student_id ON public.behavior_incidents(student_id_display);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_teacher_id ON public.behavior_incidents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_teacher_id ON public.timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_marked_by_teacher_auth_id ON public.attendance_records(marked_by_teacher_auth_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_received_by_user_id ON public.fee_payments(received_by_user_id);
CREATE INDEX IF NOT EXISTS idx_school_announcements_author_id ON public.school_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_student_arrears_student_id_display ON public.student_arrears(student_id_display);

-- ================================================================================================
-- Section 4: Triggers for New User and Profile Creation
-- ================================================================================================

-- This function runs when a new user signs up. It reads the 'role' from the
-- metadata and creates the corresponding role and profile entries.
CREATE OR REPLACE FUNCTION public.handle_new_user_with_profile_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- 1. Insert into user_roles table
  v_role := new.raw_user_meta_data->>'role';
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 2. Create profile based on role
  IF v_role = 'teacher' THEN
    -- For teachers, the profile is simple and can be created here.
    INSERT INTO public.teachers (auth_user_id, full_name, email)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  ELSIF v_role = 'student' THEN
    -- For students, the registration server action will now handle creating the
    -- full profile since it has all the form data (grade, guardian, etc.).
    -- This trigger will only handle the user_roles entry for students.
    NULL; -- Do nothing here for students.
  END IF;
  
  RETURN new;
END;
$$;

-- Drop trigger if it exists before creating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_with_profile_creation();

-- This function runs when a user is deleted from auth.users, ensuring their
-- corresponding role entry is also removed.
CREATE OR REPLACE FUNCTION public.handle_user_delete_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = old.id;
  RETURN old;
END;
$$;

-- Drop trigger if it exists before creating
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete_cleanup();

-- ================================================================================================
-- Section 5: Storage Bucket Creation
-- ================================================================================================

-- Creates the bucket for public school assets like logos and hero images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Creates the bucket for files attached to assignments by teachers.
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;


-- ================================================================================================
-- Section 6: Row Level Security (RLS) Policies
-- This section enables RLS and creates a single, consolidated, or performant
-- policy for each table to avoid performance warnings and simplify logic.
-- ================================================================================================

-- Drop all old policies to ensure a clean slate
DROP POLICY IF EXISTS "Enable access based on user role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to read their own role and admins to read all" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.teachers;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.teachers;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.students;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.students;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.app_settings;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.assignments;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.fee_payments;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.fee_payments;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.academic_results;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.academic_results;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.student_arrears;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.student_arrears;
DROP POLICY IF EXISTS "Enable access based on user role" ON public.timetable_entries;
DROP POLICY IF EXISTS "Enable insert/update/delete access for admin" ON public.timetable_entries;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Consolidated policy for teachers" ON public.teachers;
DROP POLICY IF EXISTS "Consolidated policy for students" ON public.students;
DROP POLICY IF EXISTS "Consolidated policy for app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Consolidated policy for behavior incidents" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Consolidated policy for assignments" ON public.assignments;
DROP POLICY IF EXISTS "Consolidated policy for school_announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "Consolidated policy for school_fee_items" ON public.school_fee_items;
DROP POLICY IF EXISTS "Consolidated policy for fee_payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Consolidated policy for academic_results" ON public.academic_results;
DROP POLICY IF EXISTS "Consolidated policy for attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Consolidated policy for student_arrears" ON public.student_arrears;
DROP POLICY IF EXISTS "Consolidated policy for timetable_entries" ON public.timetable_entries;

-- Enable RLS for all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- New Consolidated Policies

-- Policies for `user_roles`
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL
  USING ( (SELECT public.get_my_role()) = 'admin' );

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT
  USING ( auth.uid() = user_id );

-- Policies for `teachers`
CREATE POLICY "Consolidated policy for teachers" ON public.teachers
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin') OR (auth_user_id = auth.uid())
  );

-- Policies for `students`
CREATE POLICY "Consolidated policy for students" ON public.students
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Student can read their own profile
      ((select public.get_my_role()) = 'student') AND (auth_user_id = auth.uid())
    )
    OR
    ( -- Teacher can read students in their assigned classes
      ((select public.get_my_role()) = 'teacher') AND (grade_level = ANY(COALESCE((select public.get_my_assigned_classes()), '{}'::text[])))
    )
  )
  WITH CHECK (
    -- Only admins can create/delete. Teachers/Students can update their own notification settings etc.
    ((select public.get_my_role()) = 'admin')
    OR
    (auth_user_id = auth.uid())
  );

-- Policies for `app_settings`
CREATE POLICY "Consolidated policy for app_settings" ON public.app_settings
  FOR ALL
  USING (
    ((select auth.role()) = 'authenticated') -- Anyone logged in can see the settings
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin') -- But only an admin can create/update them
  );

-- Policies for `behavior_incidents`
CREATE POLICY "Consolidated policy for behavior incidents" ON public.behavior_incidents
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can read reports they created
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
    OR
    ( -- Student can read incidents about them
      ((select public.get_my_role()) = 'student') AND (student_id_display = (select s.student_id_display from public.students s where s.auth_user_id = auth.uid()))
    )
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can only create/update/delete their own reports
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
  );

-- Policies for `assignments`
CREATE POLICY "Consolidated policy for assignments" ON public.assignments
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can read all assignments for their assigned classes
      ((select public.get_my_role()) = 'teacher') AND (class_id = ANY (COALESCE((select public.get_my_assigned_classes()), '{}'::text[])))
    )
    OR
    ( -- Student can read assignments for their class
      ((select public.get_my_role()) = 'student') AND (class_id = (select grade_level from public.students where auth_user_id = auth.uid()))
    )
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can only create/update/delete their own
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
  );

-- Policies for `school_announcements`
CREATE POLICY "Consolidated policy for school_announcements" ON public.school_announcements
  FOR ALL
  USING (
    ((select auth.role()) = 'authenticated')
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
  );

--- Policies for `school_fee_items`
CREATE POLICY "Consolidated policy for school_fee_items" ON public.school_fee_items
  FOR ALL
  USING (
    ((select auth.role()) = 'authenticated')
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
  );

-- Policies for `fee_payments`
CREATE POLICY "Consolidated policy for fee_payments" ON public.fee_payments
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Student can read their own payments
      ((select public.get_my_role()) = 'student') AND (student_id_display = (select s.student_id_display from public.students s where s.auth_user_id = auth.uid()))
    )
  )
  WITH CHECK (
    -- Only admins can create/update/delete
    ((select public.get_my_role()) = 'admin')
  );

-- Policies for `academic_results`
CREATE POLICY "Consolidated policy for academic_results" ON public.academic_results
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can read results they created
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
    OR
    ( -- Student can read their own approved and published results
      ((select public.get_my_role()) = 'student') AND (student_id_display = (select s.student_id_display from public.students s where s.auth_user_id = auth.uid()))
      AND (approval_status = 'approved') AND (published_at IS NOT NULL) AND (published_at <= now())
    )
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can only create/update/delete their own
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
  );

-- Policies for `attendance_records`
CREATE POLICY "Consolidated policy for attendance_records" ON public.attendance_records
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can read records for students in their assigned classes
      ((select public.get_my_role()) = 'teacher') AND (class_id = ANY (COALESCE((select public.get_my_assigned_classes()), '{}'::text[])))
    )
    OR
    ( -- Student can read their own attendance
      ((select public.get_my_role()) = 'student') AND (student_id_display = (select s.student_id_display from public.students s where s.auth_user_id = auth.uid()))
    )
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can only create/update/delete records they created
      ((select public.get_my_role()) = 'teacher') AND (marked_by_teacher_auth_id = auth.uid())
    )
  );

-- Policies for `student_arrears`
CREATE POLICY "Consolidated policy for student_arrears" ON public.student_arrears
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Student can read their own arrears
      ((select public.get_my_role()) = 'student') AND (student_id_display = (select s.student_id_display from public.students s where s.auth_user_id = auth.uid()))
    )
  )
  WITH CHECK (
    -- Only admins can create/update/delete
    ((select public.get_my_role()) = 'admin')
  );

-- Policies for `timetable_entries`
CREATE POLICY "Consolidated policy for timetable_entries" ON public.timetable_entries
  FOR ALL
  USING (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can read their own timetable entries
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
    OR
    ( -- Student can read entries for their class
      ((select public.get_my_role()) = 'student') AND ((select public.check_student_in_timetable(periods, (select grade_level from public.students where auth_user_id = auth.uid()))))
    )
  )
  WITH CHECK (
    ((select public.get_my_role()) = 'admin')
    OR
    ( -- Teacher can only create/update/delete their own
      ((select public.get_my_role()) = 'teacher') AND (teacher_id = (select public.get_teacher_id_by_auth_id(auth.uid())))
    )
  );

-- ================================================================================================
-- Section 7: Storage Policies
-- Consolidated and performant policies for file storage buckets.
-- ================================================================================================

-- Create new, consolidated policies for Storage
DROP POLICY IF EXISTS "Allow public read access to app assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to manage school assets" ON storage.objects;

CREATE POLICY "Allow public read access to app assets" ON storage.objects FOR SELECT
USING (
  bucket_id = 'school-assets' OR bucket_id = 'assignment-files'
);

CREATE POLICY "Allow authenticated users to manage assignment files" ON storage.objects FOR ALL
USING (
  bucket_id = 'assignment-files' AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'assignment-files' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow admins to manage school assets" ON storage.objects FOR ALL
USING (
  bucket_id = 'school-assets' AND (select public.get_my_role()) = 'admin'
)
WITH CHECK (
  bucket_id = 'school-assets' AND (select public.get_my_role()) = 'admin'
);
-- ========================== END OF SCRIPT ==========================
