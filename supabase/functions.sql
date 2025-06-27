-- =================================================================
-- SQL HELPER FUNCTIONS FOR RLS POLICIES
-- =================================================================
-- To improve the performance of Row Level Security (RLS), it is best practice
-- to use helper functions instead of complex subqueries within policies.
--
-- How to use:
-- 1. Navigate to the SQL Editor in your Supabase dashboard.
-- 2. Copy the content of this entire file.
-- 3. Paste it into the SQL Editor and click "RUN".
-- 4. Once these functions are created, you can use the simplified RLS
--    policies defined in `supabase/rls_policies.md`.
-- =================================================================


-- Helper function to get the role of the current authenticated user.
-- This checks the custom `user_roles` table.
-- Usage in RLS: `public.get_my_role() = 'admin'`
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;


-- Helper function to check if the current user is a registered teacher.
-- Usage in RLS: `public.is_teacher()`
create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(select 1 from public.teachers where auth_user_id = auth.uid());
$$;


-- Helper function to get the student_id_display for the current authenticated user.
-- Usage in RLS: `academic_results.student_id_display = public.get_my_student_id()`
create or replace function public.get_my_student_id()
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select student_id_display from public.students where auth_user_id = auth.uid() limit 1;
$$;
