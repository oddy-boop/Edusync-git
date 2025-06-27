-- This script sets up Row Level Security (RLS) for the attendance_records table.
-- It ensures that users can only access the data they are permitted to see.

-- 1. (Optional) Create a helper function to check if the user is an admin.
-- This function assumes you have a 'user_roles' table with 'user_id' (matching auth.uid()) and 'role' columns.
-- Run this if you don't have this function from previous migrations.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;


-- 2. Enable RLS on the attendance_records table.
-- This must be enabled for any policies to take effect.
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;


-- 3. Drop existing policies on the table to ensure a clean setup.
-- This prevents conflicts with any old or default policies.
DROP POLICY IF EXISTS "Users can view relevant attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can create attendance records for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can update attendance records for their students" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers can delete attendance records for their students" ON public.attendance_records;


-- 4. Create new, more comprehensive policies.

-- SELECT (VIEW) POLICY:
-- Defines who can see which attendance records.
CREATE POLICY "Users can view relevant attendance records"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  -- Admins can see all records.
  is_admin()
  OR
  -- Students can see their own records by matching their auth ID to the students table.
  (student_id_display IN (
    SELECT s.student_id_display FROM public.students s WHERE s.auth_user_id = auth.uid()
  ))
  OR
  -- Teachers can see records for students in any of their assigned classes.
  (class_id IN (
    SELECT unnest(t.assigned_classes) FROM public.teachers t WHERE t.auth_user_id = auth.uid()
  ))
);


-- INSERT (CREATE) POLICY:
-- Defines who can create new attendance records.
CREATE POLICY "Teachers can create attendance records for their students"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() -- Admins can insert any record.
  OR
  -- Teachers can insert records if:
  -- 1. They are marking the attendance as themselves.
  -- 2. The class of the student is one of the classes they are assigned to.
  (
    (marked_by_teacher_auth_id = auth.uid()) AND
    (class_id IN (
      SELECT unnest(t.assigned_classes) FROM public.teachers t WHERE t.auth_user_id = auth.uid()
    ))
  )
);


-- UPDATE POLICY:
-- Defines who can change existing attendance records.
CREATE POLICY "Teachers can update attendance records for their students"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (
  -- Admins can update any record.
  is_admin()
  OR
  -- Any teacher assigned to the student's class can update the record (allows for substitutes).
  (class_id IN (
      SELECT unnest(t.assigned_classes) FROM public.teachers t WHERE t.auth_user_id = auth.uid()
  ))
)
WITH CHECK (
  -- When updating, the teacher must still be assigned to the class and mark it as themselves.
  is_admin()
  OR
  (
    (marked_by_teacher_auth_id = auth.uid()) AND
    (class_id IN (
      SELECT unnest(t.assigned_classes) FROM public.teachers t WHERE t.auth_user_id = auth.uid()
    ))
  )
);


-- DELETE POLICY:
-- Defines who can delete attendance records.
CREATE POLICY "Teachers can delete attendance records for their students"
ON public.attendance_records FOR DELETE
TO authenticated
USING (
  -- Admins can delete any record.
  is_admin()
  OR
  -- Any teacher assigned to the student's class can delete the record.
  (class_id IN (
      SELECT unnest(t.assigned_classes) FROM public.teachers t WHERE t.auth_user_id = auth.uid()
  ))
);
