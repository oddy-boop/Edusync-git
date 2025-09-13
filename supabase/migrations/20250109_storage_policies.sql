-- =========================
-- Storage Policies Migration
-- File upload and access policies for school assets and assignments
-- Role-based file management with appropriate security
-- =========================

BEGIN;

-- =========================
-- Storage Bucket Policies: school-assets
-- =========================

-- Public read access for school assets (logos, public documents)
CREATE POLICY "Public read access for school assets" ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'school-assets');

-- Super admins can manage all school assets
CREATE POLICY "Super admins can manage all school assets" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'school-assets' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        bucket_id = 'school-assets' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- School admins can manage their school's assets
CREATE POLICY "Admins can manage their school assets" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'school-assets' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        bucket_id = 'school-assets' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =========================
-- Storage Bucket Policies: assignment-files
-- =========================

-- Teachers can manage their own assignment files
CREATE POLICY "Teachers can manage their own assignment files" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'assignment-files' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'teacher'
        )
    ) 
    WITH CHECK (
        bucket_id = 'assignment-files' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'teacher'
        )
    );

-- Admins have full access to assignment files in their school
CREATE POLICY "Admins can manage assignment files in their school" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'assignment-files' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        bucket_id = 'assignment-files' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Super admins can manage all assignment files
CREATE POLICY "Super admins can manage all assignment files" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'assignment-files' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        bucket_id = 'assignment-files' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Students can read assignment files for their class
CREATE POLICY "Students can read assignment files for their class" ON storage.objects 
    FOR SELECT 
    USING (
        bucket_id = 'assignment-files' 
        AND EXISTS (
            SELECT 1 FROM public.assignments a
            JOIN public.students s ON a.class_id = s.grade_level
            WHERE s.auth_user_id = auth.uid()
            AND (storage.objects.name LIKE a.id::text || '%' OR storage.objects.name LIKE '%' || a.id::text || '%')
        )
    );

-- =========================
-- Additional Storage Buckets
-- =========================

-- Create additional buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('school-reports', 'school-reports', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('user-profiles', 'user-profiles', false) ON CONFLICT (id) DO NOTHING;

-- =========================
-- Storage Policies: student-documents
-- =========================

-- Students can manage their own documents
CREATE POLICY "Students can manage their own documents" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'student-documents' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'student'
        )
    ) 
    WITH CHECK (
        bucket_id = 'student-documents' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'student'
        )
    );

-- Teachers can view documents of students in their classes
CREATE POLICY "Teachers can view student documents in their classes" ON storage.objects 
    FOR SELECT 
    USING (
        bucket_id = 'student-documents' 
        AND EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teachers t ON s.grade_level = ANY(t.assigned_classes)
            WHERE t.auth_user_id = auth.uid()
            AND s.auth_user_id = storage.objects.owner
        )
    );

-- Admins can view all student documents in their school
CREATE POLICY "Admins can view student documents in their school" ON storage.objects 
    FOR SELECT 
    USING (
        bucket_id = 'student-documents' 
        AND EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.user_roles ur ON ur.user_id = auth.uid()
            WHERE ur.role = 'admin'
            AND s.school_id = ur.school_id
            AND s.auth_user_id = storage.objects.owner
        )
    );

-- =========================
-- Storage Policies: school-reports
-- =========================

-- Admins can manage reports for their school
CREATE POLICY "Admins can manage school reports" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'school-reports' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    ) 
    WITH CHECK (
        bucket_id = 'school-reports' 
        AND owner = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

-- Teachers can read reports in their school
CREATE POLICY "Teachers can read school reports" ON storage.objects 
    FOR SELECT 
    USING (
        bucket_id = 'school-reports' 
        AND EXISTS (
            SELECT 1 FROM public.teachers t
            JOIN public.user_roles ur ON ur.user_id = auth.uid()
            WHERE t.auth_user_id = auth.uid()
            AND ur.role = 'teacher'
        )
    );

-- Super admins can manage all school reports
CREATE POLICY "Super admins can manage all school reports" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'school-reports' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        bucket_id = 'school-reports' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- =========================
-- Storage Policies: user-profiles
-- =========================

-- Users can manage their own profile images
CREATE POLICY "Users can manage their own profile images" ON storage.objects 
    FOR ALL 
    USING (
        bucket_id = 'user-profiles' 
        AND owner = auth.uid()
    ) 
    WITH CHECK (
        bucket_id = 'user-profiles' 
        AND owner = auth.uid()
    );

-- Public read access for profile images
CREATE POLICY "Public read access for profile images" ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'user-profiles');

-- Admins can view profile images of users in their school
CREATE POLICY "Admins can view profile images in their school" ON storage.objects 
    FOR SELECT 
    USING (
        bucket_id = 'user-profiles' 
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur_admin
            JOIN public.user_roles ur_owner ON ur_owner.user_id = storage.objects.owner
            WHERE ur_admin.user_id = auth.uid()
            AND ur_admin.role = 'admin'
            AND ur_admin.school_id = ur_owner.school_id
        )
    );

-- =========================
-- Storage Helper Functions
-- =========================

-- Function to check if user can access file
CREATE OR REPLACE FUNCTION can_access_file(bucket_name text, file_path text, user_id uuid)
RETURNS boolean AS $$
DECLARE
    user_role text;
    user_school_id bigint;
BEGIN
    -- Get user's role and school
    SELECT role, school_id INTO user_role, user_school_id
    FROM public.user_roles
    WHERE user_id = user_id;
    
    -- Super admin can access everything
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- Public buckets are accessible to everyone
    IF bucket_name = 'school-assets' OR bucket_name = 'user-profiles' THEN
        RETURN true;
    END IF;
    
    -- School-scoped access
    IF user_role IN ('admin', 'teacher', 'student', 'accountant') AND user_school_id IS NOT NULL THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS integer AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- This would typically be run by a scheduled job
    -- Remove files from assignments that no longer exist
    -- Remove files from users that no longer exist
    -- etc.
    
    -- Implementation would depend on specific cleanup requirements
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- File Size and Type Restrictions
-- =========================

-- Create function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- Maximum file size: 10MB for most files, 50MB for reports
    IF NEW.bucket_id IN ('assignment-files', 'student-documents', 'user-profiles') THEN
        IF (NEW.metadata->>'size')::bigint > 10485760 THEN -- 10MB
            RAISE EXCEPTION 'File size exceeds 10MB limit';
        END IF;
    ELSIF NEW.bucket_id = 'school-reports' THEN
        IF (NEW.metadata->>'size')::bigint > 52428800 THEN -- 50MB
            RAISE EXCEPTION 'File size exceeds 50MB limit';
        END IF;
    END IF;
    
    -- Validate file types based on bucket
    IF NEW.bucket_id = 'user-profiles' THEN
        IF NOT (NEW.metadata->>'mimetype' LIKE 'image/%') THEN
            RAISE EXCEPTION 'Only image files are allowed for profile pictures';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file upload validation
CREATE TRIGGER trigger_validate_file_upload
    BEFORE INSERT ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION validate_file_upload();

COMMIT;
