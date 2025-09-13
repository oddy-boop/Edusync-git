-- =========================
-- Teacher Policies Migration
-- Enables teacher role with classroom management access
-- Assigned students, grades, attendance, assignments, and profile management
-- =========================

BEGIN;

-- =========================
-- Teacher: Profile Management
-- =========================

-- Teachers: Can view and update their own profile
CREATE POLICY "Teachers can manage their own profile" ON public.teachers
    FOR ALL 
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- User Roles: Teachers can view their own role
CREATE POLICY "Teachers can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND role = 'teacher'
    );

-- =========================
-- Teacher: Student Management
-- =========================

-- Students: Teachers can view students in their assigned classes
CREATE POLICY "Teachers can view students in their assigned classes" ON public.students
    FOR SELECT 
    USING (
        grade_level = ANY (
            SELECT unnest(assigned_classes) 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Student Results: Teachers can manage results for their assigned classes
CREATE POLICY "Teachers can manage student results for their assigned classes" ON public.student_results
    FOR ALL 
    USING (
        class_id = ANY (
            SELECT unnest(assigned_classes) 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        class_id = ANY (
            SELECT unnest(assigned_classes) 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Attendance Records: Teachers can manage attendance for their assigned classes
CREATE POLICY "Teachers can manage attendance for their assigned classes" ON public.attendance_records
    FOR ALL 
    USING (
        class_id = ANY (
            SELECT unnest(assigned_classes) 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        class_id = ANY (
            SELECT unnest(assigned_classes) 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: Behavior Management
-- =========================

-- Behavior Incidents: Teachers can manage their own behavior logs
CREATE POLICY "Teachers can manage their own behavior logs" ON public.behavior_incidents
    FOR ALL 
    USING (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: Assignment Management
-- =========================

-- Assignments: Teachers can manage their own assignments
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments
    FOR ALL 
    USING (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: Timetable Management
-- =========================

-- Timetable Entries: Teachers can manage their own timetable
CREATE POLICY "Teachers can manage their own timetable" ON public.timetable_entries
    FOR ALL 
    USING (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: Attendance Management
-- =========================

-- Staff Attendance: Teachers can view their own attendance records
CREATE POLICY "Teachers can view their own staff attendance" ON public.staff_attendance
    FOR SELECT 
    USING (
        teacher_id = (
            SELECT id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: School Information Access
-- =========================

-- Schools: Teachers can view their own school's information
CREATE POLICY "Teachers can view their own school" ON public.schools
    FOR SELECT 
    USING (
        id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- School Announcements: Teachers can view announcements for teachers
CREATE POLICY "Teachers can view school announcements" ON public.school_announcements
    FOR SELECT 
    USING (
        target_audience IN ('All', 'Teachers') 
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: Financial Information (Limited)
-- =========================

-- Fee Payments: Teachers can view payments for students in their classes
CREATE POLICY "Teachers can view fee payments for their students" ON public.fee_payments
    FOR SELECT 
    USING (
        student_id_display IN (
            SELECT student_id_display 
            FROM public.students 
            WHERE grade_level = ANY (
                SELECT unnest(assigned_classes) 
                FROM public.teachers 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Student Arrears: Teachers can view arrears for students in their classes
CREATE POLICY "Teachers can view student arrears for their classes" ON public.student_arrears
    FOR SELECT 
    USING (
        student_id_display IN (
            SELECT student_id_display 
            FROM public.students 
            WHERE grade_level = ANY (
                SELECT unnest(assigned_classes) 
                FROM public.teachers 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =========================
-- Teacher: Communication
-- =========================

-- School Announcements: Teachers can create announcements for their classes
CREATE POLICY "Teachers can create announcements for their classes" ON public.school_announcements
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() 
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
        AND target_audience IN ('Students', 'All')
    );

-- Teachers can update their own announcements
CREATE POLICY "Teachers can update their own announcements" ON public.school_announcements
    FOR UPDATE 
    USING (
        created_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Teachers can delete their own announcements
CREATE POLICY "Teachers can delete their own announcements" ON public.school_announcements
    FOR DELETE 
    USING (
        created_by = auth.uid()
        AND school_id = (
            SELECT school_id 
            FROM public.teachers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Teacher: System Access
-- =========================

-- Assistant Logs: Teachers can view their own assistant interactions
CREATE POLICY "Teachers can view their own assistant logs" ON public.assistant_logs
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'teacher'
        )
    );

-- Teachers can create assistant logs for themselves
CREATE POLICY "Teachers can create their own assistant logs" ON public.assistant_logs
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'teacher'
        )
    );

COMMIT;
