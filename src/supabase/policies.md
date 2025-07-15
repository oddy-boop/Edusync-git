-- ================================================================================================
-- EduSync SaaS - Enhanced Schema & RLS Policy v12.1 (Idempotent & Optimized)
-- Description: This version includes DROP POLICY IF EXISTS for all policies to ensure the script
--              is idempotent (runnable multiple times). It also optimizes RLS functions by wrapping
--              them in (SELECT ...) to improve performance as per linter recommendations.
-- ================================================================================================

-- Drop existing policies first to ensure a clean slate
DROP POLICY IF EXISTS "Super admins can manage schools" ON public.schools;
DROP POLICY IF EXISTS "Public can read active school info" ON public.schools;
DROP POLICY IF EXISTS "Admins can view their own school's API keys" ON public.schools;
DROP POLICY IF EXISTS "Super admins can manage all settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage their school settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read their school settings" ON public.app_settings;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their own school" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can see roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "School members can access students" ON public.students;
DROP POLICY IF EXISTS "School members can access teachers" ON public.teachers;
DROP POLICY IF EXISTS "School members can access announcements" ON public.school_announcements;
DROP POLICY IF EXISTS "School members can access fee items" ON public.school_fee_items;
DROP POLICY IF EXISTS "School members can access payments" ON public.fee_payments;
DROP POLICY IF EXISTS "School members can access arrears" ON public.student_arrears;
DROP POLICY IF EXISTS "School members can access results" ON public.academic_results;
DROP POLICY IF EXISTS "Students can view their own approved results" ON public.academic_results;
DROP POLICY IF EXISTS "School members can access attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "School members can access incidents" ON public.behavior_incidents;
DROP POLICY IF EXISTS "School members can access assignments" ON public.assignments;
DROP POLICY IF EXISTS "School members can access timetables" ON public.timetable_entries;
DROP POLICY IF EXISTS "Super admins can manage all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;

-- Storage policies
DROP POLICY IF EXISTS "Public can read school assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage their school's assets" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage all school assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can manage assignment files" ON storage.objects;

-- ================================================================================================
-- Section 1: Trigger and Helper Functions (with search_path)
-- ================================================================================================

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_role TEXT;
  v_student_id_display TEXT;
BEGIN
  -- Extract school_id and role from the new user's metadata
  v_school_id := (NEW.raw_user_meta_data->>'school_id')::UUID;
  v_role := NEW.raw_user_meta_data->>'role';

  -- If school_id or role is missing, we cannot proceed.
  IF v_school_id IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'school_id and role must be provided in user metadata for new users.';
  END IF;

  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, school_id, role)
  VALUES (NEW.id, v_school_id, v_role);

  -- Conditionally insert into students or teachers table
  IF v_role = 'student' THEN
    v_student_id_display := NEW.raw_user_meta_data->>'student_id_display';
    INSERT INTO public.students (auth_user_id, school_id, full_name, contact_email, date_of_birth, grade_level, guardian_name, guardian_contact, student_id_display)
    VALUES (
      NEW.id,
      v_school_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      (NEW.raw_user_meta_data->>'date_of_birth')::date,
      NEW.raw_user_meta_data->>'grade_level',
      NEW.raw_user_meta_data->>'guardian_name',
      NEW.raw_user_meta_data->>'guardian_contact',
      v_student_id_display
    );
  ELSIF v_role = 'teacher' THEN
    INSERT INTO public.teachers (auth_user_id, school_id, full_name, email, contact_number, subjects_taught, assigned_classes)
    VALUES (
      NEW.id,
      v_school_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      NEW.raw_user_meta_data->>'contact_number',
      (SELECT array_agg(elem) FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'subjects_taught') AS elem),
      (SELECT array_agg(elem) FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'assigned_classes') AS elem)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists to ensure a clean update
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to call the function after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Helper Functions with explicit search_path
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
SET search_path = public;
BEGIN
  RETURN (SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() AND is_deleted = false LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
SET search_path = public;
BEGIN
  RETURN (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND is_deleted = false LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
SET search_path = public;
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_school_active(school_id UUID)
RETURNS boolean AS $$
SET search_path = public;
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.schools 
    WHERE id = school_id 
    AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_school_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
    school_id_text TEXT;
BEGIN
    school_id_text := split_part(path, '/', 1);
    RETURN school_id_text::UUID;
EXCEPTION WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================================================================
-- Section 3: RLS Policies (Optimized & with soft-delete checks)
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- Schools policies
CREATE POLICY "Super admins can manage schools" ON public.schools FOR ALL 
USING ((SELECT is_super_admin()) AND (is_deleted = false OR (SELECT is_super_admin())))
WITH CHECK ((SELECT is_super_admin()));

CREATE POLICY "Public can read active school info" ON public.schools FOR SELECT 
USING (is_deleted = false);

CREATE POLICY "Admins can view their own school's API keys" ON public.schools FOR SELECT
USING (
    id = (SELECT get_my_school_id())
    AND (SELECT is_school_active(id))
    AND (SELECT get_my_role()) IN ('admin', 'super_admin')
);

-- App Settings policies
CREATE POLICY "Super admins can manage all settings" ON public.app_settings FOR ALL
USING ((SELECT is_super_admin()))
WITH CHECK ((SELECT is_super_admin()));

CREATE POLICY "Admins can manage their school settings" ON public.app_settings FOR ALL
USING (
    school_id = (SELECT get_my_school_id())
    AND (SELECT is_school_active(school_id))
    AND (SELECT get_my_role()) = 'admin'
)
WITH CHECK (school_id = (SELECT get_my_school_id()));

CREATE POLICY "Authenticated users can read their school settings" ON public.app_settings FOR SELECT
USING (
    school_id = (SELECT get_my_school_id())
    AND (SELECT is_school_active(school_id))
);

-- User Roles Policies
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL 
USING ((SELECT is_super_admin())) 
WITH CHECK ((SELECT is_school_active(school_id)) AND (SELECT is_super_admin()));

CREATE POLICY "Admins can manage roles in their own school" ON public.user_roles FOR ALL
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)) AND (SELECT get_my_role()) = 'admin')
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "Authenticated users can see roles in their school" ON public.user_roles FOR SELECT 
USING ((school_id = (SELECT get_my_school_id()) OR (SELECT is_super_admin())) AND is_deleted = false);

-- Universal Policies for School-Specific Data (with soft-delete check)
-- ** UPDATED STUDENT/TEACHER POLICIES **
CREATE POLICY "School members can access students" ON public.students FOR ALL
USING (school_id = (SELECT get_my_school_id()) AND (is_deleted = false OR (SELECT get_my_role()) IN ('admin', 'super_admin')) AND (SELECT is_school_active(school_id)))
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access teachers" ON public.teachers FOR ALL
USING (school_id = (SELECT get_my_school_id()) AND (is_deleted = false OR (SELECT get_my_role()) IN ('admin', 'super_admin')) AND (SELECT is_school_active(school_id)))
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access announcements" ON public.school_announcements FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access fee items" ON public.school_fee_items FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access payments" ON public.fee_payments FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access arrears" ON public.student_arrears FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access results" ON public.academic_results FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "Students can view their own approved results" ON public.academic_results FOR SELECT 
USING ((SELECT auth.uid()) = (SELECT auth_user_id FROM public.students s WHERE s.student_id_display = academic_results.student_id_display AND s.school_id = academic_results.school_id LIMIT 1));

CREATE POLICY "School members can access attendance" ON public.attendance_records FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access incidents" ON public.behavior_incidents FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND is_deleted = false AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access assignments" ON public.assignments FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

CREATE POLICY "School members can access timetables" ON public.timetable_entries FOR ALL 
USING (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id))) 
WITH CHECK (school_id = (SELECT get_my_school_id()) AND (SELECT is_school_active(school_id)));

-- Audit and Notification Policies
CREATE POLICY "Super admins can manage all audit logs" ON public.audit_logs FOR ALL USING ((SELECT is_super_admin()));
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (recipient_id = (SELECT auth.uid())) WITH CHECK (recipient_id = (SELECT auth.uid()));


-- ================================================================================================
-- Section 4: Storage Policies
-- ================================================================================================
CREATE POLICY "Public can read school assets" ON storage.objects FOR SELECT 
USING (bucket_id = 'school-assets' AND (SELECT is_school_active(get_school_id_from_path(name))));

CREATE POLICY "Admins can manage their school's assets" ON storage.objects FOR ALL 
USING (bucket_id = 'school-assets' AND (SELECT get_my_school_id()) = get_school_id_from_path(name) AND (SELECT is_school_active(get_school_id_from_path(name))) AND (SELECT get_my_role()) IN ('admin', 'super_admin')) 
WITH CHECK ((SELECT get_my_school_id()) = get_school_id_from_path(name) AND (SELECT is_school_active(get_school_id_from_path(name))));

CREATE POLICY "Super Admins can manage all school assets" ON storage.objects FOR ALL 
USING (bucket_id = 'school-assets' AND (SELECT is_super_admin())) 
WITH CHECK ((SELECT is_super_admin()));

-- Assignment files policies
CREATE POLICY "Public read access for assignment files" ON storage.objects FOR SELECT 
USING (bucket_id = 'assignment-files' AND (SELECT is_school_active(get_school_id_from_path(name))));

CREATE POLICY "Admins and teachers can manage assignment files" ON storage.objects FOR ALL 
USING (bucket_id = 'assignment-files' AND (SELECT get_my_school_id()) = get_school_id_from_path(name) AND (SELECT is_school_active(get_school_id_from_path(name))) AND (SELECT get_my_role()) IN ('admin', 'teacher', 'super_admin')) 
WITH CHECK ((SELECT get_my_school_id()) = get_school_id_from_path(name) AND (SELECT is_school_active(get_school_id_from_path(name))));
```