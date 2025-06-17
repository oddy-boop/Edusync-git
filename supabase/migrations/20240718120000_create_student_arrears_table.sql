
-- Create student_arrears table
CREATE TABLE IF NOT EXISTS public.student_arrears (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id_display TEXT NOT NULL,
    student_name TEXT, -- Denormalized for easier display, can be joined from students table
    grade_level_at_arrear TEXT, -- The grade level when the arrear was incurred/noted
    academic_year_from TEXT NOT NULL, -- e.g., "2023-2024", the year the debt originated
    academic_year_to TEXT NOT NULL,   -- e.g., "2024-2025", the year the debt is carried into
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'partially_paid', 'cleared', 'waived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by_user_id UUID REFERENCES auth.users(id), -- Optional: who/what process created it
    updated_by_user_id UUID REFERENCES auth.users(id)  -- Optional: who/what process updated it
);

-- Add foreign key constraint to students table if student_id_display is not already a unique key there
-- If student_id_display is the primary key of students, this might not be needed or might be different.
-- Assuming 'students' table exists with a 'student_id_display' column that is unique.
-- ALTER TABLE public.student_arrears
-- ADD CONSTRAINT fk_student_arrears_student_id_display
-- FOREIGN KEY (student_id_display) REFERENCES public.students(student_id_display) ON DELETE CASCADE;
-- Note: If student_id_display is not unique in 'students', consider using the actual PK of 'students' table.

-- Enable RLS
ALTER TABLE public.student_arrears ENABLE ROW LEVEL SECURITY;

-- Policies for student_arrears table (basic example, adjust as needed)
-- Admin users (assuming a way to identify admins, e.g., via a custom claim or another table)
-- For simplicity, allowing authenticated users to manage for now.
-- More specific admin role checks should be implemented based on your auth setup.

DROP POLICY IF EXISTS "Allow authenticated users to read student arrears" ON public.student_arrears;
CREATE POLICY "Allow authenticated users to read student arrears"
ON public.student_arrears
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert student arrears" ON public.student_arrears;
CREATE POLICY "Allow authenticated users to insert student arrears"
ON public.student_arrears
FOR INSERT
TO authenticated
WITH CHECK (true); -- Or check for admin role: get_my_claim('userrole') = 'admin'

DROP POLICY IF EXISTS "Allow authenticated users to update student arrears" ON public.student_arrears;
CREATE POLICY "Allow authenticated users to update student arrears"
ON public.student_arrears
FOR UPDATE
TO authenticated
USING (true) -- Or check for admin role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete student arrears" ON public.student_arrears;
CREATE POLICY "Allow authenticated users to delete student arrears"
ON public.student_arrears
FOR DELETE
TO authenticated
USING (true); -- Or check for admin role

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_arrears_student_id_display ON public.student_arrears(student_id_display);
CREATE INDEX IF NOT EXISTS idx_student_arrears_academic_year_to ON public.student_arrears(academic_year_to);

COMMENT ON TABLE public.student_arrears IS 'Stores outstanding fee balances carried over from previous academic years.';
COMMENT ON COLUMN public.student_arrears.academic_year_from IS 'The academic year in which the debt originated.';
COMMENT ON COLUMN public.student_arrears.academic_year_to IS 'The academic year into which the debt is carried forward.';
COMMENT ON COLUMN public.student_arrears.status IS 'Current status of the arrear (outstanding, partially_paid, cleared, waived).';

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_student_arrears_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_student_arrears_updated
BEFORE UPDATE ON public.student_arrears
FOR EACH ROW
EXECUTE FUNCTION public.handle_student_arrears_updated_at();
    