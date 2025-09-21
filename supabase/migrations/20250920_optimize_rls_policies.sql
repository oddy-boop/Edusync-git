-- First, drop existing policies
DROP POLICY IF EXISTS "schools_super_admin_select" ON schools;
DROP POLICY IF EXISTS "schools_admin_select" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_insert" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_update" ON schools;
DROP POLICY IF EXISTS "schools_admin_update" ON schools;
DROP POLICY IF EXISTS "schools_super_admin_delete" ON schools;

-- Enable RLS on schools table
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Create optimized policies for schools
CREATE POLICY "schools_super_admin_access" ON schools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = (SELECT auth.uid())
      AND admins.role = 'super_admin'
    )
  );

CREATE POLICY "schools_admin_access" ON schools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.auth_user_id = (SELECT auth.uid())
      AND admins.school_id = schools.id
      AND admins.role = 'school_admin'
    )
  );

-- Similarly for other tables, we would:
-- 1. Use FOR ALL where full access is needed
-- 2. Combine related policies into single policies
-- 3. Use (SELECT auth.uid()) for better performance
-- 4. Group policies by role for better organization

-- Grant basic access
GRANT ALL ON schools TO authenticated;