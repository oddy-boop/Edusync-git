-- Add from_email field to schools table for branch-specific email configuration
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS from_email text;

-- Update RLS policies to allow admins to update email configuration
CREATE POLICY IF NOT EXISTS "Admins can update school email config" ON public.schools 
FOR UPDATE USING (
    id IN (
        SELECT school_id FROM public.admins WHERE auth_user_id = auth.uid()
    )
);
