
-- Add the academic_year column to the school_fee_items table
-- This column is crucial for tracking fees specific to an academic session
-- and for the fee carry-over functionality when changing academic years.

ALTER TABLE public.school_fee_items
ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- You might want to set a default value for existing rows if necessary,
-- for example, to your current academic year.
-- Replace 'YYYY-YYYY' with your actual current academic year.
-- Example:
-- UPDATE public.school_fee_items
-- SET academic_year = '2023-2024' -- Replace with your current academic year
-- WHERE academic_year IS NULL;

COMMENT ON COLUMN public.school_fee_items.academic_year IS 'The academic year (e.g., "2023-2024") to which this fee item applies.';

-- Optional: Add an index for potentially faster queries involving academic_year
CREATE INDEX IF NOT EXISTS idx_school_fee_items_academic_year ON public.school_fee_items(academic_year);
