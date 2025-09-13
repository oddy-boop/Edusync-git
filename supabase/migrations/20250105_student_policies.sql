-- =========================
-- Student Policies Migration
-- Enables student role with read-only access to personal data
-- Own data, fees, grades, attendance, and school information
-- =========================

BEGIN;

-- =========================
-- Student: Profile Access
-- =========================

-- Students: Can view their own profile
CREATE POLICY "Students can view their own profile" ON public.students
    FOR SELECT 
    USING (auth_user_id = auth.uid());

-- User Roles: Students can view their own role
CREATE POLICY "Students can view their own role" ON public.user_roles
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND role = 'student'
    );

-- =========================
-- Student: Academic Information
-- =========================

-- Student Results: Students can view their own results
CREATE POLICY "Students can view their own student results" ON public.student_results
    FOR SELECT 
    USING (auth_user_id = auth.uid());

-- Alternative: Students can also view results by student_id_display
CREATE POLICY "Students can view results by student ID" ON public.student_results
    FOR SELECT 
    USING (
        student_id_display = (
            SELECT student_id_display 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Attendance Records: Students can view their own attendance
CREATE POLICY "Students can view their own attendance" ON public.attendance_records
    FOR SELECT 
    USING (
        student_id_display = (
            SELECT student_id_display 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Student: Financial Information
-- =========================

-- Fee Payments: Students can view their own payment history
CREATE POLICY "Students can view their own fee payments" ON public.fee_payments
    FOR SELECT 
    USING (
        student_id_display = (
            SELECT student_id_display 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Student Arrears: Students can view their own arrears
CREATE POLICY "Students can view their own arrears" ON public.student_arrears
    FOR SELECT 
    USING (
        student_id_display = (
            SELECT student_id_display 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- School Fees: Students can view fees for their grade level and school
CREATE POLICY "Students can view fees for their grade level" ON public.school_fees
    FOR SELECT 
    USING (
        school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND grade_level = (
            SELECT grade_level 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- School Fee Items: Students can view fee items for their grade level
CREATE POLICY "Students can view fee items for their grade level" ON public.school_fee_items
    FOR SELECT 
    USING (
        school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND (
            grade_level IS NULL 
            OR grade_level = (
                SELECT grade_level 
                FROM public.students 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =========================
-- Student: School Information
-- =========================

-- Schools: Students can view their own school's information
CREATE POLICY "Students can view their own school" ON public.schools
    FOR SELECT 
    USING (
        id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- School Announcements: Students can view announcements for students
CREATE POLICY "Students can view school announcements" ON public.school_announcements
    FOR SELECT 
    USING (
        target_audience IN ('All', 'Students') 
        AND school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- News Posts: Students can view published news from their school
CREATE POLICY "Students can view their school's published news" ON public.news_posts
    FOR SELECT 
    USING (
        published = true 
        AND school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Student: Academic Activities
-- =========================

-- Assignments: Students can view assignments for their class
CREATE POLICY "Students can view assignments for their class" ON public.assignments
    FOR SELECT 
    USING (
        class_id = (
            SELECT grade_level 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Timetable Entries: Students can view timetable for their class
CREATE POLICY "Students can view timetable for their class" ON public.timetable_entries
    FOR SELECT 
    USING (
        class_id = (
            SELECT grade_level 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
    );

-- =========================
-- Student: Teachers Information
-- =========================

-- Teachers: Students can view teachers assigned to their class
CREATE POLICY "Students can view their class teachers" ON public.teachers
    FOR SELECT 
    USING (
        school_id = (
            SELECT school_id 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        )
        AND (
            SELECT grade_level 
            FROM public.students 
            WHERE auth_user_id = auth.uid()
        ) = ANY(assigned_classes)
    );

-- =========================
-- Student: System Access
-- =========================

-- Assistant Logs: Students can view their own assistant interactions
CREATE POLICY "Students can view their own assistant logs" ON public.assistant_logs
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'student'
        )
    );

-- Students can create assistant logs for themselves
CREATE POLICY "Students can create their own assistant logs" ON public.assistant_logs
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'student'
        )
    );

-- =========================
-- Student: Platform Information (Read-Only)
-- =========================

-- Platform Pricing: Students can view platform pricing (already covered in super admin policies)
-- This is for transparency in fee structures

COMMIT;
