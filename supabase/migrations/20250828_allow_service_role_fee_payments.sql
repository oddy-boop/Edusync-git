-- Migration: allow service role and admins to insert into fee_payments
-- Run this in your Supabase SQL editor or apply via your migration tooling.

BEGIN;

-- Remove any existing policy with the same name to avoid conflicts
DROP POLICY IF EXISTS "Allow service role and admins to insert fee_payments" ON public.fee_payments;

-- Create a targeted INSERT policy that permits:
--  - the Supabase service role (defensive, though service role normally bypasses RLS),
--  - super_admin users, and
--  - admin users for the same school (via is_my_school_record)
CREATE POLICY "Allow service role and admins to insert fee_payments"
  ON public.fee_payments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR get_my_role() = 'super_admin'
    OR (get_my_role() = 'admin' AND is_my_school_record(school_id))
  );

COMMIT;
