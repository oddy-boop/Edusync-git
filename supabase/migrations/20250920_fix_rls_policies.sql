-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "schools_select" ON schools;
DROP POLICY IF EXISTS "schools_insert" ON schools;
DROP POLICY IF EXISTS "schools_update" ON schools;
DROP POLICY IF EXISTS "schools_delete" ON schools;

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create policies for schools table
-- Super admins can see all schools
CREATE POLICY "schools_super_admin_select" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can only see their own school
CREATE POLICY "schools_admin_select" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.school_id = schools.id
      AND admins.role = 'school_admin'
    )
  );

-- Super admins can insert new schools
CREATE POLICY "schools_super_admin_insert" ON schools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Super admins can update any school
CREATE POLICY "schools_super_admin_update" ON schools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can update their own school
CREATE POLICY "schools_admin_update" ON schools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.school_id = schools.id
      AND admins.role = 'school_admin'
    )
  );

-- Only super admins can delete schools
CREATE POLICY "schools_super_admin_delete" ON schools
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Grant basic access to authenticated users
GRANT SELECT ON schools TO authenticated;
GRANT INSERT, UPDATE, DELETE ON schools TO authenticated;

-- User Roles Policies
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can see their own roles
CREATE POLICY "user_roles_user_select" ON user_roles
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Super admins can see all user roles
CREATE POLICY "user_roles_super_admin_select" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can see roles for their school
CREATE POLICY "user_roles_school_admin_select" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'school_admin'
      AND admins.school_id = user_roles.school_id
    )
  );

-- Only super admins can insert user roles
CREATE POLICY "user_roles_super_admin_insert" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Only super admins can update user roles
CREATE POLICY "user_roles_super_admin_update" ON user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Only super admins can delete user roles
CREATE POLICY "user_roles_super_admin_delete" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Grant basic access to authenticated users
GRANT SELECT ON user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_roles TO authenticated;

-- Students Policies
DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_delete" ON students;

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Super admins can see all students
CREATE POLICY "students_super_admin_select" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can see students in their school
CREATE POLICY "students_school_admin_select" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'school_admin'
      AND admins.school_id = students.school_id
    )
  );

-- Teachers can see their students
CREATE POLICY "students_teacher_select" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.auth_user_id = auth.uid()
      AND teachers.school_id = students.school_id
    )
  );

-- Students can see their own records
CREATE POLICY "students_self_select" ON students
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );

-- School admins can insert students for their school
CREATE POLICY "students_school_admin_insert" ON students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'school_admin'
      AND admins.school_id = students.school_id
    )
  );

-- Super admins can insert students
CREATE POLICY "students_super_admin_insert" ON students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can update students in their school
CREATE POLICY "students_school_admin_update" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'school_admin'
      AND admins.school_id = students.school_id
    )
  );

-- Super admins can update any student
CREATE POLICY "students_super_admin_update" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Only super admins can delete students
CREATE POLICY "students_super_admin_delete" ON students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Teachers Policies
DROP POLICY IF EXISTS "teachers_select" ON teachers;
DROP POLICY IF EXISTS "teachers_insert" ON teachers;
DROP POLICY IF EXISTS "teachers_update" ON teachers;
DROP POLICY IF EXISTS "teachers_delete" ON teachers;

-- Enable RLS on teachers table
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Super admins can see all teachers
CREATE POLICY "teachers_super_admin_select" ON teachers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- School admins can see teachers in their school
CREATE POLICY "teachers_school_admin_select" ON teachers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'school_admin'
      AND admins.school_id = teachers.school_id
    )
  );

-- Teachers can see their own records and other teachers in their school
CREATE POLICY "teachers_self_and_school_select" ON teachers
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    EXISTS (
      SELECT 1 FROM teachers as t
      WHERE t.auth_user_id = auth.uid()
      AND t.school_id = teachers.school_id
    )
  );

-- Only super admins and school admins can insert teachers
CREATE POLICY "teachers_admin_insert" ON teachers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND (admins.role = 'super_admin' OR
           (admins.role = 'school_admin' AND admins.school_id = teachers.school_id))
    )
  );

-- Only super admins and school admins can update teachers
CREATE POLICY "teachers_admin_update" ON teachers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND (admins.role = 'super_admin' OR
           (admins.role = 'school_admin' AND admins.school_id = teachers.school_id))
    )
  );

-- Only super admins can delete teachers
CREATE POLICY "teachers_super_admin_delete" ON teachers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Grant basic access to authenticated users
GRANT SELECT ON students TO authenticated;
GRANT INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT SELECT ON teachers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON teachers TO authenticated;

-- Admins Policies
DROP POLICY IF EXISTS "admins_select" ON admins;
DROP POLICY IF EXISTS "admins_insert" ON admins;
DROP POLICY IF EXISTS "admins_update" ON admins;
DROP POLICY IF EXISTS "admins_delete" ON admins;

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Super admins can see all admins
CREATE POLICY "admins_super_admin_select" ON admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins as a
      WHERE a.auth_user_id = auth.uid()
      AND a.role = 'super_admin'
    )
  );

-- School admins can see other admins in their school
CREATE POLICY "admins_school_admin_select" ON admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins as a
      WHERE a.auth_user_id = auth.uid()
      AND a.role = 'school_admin'
      AND a.school_id = admins.school_id
    )
  );

-- Admins can see their own records
CREATE POLICY "admins_self_select" ON admins
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );

-- Only super admins can create new admins
CREATE POLICY "admins_super_admin_insert" ON admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Only super admins can update admin records
CREATE POLICY "admins_super_admin_update" ON admins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Only super admins can delete admin records
CREATE POLICY "admins_super_admin_delete" ON admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = auth.uid()
      AND admins.role = 'super_admin'
    )
  );

-- Grant basic access to authenticated users
GRANT SELECT ON admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON admins TO authenticated;