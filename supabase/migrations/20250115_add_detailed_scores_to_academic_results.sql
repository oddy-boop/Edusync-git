-- Add detailed score fields to academic_results table
-- This will allow storage of class_score, exam_score, grade, and remarks
-- which are needed for admin approval interface

-- Add the detailed score columns
ALTER TABLE public.academic_results 
ADD COLUMN IF NOT EXISTS class_score numeric(5,2),
ADD COLUMN IF NOT EXISTS exam_score numeric(5,2),
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS term text,
ADD COLUMN IF NOT EXISTS year text,
ADD COLUMN IF NOT EXISTS student_name text,
ADD COLUMN IF NOT EXISTS teacher_name text,
ADD COLUMN IF NOT EXISTS submitted_by text;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_academic_results_term_year 
ON public.academic_results(term, year);

CREATE INDEX IF NOT EXISTS idx_academic_results_approval_status 
ON public.academic_results(approval_status);

-- Note: The existing 'score' field will continue to store the total score
-- for backward compatibility and quick queries
