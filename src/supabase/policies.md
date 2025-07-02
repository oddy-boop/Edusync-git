-- ================================================================================================
-- St. Joseph's Montessori - Step 2: RLS Policies and Helper Functions
-- Description: This script sets up all Row Level Security (RLS) policies for the application.
--              It should be run AFTER the tables have been created.
-- ================================================================================================

-- ================================================================================================
-- Section 1: Helper Functions (Required for Policies)
-- ================================================================================================

-- Function to check if the current user is an admin.
-- This function is SECURITY INVOKER, meaning it runs as the user calling it.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql;

-- Function to get the current teacher's profile ID (from the teachers table).
CREATE OR REPLACE FUNCTION get_teacher_id()
RETURNS uuid AS $$
  SELECT id
  FROM public.teachers
  WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql;


-- ================================================================================================
-- Section 2: RLS Policies for Each Table
-- ================================================================================================

-- ------------------------------------------------------------------------------------------------
-- Table: user_roles
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT
  TO authenticated
  USING (is_admin());

-- ------------------------------------------------------------------------------------------------
-- Table: app_settings
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Enable all access for admins" ON public.app_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ------------------------------------------------------------------------------------------------
-- Table: school_fee_items
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.school_fee_items FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_fee_items FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ------------------------------------------------------------------------------------------------
-- Table: school_announcements
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.school_announcements FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Enable all access for admins" ON public.school_announcements FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ------------------------------------------------------------------------------------------------
-- Table: teachers
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.teachers FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can view their own profile" ON public.teachers FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);
CREATE POLICY "Teachers can update their own profile" ON public.teachers FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ------------------------------------------------------------------------------------------------
-- Table: students
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.students FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Students can view their own profile" ON public.students FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);
CREATE POLICY "Teachers can view students in their assigned classes" ON public.students FOR SELECT
  TO authenticated
  USING (grade_level = ANY(SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid()));

-- ------------------------------------------------------------------------------------------------
-- Table: fee_payments
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for admins" ON public.fee_payments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Students can view their own payments" ON public.fee_payments FOR SELECT
  TO authenticated
  USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));

-- ------------------------------------------------------------------------------------------------
-- Table: student_arrears
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.student_arrears FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Students can view their own arrears" ON public.student_arrears FOR SELECT
  TO authenticated
  USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));
  
-- ------------------------------------------------------------------------------------------------
-- Table: assignments
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.assignments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments FOR ALL
  TO authenticated
  USING (teacher_id = get_teacher_id())
  WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students and Teachers can view assignments for their class" ON public.assignments FOR SELECT
  TO authenticated
  USING (
    class_id IN (SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid()) OR
    class_id = ANY(SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid())
  );

-- ------------------------------------------------------------------------------------------------
-- Table: behavior_incidents
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.behavior_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.behavior_incidents FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own incident logs" ON public.behavior_incidents FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can view all incidents" ON public.behavior_incidents FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'teacher');

-- ------------------------------------------------------------------------------------------------
-- Table: attendance_records
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.attendance_records FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage attendance for their students" ON public.attendance_records FOR ALL
  TO authenticated
  USING (class_id = ANY(SELECT assigned_classes FROM public.teachers WHERE auth_user_id = auth.uid()))
  WITH CHECK (marked_by_teacher_auth_id = auth.uid());
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT
  TO authenticated
  USING (student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()));

-- ------------------------------------------------------------------------------------------------
-- Table: academic_results
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.academic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.academic_results FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own results" ON public.academic_results FOR ALL
  TO authenticated
  USING (teacher_id = get_teacher_id())
  WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their own published results" ON public.academic_results FOR SELECT
  TO authenticated
  USING (
    student_id_display = (SELECT student_id_display FROM public.students WHERE auth_user_id = auth.uid()) AND
    approval_status = 'approved' AND
    published_at IS NOT NULL AND
    published_at <= now()
  );

-- ------------------------------------------------------------------------------------------------
-- Table: timetable_entries
-- ------------------------------------------------------------------------------------------------
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.timetable_entries FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "Teachers can manage their own timetable" ON public.timetable_entries FOR ALL
  TO authenticated
  USING (teacher_id = get_teacher_id())
  WITH CHECK (teacher_id = get_teacher_id());
CREATE POLICY "Students can view their timetable" ON public.timetable_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(periods) AS period
      WHERE (period->'classNames') @> to_jsonb((SELECT grade_level FROM public.students WHERE auth_user_id = auth.uid())::text)
    )
  );

-- ================================================================================================
-- Section 3: Storage Policies
-- ================================================================================================

-- Policies for 'school-assets' bucket (logos, hero images)
CREATE POLICY "Allow public read access to school assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'school-assets');
CREATE POLICY "Allow admin full access to school assets" ON storage.objects FOR ALL
  USING (bucket_id = 'school-assets' AND is_admin())
  WITH CHECK (bucket_id = 'school-assets' AND is_admin());

-- Policies for 'assignment-files' bucket
CREATE POLICY "Allow public read access to assignment files" ON storage.objects FOR SELECT
  USING (bucket_id = 'assignment-files');
CREATE POLICY "Allow teachers to manage their own assignment files" ON storage.objects FOR ALL
  USING (bucket_id = 'assignment-files' AND owner_id = auth.uid())
  WITH CHECK (bucket_id = 'assignment-files' AND owner_id = auth.uid());
CREATE POLICY "Allow admin full access to assignment files" ON storage.objects FOR ALL
  USING (bucket_id = 'assignment-files' AND is_admin())
  WITH CHECK (bucket_id = 'assignment-files' AND is_admin());


-- ========================== END OF SCRIPT ==========================
