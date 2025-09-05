-- Add auth_user_id column to academic_results table
-- This column is required by the RLS policy "Students can view their own results"
-- which uses: auth_user_id = auth.uid()

-- Add the column as nullable initially to allow backfilling
ALTER TABLE public.academic_results 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance on student queries
CREATE INDEX IF NOT EXISTS idx_academic_results_auth_user_id 
ON public.academic_results(auth_user_id);

-- Add index for student_id_display queries (commonly used in lookups)
CREATE INDEX IF NOT EXISTS idx_academic_results_student_id_display 
ON public.academic_results(student_id_display);

-- Note: After backfilling data, you may want to make auth_user_id NOT NULL
-- with a separate migration if all rows should have this field populated
