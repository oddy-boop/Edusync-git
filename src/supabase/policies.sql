-- ===============================================================================================
--
--  SECURITY: Row-Level Security (RLS) Policies and Helper Functions
--  DESC:   This script defines all security rules for the application. It includes helper
--          functions to get user roles and permissions, and then uses these functions in RLS
--          policies for each table. It is designed to be re-runnable.
--
-- ===============================================================================================


-- ----------------------------------------
-- HELPER FUNCTIONS
-- These functions are used in RLS policies to check a user's role and permissions.
-- They are defined with `SECURITY DEFINER` to run with the permissions of the function owner.
-- ----------------------------------------

-- ** get_my_role() **
-- Gets the role of the currently authenticated user from the public.user_roles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;


-- ** get_my_teacher_id() **
-- Gets the primary key (id) from the 'teachers' table for the currently authenticated user.
CREATE OR REPLACE FUNCTION public.get_my_teacher_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.teachers WHERE auth_user_id = auth.uid()
$$;


-- ** get_my_assigned_classes() **
-- Gets the array of assigned classes for the currently authenticated teacher.
CREATE OR REPLACE FUNCTION public.get_my_assigned_classes()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid()
$$;

-- ----------------------------------------
-- AUTH.USERS TRIGGER
-- This function runs automatically after a new user signs up.
-- It reads metadata from the sign-up process to assign a role and create a corresponding profile.
-- ----------------------------------------

-- ** handle_new_user() **
-- Trigger function to populate user_roles and create a profile upon new user signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_full_name text;
  user_email text;
BEGIN
  -- Extract role, name, and email from the new user's metadata
  user_role := new.raw_user_meta_data->>'role';
  user_full_name := new.raw_user_meta_data->>'full_name';
  user_email := new.email;

  -- Insert into user_roles table
  -- ON CONFLICT clause makes this operation robust against re-runs or race conditions.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Create a profile based on the role
  IF user_role = 'teacher' THEN
    INSERT INTO public.teachers (auth_user_id, full_name, email)
    VALUES (new.id, user_full_name, user_email);
  ELSIF user_role = 'student' THEN
    INSERT INTO public.students (auth_user_id, full_name, contact_email, student_id_display)
    VALUES (new.id, user_full_name, user_email, new.raw_user_meta_data->>'student_id_display');
  END IF;

  RETURN new;
END;
$$;

-- ** on_auth_user_created Trigger **
-- Attaches the function to the auth.users table to run after a new user is inserted.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===============================================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
--
-- For each table, we first DROP any existing policy to ensure this script is re-runnable.
-- Then, we ENABLE RLS on the table.
-- Finally, we CREATE a single, consolidated policy for ALL actions.
--
-- Performance Note: All calls to helper functions are wrapped in a `(SELECT ...)` subquery.
-- This prevents the function from being re-evaluated for every row, fixing performance issues.
--
-- ===============================================================================================


-- ----------------------------------------
-- Table: app_settings
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to read, admins to modify" ON public.app_settings;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read, admins to modify" ON public.app_settings
FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: user_roles
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow admins full access, users to see their own role" ON public.user_roles;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins full access, users to see their own role" ON public.user_roles
FOR ALL
USING ( ((SELECT public.get_my_role()) = 'admin') OR (user_id = auth.uid()) )
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: teachers
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow admins full access, teachers to manage their own profile" ON public.teachers;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins full access, teachers to manage their own profile" ON public.teachers
FOR ALL
USING ( ((SELECT public.get_my_role()) = 'admin') OR (auth.role() = 'authenticated') )
WITH CHECK ( ((SELECT public.get_my_role()) = 'admin') OR (auth_user_id = auth.uid()) );


-- ----------------------------------------
-- Table: students
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.students;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.students
FOR ALL
USING (
  ( (SELECT public.get_my_role()) = 'admin' ) OR
  (
    ( (SELECT public.get_my_role()) = 'teacher' ) AND
    ( ARRAY[grade_level] && (SELECT public.get_my_assigned_classes()) )
  ) OR
  ( auth_user_id = auth.uid() )
)
WITH CHECK (
  ( (SELECT public.get_my_role()) = 'admin' ) OR
  (
    ( (SELECT public.get_my_role()) = 'teacher' ) AND
    ( ARRAY[grade_level] && (SELECT public.get_my_assigned_classes()) )
  ) OR
  ( auth_user_id = auth.uid() )
);


-- ----------------------------------------
-- Table: school_announcements
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow admins full access, authenticated users to read" ON public.school_announcements;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins full access, authenticated users to read" ON public.school_announcements
FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: school_fee_items
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow admins full access, authenticated users to read" ON public.school_fee_items;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admins full access, authenticated users to read" ON public.school_fee_items
FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: fee_payments
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.fee_payments;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.fee_payments
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( student_id_display IN (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) )
)
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: behavior_incidents
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.behavior_incidents;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.behavior_incidents
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = auth.uid() ) OR
    ( student_id_display IN (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) )
)
WITH CHECK (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = auth.uid() )
);


-- ----------------------------------------
-- Table: assignments
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.assignments;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.assignments
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = (SELECT public.get_my_teacher_id()) ) OR
    ( class_id IN (SELECT s.grade_level FROM public.students s WHERE s.auth_user_id = auth.uid()) )
)
WITH CHECK (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = (SELECT public.get_my_teacher_id()) )
);


-- ----------------------------------------
-- Table: attendance_records
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.attendance_records;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.attendance_records
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( marked_by_teacher_auth_id = auth.uid() ) OR
    ( student_id_display IN (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) )
)
WITH CHECK (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( marked_by_teacher_auth_id = auth.uid() )
);


-- ----------------------------------------
-- Table: academic_results
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.academic_results;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.academic_results
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = (SELECT public.get_my_teacher_id()) ) OR
    (
        ( student_id_display IN (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) ) AND
        ( approval_status = 'approved' ) AND
        ( published_at <= now() )
    )
)
WITH CHECK (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = (SELECT public.get_my_teacher_id()) )
);


-- ----------------------------------------
-- Table: student_arrears
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.student_arrears;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.student_arrears
FOR ALL
USING (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( student_id_display IN (SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()) )
)
WITH CHECK ( (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Table: timetable_entries
-- ----------------------------------------
DROP POLICY IF EXISTS "Enable access based on user role" ON public.timetable_entries;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access based on user role" ON public.timetable_entries
FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK (
    ( (SELECT public.get_my_role()) = 'admin' ) OR
    ( teacher_id = (SELECT public.get_my_teacher_id()) )
);


-- ===============================================================================================
-- STORAGE POLICIES
-- These policies control access to files in Supabase Storage.
-- ===============================================================================================

-- ----------------------------------------
-- Bucket: school-assets (for logos, hero images, etc.)
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow public read access to school assets" ON storage.objects;
CREATE POLICY "Allow public read access to school assets" ON storage.objects
FOR SELECT
USING ( bucket_id = 'school-assets' );

DROP POLICY IF EXISTS "Allow admins to upload school assets" ON storage.objects;
CREATE POLICY "Allow admins to upload school assets" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'school-assets' AND (SELECT public.get_my_role()) = 'admin' );

DROP POLICY IF EXISTS "Allow admins to update school assets" ON storage.objects;
CREATE POLICY "Allow admins to update school assets" ON storage.objects
FOR UPDATE
USING ( bucket_id = 'school-assets' AND (SELECT public.get_my_role()) = 'admin' );

DROP POLICY IF EXISTS "Allow admins to delete school assets" ON storage.objects;
CREATE POLICY "Allow admins to delete school assets" ON storage.objects
FOR DELETE
USING ( bucket_id = 'school-assets' AND (SELECT public.get_my_role()) = 'admin' );


-- ----------------------------------------
-- Bucket: assignment-files
-- ----------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users to read assignment files" ON storage.objects;
CREATE POLICY "Allow authenticated users to read assignment files" ON storage.objects
FOR SELECT
USING ( bucket_id = 'assignment-files' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Allow teachers to upload assignment files" ON storage.objects;
CREATE POLICY "Allow teachers to upload assignment files" ON storage.objects
FOR INSERT
WITH CHECK ( bucket_id = 'assignment-files' AND (SELECT public.get_my_role()) = 'teacher' );

DROP POLICY IF EXISTS "Allow owner teachers to update assignment files" ON storage.objects;
CREATE POLICY "Allow owner teachers to update assignment files" ON storage.objects
FOR UPDATE
USING ( bucket_id = 'assignment-files' AND (SELECT public.get_my_role()) = 'teacher' AND owner_id = (SELECT public.get_my_teacher_id()) );

DROP POLICY IF EXISTS "Allow owner teachers to delete assignment files" ON storage.objects;
CREATE POLICY "Allow owner teachers to delete assignment files" ON storage.objects
FOR DELETE
USING ( bucket_id = 'assignment-files' AND (SELECT public.get_my_role()) = 'teacher' AND owner_id = (SELECT public.get_my_teacher_id()) );
