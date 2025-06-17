
-- Enable Row Level Security on the school_fee_items table if not already enabled.
-- You can check this in your Supabase dashboard under Database -> Policies.
ALTER TABLE public.school_fee_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to SELECT all fee items.
-- This is crucial for the application to read data after inserts/updates.
DROP POLICY IF EXISTS "Allow authenticated users to select fee items" ON public.school_fee_items;
CREATE POLICY "Allow authenticated users to select fee items"
    ON public.school_fee_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to INSERT new fee items.
DROP POLICY IF EXISTS "Allow authenticated users to insert new fee items" ON public.school_fee_items;
CREATE POLICY "Allow authenticated users to insert new fee items"
    ON public.school_fee_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to UPDATE existing fee items.
DROP POLICY IF EXISTS "Allow authenticated users to update existing fee items" ON public.school_fee_items;
CREATE POLICY "Allow authenticated users to update existing fee items"
    ON public.school_fee_items
    FOR UPDATE
    TO authenticated
    USING (true) -- Allows updating any existing row
    WITH CHECK (true); -- Ensures any conditions on the new data (if specified) are met

-- Policy: Allow authenticated users to DELETE fee items.
DROP POLICY IF EXISTS "Allow authenticated users to delete fee items" ON public.school_fee_items;
CREATE POLICY "Allow authenticated users to delete fee items"
    ON public.school_fee_items
    FOR DELETE
    TO authenticated
    USING (true); -- Allows deleting any existing row

-- IMPORTANT CONSIDERATIONS FOR PRODUCTION:
-- The policies above grant full CRUD access to any authenticated user for the `school_fee_items` table.
-- For a production environment, you would typically want more granular control.
-- This might involve:
-- 1. Checking for a specific admin role (e.g., if you have a user_roles table or custom claims in JWT).
--    Example using a custom claim 'user_role' in app_metadata:
--    USING (auth.jwt() -> 'app_metadata' ->> 'user_role' = 'admin')
--    WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'user_role' = 'admin')
--
-- 2. Using Supabase's built-in roles if applicable.
--
-- 3. For tables containing user-specific data, policies would typically restrict access based on `auth.uid()`.
--    For example: `USING (auth.uid() = user_id_column)`
--
-- For the purpose of an admin portal where all users are implicitly admins,
-- `TO authenticated USING (true)` is a common starting point to ensure functionality.
-- Please review and adapt these policies based on your specific security requirements.
