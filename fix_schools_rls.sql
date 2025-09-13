-- Fix RLS policies for schools table to resolve "query would be affected by row-level security policy" error
-- This script fixes the RLS policies to allow proper access to schools table

-- First, enable RLS on user_roles (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- Simple, safe select policy: users can see their own roles + service role can see all
CREATE POLICY "user_roles_select" ON user_roles
FOR SELECT USING (
    auth.uid() = user_id OR 
    current_setting('role') = 'service_role'
);

-- Insert policy: only service role can insert (for admin registration)
CREATE POLICY "user_roles_insert" ON user_roles
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- Update policy: only service role can update
CREATE POLICY "user_roles_update" ON user_roles
FOR UPDATE USING (current_setting('role') = 'service_role');

-- Delete policy: only service role can delete
CREATE POLICY "user_roles_delete" ON user_roles
FOR DELETE USING (current_setting('role') = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

-- Fix schools table policies for proper access
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Drop existing schools policies
DROP POLICY IF EXISTS "schools_select" ON schools;
DROP POLICY IF EXISTS "schools_insert" ON schools;
DROP POLICY IF EXISTS "schools_update" ON schools;
DROP POLICY IF EXISTS "schools_delete" ON schools;

-- Allow all authenticated users to view schools (for branch selection)
-- Super-admins can access all schools, others can access their assigned school
CREATE POLICY "schools_select" ON schools
FOR SELECT USING (
    -- Super-admins can see all schools
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin') OR
    -- Regular users can see their assigned school
    id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid()) OR
    -- Allow unauthenticated access for public school selection (branch picker)
    auth.uid() IS NULL OR
    -- Service role can see all
    current_setting('role') = 'service_role'
);

-- Only super-admins and service role can insert schools
CREATE POLICY "schools_insert" ON schools
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin') OR
    current_setting('role') = 'service_role'
);

-- Only super-admins and service role can update schools
CREATE POLICY "schools_update" ON schools
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin') OR
    current_setting('role') = 'service_role'
);

-- Only super-admins and service role can delete schools
CREATE POLICY "schools_delete" ON schools
FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin') OR
    current_setting('role') = 'service_role'
);

-- Grant permissions
GRANT SELECT ON schools TO authenticated, anon;
GRANT ALL ON schools TO service_role;
