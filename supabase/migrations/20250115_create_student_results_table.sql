-- Create a new student_results table that groups all subjects for a student
-- This replaces the per-subject academic_results approach with a per-student approach

CREATE TABLE public.student_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id_display text NOT NULL,
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    class_id text NOT NULL,
    teacher_id bigint REFERENCES public.teachers(id) ON DELETE SET NULL,
    term text NOT NULL,
    year text NOT NULL,
    student_name text,
    teacher_name text,
    submitted_by text,
    -- JSON field to store all subjects and their detailed scores
    subjects_data jsonb NOT NULL,
    -- Overall student performance summary
    total_subjects integer DEFAULT 0,
    average_score numeric(5,2),
    approval_status text NOT NULL DEFAULT 'pending',
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_results_school_id ON public.student_results(school_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON public.student_results(student_id_display);
CREATE INDEX IF NOT EXISTS idx_student_results_auth_user_id ON public.student_results(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_student_results_class_term_year ON public.student_results(class_id, term, year);
CREATE INDEX IF NOT EXISTS idx_student_results_approval_status ON public.student_results(approval_status);
CREATE INDEX IF NOT EXISTS idx_student_results_teacher_id ON public.student_results(teacher_id);

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_student_results_subjects_data ON public.student_results USING GIN (subjects_data);

-- Enable RLS
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies similar to academic_results
CREATE POLICY "Admins can manage their school's student results" ON public.student_results 
FOR ALL USING (is_my_school_record(school_id)) WITH CHECK (is_my_school_record(school_id));

CREATE POLICY "Teachers can manage student results for their assigned classes" ON public.student_results 
FOR ALL USING (class_id = ANY (ARRAY(SELECT unnest(assigned_classes) FROM public.teachers WHERE auth_user_id = auth.uid()))) 
WITH CHECK (class_id = ANY (ARRAY(SELECT unnest(assigned_classes) FROM public.teachers WHERE auth_user_id = auth.uid())));

CREATE POLICY "Students can view their own results" ON public.student_results 
FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Service role can read student_results for AI assistant" ON public.student_results
FOR SELECT 
TO service_role
USING (true);

-- Add comment explaining the subjects_data JSON structure
COMMENT ON COLUMN public.student_results.subjects_data IS 
'JSON structure: [{"subject": "Math", "class_score": 85, "exam_score": 90, "total_score": 175, "grade": "A", "remarks": "Excellent"}]';

-- Keep the old academic_results table for backward compatibility and migration
-- You can migrate data and eventually drop it once the new system is stable
