-- This script sets up Row Level Security (RLS) for the attendance_records table.
-- Copy and run this entire script in your Supabase project's SQL Editor.
-- Go to: Database -> SQL Editor -> New query

-- Helper function to check if the current user is an admin.
-- This function securely checks the user_roles table.
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Enable RLS on the attendance_records table. This is a required first step.
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing open policies if they exist to ensure our new policies are the only ones.
--    Note: Supabase might create a default "Enable read access for all users" policy.
--    You may need to delete it from the UI if this script doesn't catch it.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can manage attendance for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance records" ON public.attendance_records;


-- 3. Policy for Admins: Admins can do anything.
CREATE POLICY "Enable all access for admins"
ON public.attendance_records FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 4. Policy for Teachers: Allows teachers to fully manage attendance but ONLY for students
--    in the classes they are assigned to in their teacher profile.
CREATE POLICY "Teachers can manage attendance for their students"
ON public.attendance_records FOR ALL
USING (
  -- The user must exist in the teachers table, and the record's class must be in their assigned_classes array.
  EXISTS (
    SELECT 1
    FROM public.teachers
    WHERE teachers.auth_user_id = auth.uid()
    AND attendance_records.class_id = ANY(teachers.assigned_classes)
  )
)
WITH CHECK (
  -- When inserting or updating, the same conditions apply, plus we ensure the teacher is marking it as themselves.
  EXISTS (
    SELECT 1
    FROM public.teachers
    WHERE teachers.auth_user_id = auth.uid()
    AND attendance_records.class_id = ANY(teachers.assigned_classes)
  ) AND attendance_records.marked_by_teacher_auth_id = auth.uid()
);

-- 5. Policy for Students: Allows students to view their own attendance records. They cannot modify them.
CREATE POLICY "Students can view their own attendance records"
ON public.attendance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.auth_user_id = auth.uid()
    AND students.student_id_display = attendance_records.student_id_display
  )
);
