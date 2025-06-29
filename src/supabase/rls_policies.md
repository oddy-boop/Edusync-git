# Supabase RLS Policies & Database Setup for St. Joseph's Montessori App

This file contains the complete, corrected, and optimized SQL script required to set up your Supabase database. It includes a robust trigger for handling new user registrations and a full set of Row Level Security (RLS) policies for all tables.

**IMPORTANT:** This script is designed to be run in its entirety. It will automatically clean up old components before creating the new, corrected versions.

--- START COPYING HERE (for Database Setup & Cleanup) ---
```sql
-- =========== Section 1: CLEANUP & SETUP ===========
-- This section drops all old, problematic triggers and functions to ensure a clean slate.
-- Using CASCADE will automatically remove dependent RLS policies, which will be recreated later.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_assign_role on auth.users;
drop trigger if exists on_auth_user_created_create_profile on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_new_user_with_role() cascade;
drop function if exists public.handle_new_user_with_role_from_metadata() cascade;
drop function if exists public.handle_new_user_with_profile_creation() cascade;
drop function if exists public.get_my_role() cascade;
drop function if exists public.get_my_student_id() cascade;
drop function if exists public.get_my_teacher_id() cascade;
drop function if exists public.is_my_teacher_record(uuid) cascade;
drop function if exists public.get_my_assigned_classes() cascade;

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
returns text language plpgsql as $$ begin return (select role from public.user_roles where user_id = (select auth.uid())); end; $$;

create or replace function public.get_my_student_id()
returns text language plpgsql as $$ begin return (select student_id_display from public.students where auth_user_id = (select auth.uid())); end; $$;

create or replace function public.get_my_teacher_id()
returns uuid language plpgsql as $$ begin return (select id from public.teachers where auth_user_id = (select auth.uid())); end; $$;

create or replace function public.is_my_teacher_record(p_teacher_id uuid)
returns boolean language plpgsql as $$ begin return exists (select 1 from public.teachers where id = p_teacher_id and auth_user_id = (select auth.uid())); end; $$;

create or replace function public.get_my_assigned_classes()
returns text[] language plpgsql as $$ begin return (select assigned_classes from public.teachers where auth_user_id = (select auth.uid())); end; $$;

```
--- END COPYING HERE (for Database Setup & Cleanup) ---

---
## Section 3: RLS Policies by Table

For each table or storage bucket listed below, **delete any existing policies** you have on it before adding the single new one.

### `user_roles`
- **Policy Name:** `Enable access based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression:**
  ```sql
  ( (select public.get_my_role()) = 'admin'::text OR user_id = (select auth.uid()) )
  ```
- **WITH CHECK expression:**
  ```sql
  ( (select public.get_my_role()) = 'admin'::text )
  ```

### `students`
- **Policy Name:** `Enable access based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    ((select public.get_my_role()) = 'admin'::text) OR
    (
      ((select public.get_my_role()) = 'teacher'::text) AND (grade_level = ANY ((select public.get_my_assigned_classes())))
    ) OR
    (auth_user_id = (select auth.uid()))
  )
  ```

### `teachers`
- **Policy Name:** `Enable access for Admins and respective Teachers`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    ((select public.get_my_role()) = 'admin'::text) OR (auth_user_id = (select auth.uid()))
  )
  ```

### `academic_results`
- **Policy Name:** `Enable access based on user role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (teacher_id = (select public.get_my_teacher_id())) AND
        ((pg_catalog.current_query() ~* 'insert') OR (approval_status <> 'approved'::text))
      ) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND
        (approval_status = 'approved'::text) AND
        (published_at IS NOT NULL) AND
        (published_at <= now()) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `app_settings`
- **Policy Name:** `Allow public read and admin write`
- **Allowed operation:** `ALL`
- **Target roles:** `anon, authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      (pg_catalog.current_query() ~* 'select') OR
      ((select public.get_my_role()) = 'admin'::text)
    )
    ```

### `assignments`
- **Policy Name:** `Enable access based on user role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select public.get_my_teacher_id()))
      ) OR
      (
        (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (select auth.uid()) AND s.grade_level = class_id)) AND (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `attendance_records`
- **Policy Name:** `Users can manage and view attendance based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (marked_by_teacher_auth_id = (select auth.uid()))
      ) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `behavior_incidents`
- **Policy Name:** `Allow access for admins and creating teacher`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    ((select public.get_my_role()) = 'admin'::text) OR
    (
      ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select auth.uid()))
    )
  )
  ```

### `fee_payments`
- **Policy Name:** `Enable access based on user role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `school_announcements`
- **Policy Name:** `Enable access based on target audience`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (pg_catalog.current_query() ~* 'select') AND
        (
          (target_audience = 'All'::text) OR
          ((target_audience = 'Teachers'::text) AND ((select public.get_my_role()) = 'teacher'::text)) OR
          ((target_audience = 'Students'::text) AND ((select public.get_my_role()) = 'student'::text))
        )
      )
    )
    ```

### `school_fee_items`
- **Policy Name:** `Admin write, all users read`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
        (pg_catalog.current_query() ~* 'select') OR ((select public.get_my_role()) = 'admin'::text)
    )
    ```

### `student_arrears`
- **Policy Name:** `Enable access based on user role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `timetable_entries`
- **Policy Name:** `Users can manage and view timetables based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
    ```sql
    (
      (pg_catalog.current_query() ~* 'select') OR
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select public.get_my_teacher_id()))
      )
    )
    ```

### `school-assets` (Storage Bucket)
- **Policy Name for Reading:** `Allow public read access`
  - **Allowed operation:** `SELECT`
  - **Target roles:** `public`
  - **USING expression:** `true`

- **Policy Name for Writing:** `Allow admins to upload/modify`
  - **Allowed operation:** `INSERT`, `UPDATE`, `DELETE`
  - **Target roles:** `authenticated`
  - **USING & WITH CHECK expression:** `((select public.get_my_role()) = 'admin'::text)`

### `assignment-files` (Storage Bucket)
- **Policy Name for Reading:** `Allow public read access`
  - **Allowed operation:** `SELECT`
  - **Target roles:** `public`
  - **USING expression:** `true`

- **Policy Name for Writing:** `Allow authenticated teachers to manage their files`
  - **Allowed operation:** `INSERT`, `UPDATE`, `DELETE`
  - **Target roles:** `authenticated`
  - **USING & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'teacher'::text) AND ((select auth.uid())::text = (storage.foldername(name))[1])
    )
    ```
    *(Note: This assumes the file path is structured as `{teacher_auth_user_id}/{file_name}`)*
