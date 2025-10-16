-- === RESET ALL POLICIES AND FUNCTIONS ===
-- Drop all RLS policies for all tables
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = r.tablename LOOP
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(r.tablename) || ';';
    END LOOP;
  END LOOP;
END $$;

-- Drop all helper functions (add more as needed)
DROP FUNCTION IF EXISTS get_my_role();
DROP FUNCTION IF EXISTS get_my_school_id();
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS is_accountant();
DROP FUNCTION IF EXISTS log_audit();
-- EduSync Full RLS, Functions, Indexes, and Audit Triggers Migration

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text AS $$
  SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

CREATE OR REPLACE FUNCTION get_my_school_id() RETURNS bigint AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean AS $$
  SELECT (SELECT get_my_role()) = 'super_admin';
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

CREATE OR REPLACE FUNCTION is_accountant() RETURNS boolean AS $$
  SELECT (SELECT get_my_role()) = 'accountant';
$$ LANGUAGE sql SECURITY DEFINER SET row_security = off;

-- 2. Audit Log Table and Trigger
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT,
  operation TEXT,
  row_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_audit() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs(table_name, operation, row_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    row_to_json(NEW),
    (SELECT auth.uid())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Indexes (examples)
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_user_id ON teachers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON user_roles(school_id);
-- Add similar indexes for other tables as needed

-- 4. RLS Policies (examples)

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_students ON students;
CREATE POLICY access_students ON students
  FOR SELECT
  USING (
    (SELECT get_my_role()) IN ('admin', 'super_admin', 'accountant')
    OR EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.auth_user_id = (SELECT auth.uid())
        AND students.grade_level = ANY(teachers.assigned_classes)
    )
    OR students.auth_user_id = (SELECT auth.uid())
  );
CREATE POLICY manage_students ON students
  FOR ALL
  USING ((SELECT get_my_role()) IN ('admin', 'super_admin'));

-- teachers
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_teachers ON teachers;
CREATE POLICY access_teachers ON teachers
  FOR SELECT
  USING (
    (SELECT get_my_role()) IN ('admin', 'super_admin', 'accountant')
    OR teachers.auth_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.auth_user_id = (SELECT auth.uid())
        AND students.school_id = teachers.school_id
    )
  );
CREATE POLICY manage_teachers ON teachers
  FOR ALL
  USING ((SELECT get_my_role()) IN ('admin', 'super_admin'));

-- fee_payments
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_fee_payments ON fee_payments;
CREATE POLICY access_fee_payments ON fee_payments
  FOR SELECT
  USING (
    (SELECT get_my_role()) IN ('admin', 'super_admin', 'accountant')
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.auth_user_id = (SELECT auth.uid())
        AND students.school_id = fee_payments.school_id
        AND students.student_id_display = fee_payments.student_id_display
    )
  );
CREATE POLICY manage_fee_payments ON fee_payments
  FOR ALL
  USING ((SELECT get_my_role()) IN ('admin', 'super_admin', 'accountant'));

-- school_announcements
ALTER TABLE school_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_school_announcements ON school_announcements;
CREATE POLICY access_school_announcements ON school_announcements
  FOR SELECT
  USING (
    (SELECT get_my_role()) IN ('admin', 'super_admin', 'teacher', 'student')
  );
CREATE POLICY manage_school_announcements ON school_announcements
  FOR ALL
  USING ((SELECT get_my_role()) IN ('admin', 'super_admin'));

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_user_roles ON user_roles;
CREATE POLICY access_user_roles ON user_roles
  FOR SELECT
  USING (true);
CREATE POLICY manage_user_roles ON user_roles
  FOR ALL
  USING ((SELECT get_my_role()) IN ('admin', 'super_admin'));

-- 5. Audit Triggers (example for students)
DROP TRIGGER IF EXISTS audit_students ON students;
CREATE TRIGGER audit_students
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Repeat similar RLS, indexes, and triggers for all other tables as per your requirements.
-- You can copy the above templates and adjust for each table.
