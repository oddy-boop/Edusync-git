-- #############################################################################
-- ##                                                                         ##
-- ##           COMPLETE & OPTIMIZED DATABASE SETUP SCRIPT (v5)               ##
-- ##                                                                         ##
-- ## Instructions:                                                           ##
-- ## 1. Go to the SQL Editor in your Supabase dashboard.                       ##
-- ## 2. Copy THIS ENTIRE SCRIPT below.                                       ##
-- ## 3. Paste it into the query editor and click "RUN".                        ##
-- ##                                                                         ##
-- ## This single script will clean up old components and set up everything.  ##
-- ##                                                                         ##
-- #############################################################################

-- =========== Section 1: CLEANUP & SETUP ===========
-- This section drops all old policies, functions, and triggers to ensure a clean slate.
-- Using CASCADE will automatically remove dependent RLS policies, which will be recreated later.

-- Drop old triggers and functions if they exist
drop trigger if exists on_auth_user_created on auth.users cascade;
drop trigger if exists on_auth_user_created_assign_role on auth.users cascade;
drop trigger if exists on_auth_user_created_create_profile on auth.users cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_new_user_with_role() cascade;
drop function if exists public.handle_new_user_with_role_from_metadata() cascade;
drop function if exists public.handle_new_user_with_profile_creation() cascade;
drop function if exists public.get_my_role() cascade;
drop function if exists public.get_my_student_id() cascade;
drop function if exists public.get_my_teacher_id() cascade;
drop function if exists public.is_my_teacher_record(uuid) cascade;
drop function if exists public.get_my_assigned_classes() cascade;

-- Drop all existing RLS policies on all tables to ensure a clean start
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "Enable access based on role" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Enable access for Admins and respective Teachers" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Enable access based on user role" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read and admin write" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage and view attendance based on role" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Allow access for admins and creating teacher" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Enable access based on target audience" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Admin write, all users read" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage and view timetables based on role" ON public.' || quote_ident(r.tablename) || ' CASCADE;';
    END LOOP;
END $$;


-- Create user_roles table if it doesn't exist
create table if not exists public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamp with time zone not null default now()
);
comment on table public.user_roles is 'Stores roles for each user.';


-- =========== Section 2: OPTIMIZED HELPER FUNCTIONS ===========
-- These helper functions are optimized for RLS by using '(select ...)' to prevent re-evaluation per row.

create or replace function public.get_my_role()
returns text language sql stable as $$ select role from public.user_roles where user_id = auth.uid() $$;

create or replace function public.get_my_student_id()
returns text language sql stable as $$ select student_id_display from public.students where auth_user_id = auth.uid() $$;

create or replace function public.get_my_teacher_id()
returns uuid language sql stable as $$ select id from public.teachers where auth_user_id = auth.uid() $$;

create or replace function public.get_my_assigned_classes()
returns text[] language sql stable as $$ select assigned_classes from public.teachers where auth_user_id = auth.uid() $$;


-- =========== Section 3: COMPLETE RLS POLICY CREATION ===========
-- This section enables RLS and creates the single, correct policy for each table.
-- All auth calls are wrapped in (SELECT ...) for performance.

-- For: user_roles
alter table public.user_roles enable row level security;
create policy "Enable access based on role" on public.user_roles for all
using ( ( (select public.get_my_role()) = 'admin' OR user_id = (select auth.uid()) ) )
with check ( ( (select public.get_my_role()) = 'admin' ) );

-- For: students
alter table public.students enable row level security;
create policy "Enable access based on role" on public.students for all
using ( ( (select public.get_my_role()) = 'admin' OR ( (select public.get_my_role()) = 'teacher' AND array[grade_level] && (select public.get_my_assigned_classes()) ) OR (auth_user_id = (select auth.uid())) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( (select public.get_my_role()) = 'teacher' AND array[grade_level] && (select public.get_my_assigned_classes()) ) ) );

-- For: teachers
alter table public.teachers enable row level security;
create policy "Enable access for Admins and respective Teachers" on public.teachers for all
using ( ( (select public.get_my_role()) = 'admin' OR (auth_user_id = (select auth.uid())) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR (auth_user_id = (select auth.uid())) ) );

-- For: academic_results
alter table public.academic_results enable row level security;
create policy "Enable access based on user role" on public.academic_results for all
using ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) OR ( (student_id_display = (select public.get_my_student_id())) AND (approval_status = 'approved'::text) AND (published_at IS NOT NULL) AND (published_at <= now()) ) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) ) );

-- For: app_settings
alter table public.app_settings enable row level security;
create policy "Allow public read and admin write" on public.app_settings for all
using ( ( (select public.get_my_role()) = 'admin' OR current_setting('request.method', true) = 'GET' ) )
with check ( (select public.get_my_role()) = 'admin' );

-- For: assignments
alter table public.assignments enable row level security;
create policy "Enable access based on user role" on public.assignments for all
using ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) OR ( (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (select auth.uid()) AND s.grade_level = class_id)) ) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) ) );

-- For: attendance_records
alter table public.attendance_records enable row level security;
create policy "Users can manage and view attendance based on role" on public.attendance_records for all
using ( ( (select public.get_my_role()) = 'admin' OR ( marked_by_teacher_auth_id = (select auth.uid()) ) OR ( (student_id_display = (select public.get_my_student_id())) ) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( marked_by_teacher_auth_id = (select auth.uid()) ) ) );

-- For: behavior_incidents
alter table public.behavior_incidents enable row level security;
create policy "Allow access for admins and creating teacher" on public.behavior_incidents for all
using ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select auth.uid()) ) ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select auth.uid()) ) ) );

-- For: fee_payments
alter table public.fee_payments enable row level security;
create policy "Enable access based on user role" on public.fee_payments for all
using ( ( (select public.get_my_role()) = 'admin' OR ( (student_id_display = (select public.get_my_student_id())) AND current_setting('request.method', true) = 'GET' ) ) )
with check ( (select public.get_my_role()) = 'admin' );

-- For: school_announcements
alter table public.school_announcements enable row level security;
create policy "Enable access based on target audience" on public.school_announcements for all
using ( ( (select public.get_my_role()) = 'admin' OR ( (current_setting('request.method', true) = 'GET') AND ( (target_audience = 'All') OR ((target_audience = 'Teachers') AND ((select public.get_my_role()) = 'teacher')) OR ((target_audience = 'Students') AND ((select public.get_my_role()) = 'student')) ) ) ) )
with check ( (select public.get_my_role()) = 'admin' );

-- For: school_fee_items
alter table public.school_fee_items enable row level security;
create policy "Admin write, all users read" on public.school_fee_items for all
using ( ( (select public.get_my_role()) = 'admin' OR current_setting('request.method', true) = 'GET' ) )
with check ( (select public.get_my_role()) = 'admin' );

-- For: student_arrears
alter table public.student_arrears enable row level security;
create policy "Enable access based on user role" on public.student_arrears for all
using ( ( (select public.get_my_role()) = 'admin' OR ( (student_id_display = (select public.get_my_student_id())) AND current_setting('request.method', true) = 'GET' ) ) )
with check ( (select public.get_my_role()) = 'admin' );

-- For: timetable_entries
alter table public.timetable_entries enable row level security;
create policy "Users can manage and view timetables based on role" on public.timetable_entries for all
using ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) OR current_setting('request.method', true) = 'GET' ) )
with check ( ( (select public.get_my_role()) = 'admin' OR ( teacher_id = (select public.get_my_teacher_id()) ) ) );


-- =========== Section 4: STORAGE BUCKET POLICIES ===========
-- Note: These policies grant broad access based on roles.

-- For: school-assets (Storage Bucket)
drop policy if exists "Allow public read access for school-assets" on storage.objects;
create policy "Allow public read access for school-assets" on storage.objects for select using ( bucket_id = 'school-assets' );

drop policy if exists "Allow admins to manage school-assets" on storage.objects;
create policy "Allow admins to manage school-assets" on storage.objects for all
using ( (bucket_id = 'school-assets' and (select public.get_my_role()) = 'admin') )
with check ( (bucket_id = 'school-assets' and (select public.get_my_role()) = 'admin') );

-- For: assignment-files (Storage Bucket)
drop policy if exists "Allow public read access for assignment-files" on storage.objects;
create policy "Allow public read access for assignment-files" on storage.objects for select using ( bucket_id = 'assignment-files' );

drop policy if exists "Allow teachers to manage assignment-files" on storage.objects;
create policy "Allow teachers to manage assignment-files" on storage.objects for all
using ( (bucket_id = 'assignment-files' and (select public.get_my_role()) = 'teacher') )
with check ( (bucket_id = 'assignment-files' and (select public.get_my_role()) = 'teacher') );


-- --- END OF SCRIPT ---
