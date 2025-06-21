
-- This script resolves all Supabase performance warnings by optimizing and consolidating RLS policies.

-- Step 1: Create a performant helper function to check for admin role.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop all old policies from the tables to ensure a clean slate.
DO $$
DECLARE
    policy_record RECORD;
    table_record RECORD;
BEGIN
    FOR table_record IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_record.tablename LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.' || quote_ident(table_record.tablename);
        END LOOP;
    END LOOP;
END $$;


-- Step 3: Create new, performant, and consolidated policies for all tables.

-- === app_settings ===
CREATE POLICY "Allow public read access" ON public.app_settings
  FOR SELECT USING (true);
CREATE POLICY "Allow admin write access" ON public.app_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- === user_roles ===
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- === teachers ===
CREATE POLICY "Allow view access for admins and own profile" ON public.teachers
  FOR SELECT TO authenticated USING (is_admin() OR auth_user_id = (SELECT auth.uid()));
CREATE POLICY "Allow update for admins and own profile" ON public.teachers
  FOR UPDATE TO authenticated USING (is_admin() OR auth_user_id = (SELECT auth.uid())) WITH CHECK (is_admin() OR auth_user_id = (SELECT auth.uid()));
CREATE POLICY "Allow admin insert" ON public.teachers
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Allow admin delete" ON public.teachers
  FOR DELETE TO authenticated USING (is_admin());

-- === students ===
CREATE POLICY "Allow view access for relevant users" ON public.students
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (auth_user_id = (SELECT auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()) AND ARRAY[students.grade_level] <@ t.assigned_classes))
  );
CREATE POLICY "Allow admin write access" ON public.students
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- === school_fee_items ===
CREATE POLICY "Authenticated users can read fee items" ON public.school_fee_items
  FOR SELECT TO authenticated USING ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Admins can manage fee items" ON public.school_fee_items
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- === fee_payments ===
CREATE POLICY "Allow read access for relevant users" ON public.fee_payments
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.student_id_display = fee_payments.student_id_display))
  );
CREATE POLICY "Allow admin write access" ON public.fee_payments
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- === school_announcements ===
CREATE POLICY "Allow read for relevant users" ON public.school_announcements
  FOR SELECT TO authenticated USING (
    target_audience = 'All'
    OR (target_audience = 'Teachers' AND EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = (SELECT auth.uid())))
    OR (target_audience = 'Students' AND EXISTS (SELECT 1 FROM public.students WHERE auth_user_id = (SELECT auth.uid())))
  );
CREATE POLICY "Allow admin write access" ON public.school_announcements
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- === attendance_records ===
CREATE POLICY "Allow read access for relevant users" ON public.attendance_records
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = (SELECT auth.uid()) AND ARRAY[attendance_records.class_id] <@ t.assigned_classes))
    OR (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.student_id_display = attendance_records.student_id_display))
  );
CREATE POLICY "Allow write access for admins and teachers" ON public.attendance_records
  FOR ALL TO authenticated
  USING (is_admin() OR marked_by_teacher_auth_id = (SELECT auth.uid()))
  WITH CHECK (is_admin() OR marked_by_teacher_auth_id = (SELECT auth.uid()));

-- === behavior_incidents ===
CREATE POLICY "Allow access for admins and creating teacher" ON public.behavior_incidents
  FOR ALL TO authenticated USING (is_admin() OR teacher_id = (SELECT auth.uid()))
  WITH CHECK (is_admin() OR teacher_id = (SELECT auth.uid()));

-- === assignments ===
CREATE POLICY "Allow read access for relevant users" ON public.assignments
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = assignments.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.grade_level = assignments.class_id))
  );
CREATE POLICY "Allow write access for admins and creating teacher" ON public.assignments
  FOR ALL TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = assignments.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = assignments.teacher_id AND t.auth_user_id = (SELECT auth.uid())));

-- === academic_results ===
CREATE POLICY "Allow read access for relevant users" ON public.academic_results
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = academic_results.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
    OR (
        EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.student_id_display = academic_results.student_id_display)
        AND approval_status = 'approved' AND published_at IS NOT NULL AND published_at <= now()
    )
  );
CREATE POLICY "Allow write access for admins and creating teacher" ON public.academic_results
  FOR ALL TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = academic_results.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = academic_results.teacher_id AND t.auth_user_id = (SELECT auth.uid())));

-- === student_arrears ===
CREATE POLICY "Allow read access for relevant users" ON public.student_arrears
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (SELECT auth.uid()) AND s.student_id_display = student_arrears.student_id_display))
  );
CREATE POLICY "Allow admin write access" ON public.student_arrears
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- === timetable_entries ===
CREATE POLICY "Allow read for relevant users" ON public.timetable_entries
  FOR SELECT TO authenticated USING (
    is_admin()
    OR (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = timetable_entries.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
    OR (EXISTS (
        SELECT 1 FROM public.students s, jsonb_array_elements(timetable_entries.periods) p
        WHERE s.auth_user_id = (SELECT auth.uid()) AND p->'classNames' @> to_jsonb(s.grade_level::text)
    ))
  );
CREATE POLICY "Allow write by admins and creating teacher" ON public.timetable_entries
  FOR ALL TO authenticated
  USING (is_admin() OR EXISTS(SELECT 1 FROM teachers t WHERE t.id = timetable_entries.teacher_id AND t.auth_user_id = (SELECT auth.uid())))
  WITH CHECK (is_admin() OR EXISTS(SELECT 1 FROM teachers t WHERE t.id = timetable_entries.teacher_id AND t.auth_user_id = (SELECT auth.uid())));
