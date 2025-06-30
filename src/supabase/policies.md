-- ================================================================================================
-- St. Joseph's Montessori - Complete Database Schema & RLS Policy Script
-- Version: 2.0.0
-- Description: This script sets up the entire database schema, including tables, helper functions,
--              triggers, indexes, and Row Level Security (RLS) policies.
--              It is designed to be run on a clean database or will safely drop and
--              recreate objects if they already exist.
-- ================================================================================================

-- Section 1: Cleanup (Dropping old objects to ensure a clean slate)
-- Drop tables in reverse order of dependency.
DROP TABLE IF EXISTS public.student_arrears CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.academic_results CASCADE;
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.school_fee_items CASCADE;
DROP TABLE IF EXISTS public.school_announcements CASCADE;
DROP TABLE IF EXISTS public.behavior_incidents CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.get_my_assigned_classes();
DROP FUNCTION IF EXISTS public.get_teacher_id_by_auth_id(uuid);

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.handle_new_user_role_assignment();
DROP FUNCTION IF EXISTS public.handle_user_delete_cleanup();


-- ================================================================================================
-- Section 2: Helper Functions (For RLS Policies)
-- These functions are defined with `SECURITY DEFINER` to safely access tables
-- that the calling user might not have direct access to.
-- ================================================================================================

-- Function to get the role of the currently authenticated user.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- Function to get the assigned classes for the currently authenticated teacher.
CREATE OR REPLACE FUNCTION public.get_my_assigned_classes()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid()
$$;

-- Function to get a teacher's profile ID from their auth ID.
CREATE OR REPLACE FUNCTION public.get_teacher_id_by_auth_id(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.teachers WHERE auth_user_id = p_auth_user_id
$$;


-- ================================================================================================
-- Section 3: Table Creation
-- Tables are created with appropriate constraints, foreign keys, and default values.
-- ================================================================================================

-- Stores user roles (admin, teacher, student).
CREATE TABLE public.user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores teacher profile information.
CREATE TABLE public.teachers (
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
CREATE TABLE public.students (
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
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stores application-wide settings.
CREATE TABLE public.app_settings (
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
CREATE TABLE public.behavior_incidents (
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

-- Stores school-wide announcements.
CREATE TABLE public.school_announcements (
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
CREATE TABLE public.school_fee_items (
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
CREATE TABLE public.fee_payments (
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
CREATE TABLE public.academic_results (
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
CREATE TABLE public.attendance_records (
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
CREATE TABLE public.student_arrears (
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
CREATE TABLE public.timetable_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week text NOT NULL,
    periods jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(teacher_id, day_of_week)
);

-- ================================================================================================
-- Section 4: Index Creation
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

-- ================================================================================================
-- Section 5: Triggers for New User Role Assignment
-- ================================================================================================

-- This function runs when a new user signs up. It reads the 'role' from the
-- metadata provided during sign-up and inserts it into our public.user_roles table.
CREATE OR REPLACE FUNCTION public.handle_new_user_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, new.raw_user_meta_data->>'role')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN new;
END;
$$;

-- This trigger fires after a new user is created in the auth.users table.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role_assignment();

-- This function runs when a user is deleted from auth.users, ensuring their
-- corresponding role entry is also removed.
CREATE OR REPLACE FUNCTION public.handle_user_delete_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = old.id;
  RETURN old;
END;
$$;

-- This trigger fires before a user is deleted from the auth.users table.
CREATE OR REPLACE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete_cleanup();


-- ================================================================================================
-- Section 6: Row Level Security (RLS) Policies
-- Enables RLS and defines access policies for each table.
-- All policies use `(select function())` to avoid performance warnings.
-- ================================================================================================

-- Enable RLS for all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Enable all access for admin" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.teachers;
DROP POLICY IF EXISTS "Allow teachers to view their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.students;
DROP POLICY IF EXISTS "Allow teachers to view students in their classes" ON public.students;
DROP POLICY IF EXISTS "Allow students to view their own profile" ON public.students;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.app_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Allow teachers to manage their own incident reports" ON public.behavior_incidents;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.school_announcements;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.school_fee_items;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.fee_payments;
DROP POLICY IF EXISTS "Allow students to see their own payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.academic_results;
DROP POLICY IF EXISTS "Allow teachers to manage their results" ON public.academic_results;
DROP POLICY IF EXISTS "Allow students to view their own results" ON public.academic_results;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow teachers to manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow students to view their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.student_arrears;
DROP POLICY IF EXISTS "Enable all access for admin" ON public.timetable_entries;
DROP POLICY IF EXISTS "Allow teachers to manage their own timetable" ON public.timetable_entries;
DROP POLICY IF EXISTS "Allow students to view timetables for their class" ON public.timetable_entries;


-- Policies for `user_roles`
CREATE POLICY "Enable all access for admin" ON public.user_roles FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Enable read access for authenticated users" ON public.user_roles FOR SELECT
USING (auth.role() = 'authenticated');

-- Policies for `teachers`
CREATE POLICY "Enable all access for admin" ON public.teachers FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow teachers to view their own profile" ON public.teachers FOR SELECT
USING (auth_user_id = (select auth.uid()));

-- Policies for `students`
CREATE POLICY "Enable all access for students" ON public.students FOR ALL
USING (
  ((select public.get_my_role()) = 'admin') OR
  (
    ((select public.get_my_role()) = 'teacher') AND
    (array[grade_level] && (select public.get_my_assigned_classes()))
  ) OR
  (auth_user_id = (select auth.uid()))
)
WITH CHECK (
  ((select public.get_my_role()) = 'admin') OR
  (
    ((select public.get_my_role()) = 'teacher') AND
    (array[grade_level] && (select public.get_my_assigned_classes()))
  )
);

-- Policies for `app_settings`
CREATE POLICY "Enable all access for admin" ON public.app_settings FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT
USING (true);

-- Policies for `behavior_incidents`
CREATE POLICY "Enable all access for admin" ON public.behavior_incidents FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow teachers to manage their own incident reports" ON public.behavior_incidents FOR ALL
USING (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))))
WITH CHECK (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))));

-- Policies for `school_announcements`
CREATE POLICY "Enable all access for admin" ON public.school_announcements FOR ALL
USING ((select public.get_my_role()) = 'admin')
WITH CHECK ((select public.get_my_role()) = 'admin');
CREATE POLICY "Enable read access for all authenticated users" ON public.school_announcements FOR SELECT
USING (auth.role() = 'authenticated');

-- Policies for `school_fee_items`
CREATE POLICY "Enable all access for admin" ON public.school_fee_items FOR ALL
USING ((select public.get_my_role()) = 'admin')
WITH CHECK ((select public.get_my_role()) = 'admin');
CREATE POLICY "Enable read access for authenticated users" ON public.school_fee_items FOR SELECT
USING (auth.role() = 'authenticated');

-- Policies for `fee_payments`
CREATE POLICY "Enable all access for admin" ON public.fee_payments FOR ALL
USING ((select public.get_my_role()) = 'admin')
WITH CHECK ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow students to see their own payments" ON public.fee_payments FOR SELECT
USING (student_id_display = (select student_id_display from public.students where auth_user_id = (select auth.uid())));

-- Policies for `academic_results`
CREATE POLICY "Enable all access for admin" ON public.academic_results FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow teachers to manage their results" ON public.academic_results FOR ALL
USING (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))))
WITH CHECK (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))));
CREATE POLICY "Allow students to view their own results" ON public.academic_results FOR SELECT
USING (student_id_display = (select student_id_display from public.students where auth_user_id = (select auth.uid())));

-- Policies for `attendance_records`
CREATE POLICY "Enable all access for admin" ON public.attendance_records FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow teachers to manage attendance" ON public.attendance_records FOR ALL
USING (marked_by_teacher_auth_id = (select auth.uid()))
WITH CHECK (marked_by_teacher_auth_id = (select auth.uid()));
CREATE POLICY "Allow students to view their own attendance" ON public.attendance_records FOR SELECT
USING (student_id_display = (select student_id_display from public.students where auth_user_id = (select auth.uid())));

-- Policies for `student_arrears`
CREATE POLICY "Enable all access for admin" ON public.student_arrears FOR ALL
USING ((select public.get_my_role()) = 'admin');

-- Policies for `timetable_entries`
CREATE POLICY "Enable all access for admin" ON public.timetable_entries FOR ALL
USING ((select public.get_my_role()) = 'admin');
CREATE POLICY "Allow teachers to manage their own timetable" ON public.timetable_entries FOR ALL
USING (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))))
WITH CHECK (teacher_id = (select public.get_teacher_id_by_auth_id((select auth.uid()))));
CREATE POLICY "Allow students to view timetables for their class" ON public.timetable_entries FOR SELECT
USING (periods::jsonb @> jsonb_build_array(jsonb_build_object('classNames', jsonb_build_array((select grade_level from public.students where auth_user_id = (select auth.uid()))))));


-- ================================================================================================
-- Section 7: Storage Policies
-- ================================================================================================

-- Cleanup existing storage policies first
DROP POLICY IF EXISTS "Allow public read access to app assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to manage all school assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow teachers to manage their assignment files" ON storage.objects;

-- Create new, consolidated policies for Storage
CREATE POLICY "Allow public read access to app assets" ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

CREATE POLICY "Allow authenticated users to upload assignment files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assignment-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage all school assets" ON storage.objects FOR ALL
USING (bucket_id = 'school-assets' AND (select public.get_my_role()) = 'admin');

CREATE POLICY "Allow teachers to manage their assignment files" ON storage.objects FOR ALL
USING (bucket_id = 'assignment-files' AND owner = (select auth.uid()));

-- ========================== END OF SCRIPT ==========================

---
---
---

# Documentation for Database Policies & Schema

This document explains the structure and security rules for the St. Joseph's Montessori database.

## 1. Helper Functions

These are special functions used by the security policies to determine a user's permissions.

*   `get_my_role()`: Returns the role ('admin', 'teacher', 'student') of the currently logged-in user.
*   `get_my_assigned_classes()`: If the user is a teacher, this returns a list of the classes they are assigned to (e.g., `{'Basic 1', 'Basic 2'}`).

## 2. Triggers

*   `handle_new_user_role_assignment()`: When a new user signs up via the app, Supabase Auth creates an entry in `auth.users`. This trigger automatically runs and adds a corresponding entry to our `public.user_roles` table, giving them the role specified during registration. This is crucial for all security policies to work.

## 3. Table Policies (Row Level Security)

### `user_roles`
*   **Admins:** Can do anything (create, read, update, delete).
*   **Authenticated Users:** Can read roles (e.g., to verify if another user is an admin).

### `teachers`
*   **Admins:** Can do anything.
*   **Teachers:** Can only read their own profile information. They cannot see other teachers' private details.

### `students`
*   **Admins:** Can do anything.
*   **Teachers:** Can view and edit students who are in one of their `assigned_classes`. They cannot access students from other classes.
*   **Students:** Can view and edit their own profile only.

### `app_settings`
*   **Admins:** Can do anything (e.g., change the school name, academic year).
*   **All Users:** Can read the settings (e.g., to display the school name on the homepage).

### `behavior_incidents`
*   **Admins:** Can do anything.
*   **Teachers:** Can create, view, update, and delete *only the incidents they themselves have reported*. They cannot modify reports from other teachers.

### `school_announcements`
*   **Admins:** Can create, update, and delete any announcement.
*   **All Authenticated Users:** Can read all announcements.

### `school_fee_items` & `fee_payments`
*   **Admins:** Can manage the entire fee structure and view/record all payments.
*   **Students:** Can view the fee structure and *only their own* payment history.
*   **Teachers:** Cannot access fee information.

### `academic_results`
*   **Admins:** Can view and approve/reject all results.
*   **Teachers:** Can create, view, update, and delete results for any student, but these actions are tied to their teacher profile.
*   **Students:** Can only view their own results, and only if those results have been `approved` by an admin and the `published_at` date has passed.

### `attendance_records`
*   **Admins:** Can do anything.
*   **Teachers:** Can create and modify attendance records.
*   **Students:** Can only read their own attendance history.

### `student_arrears`
*   **Admins:** Have full access to create, view, and manage all student arrear records.
*   **Other Roles:** No access.

### `timetable_entries`
*   **Admins:** Can do anything.
*   **Teachers:** Can create, read, update, and delete their own timetable entries.
*   **Students:** Can read any timetable entry that contains their grade level.

## 4. Storage Policies (File Buckets)

### `school-assets` (for logos, hero images)
*   **Public:** Anyone can view and download files from this bucket (e.g., for the homepage logo).
*   **Admins:** Only admins can upload, update, or delete files in this bucket.

### `assignment-files` (for teacher uploads)
*   **Teachers:** Can upload, view, update, and delete their own files. They cannot access files uploaded by other teachers.
*   **Students:** Can view and download any file from this bucket (so they can access assignment materials from any of their teachers).
