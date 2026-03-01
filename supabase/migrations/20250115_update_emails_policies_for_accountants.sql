-- Update emails table policies to include accountants
-- This allows accountants to view and reply to emails in their school

-- Drop the existing policy and recreate with accountant access
DROP POLICY IF EXISTS "Admins can manage their school's emails" ON public.emails;

-- Create new policy that includes admins and accountants
CREATE POLICY "Admins and accountants can manage their school's emails" ON public.emails 
FOR ALL USING (is_my_school_record(school_id)) WITH CHECK (is_my_school_record(school_id));

-- Add comment explaining the updated access
COMMENT ON POLICY "Admins and accountants can manage their school's emails" ON public.emails IS 
'Allows admins and accountants to view, reply to, and manage emails for their school.';
