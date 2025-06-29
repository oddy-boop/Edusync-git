
# Supabase RLS Policies for St. Joseph's Montessori App

## IMPORTANT: Prerequisite - Run This SQL First

This script cleans up old, problematic database triggers and functions, and then creates optimized helper functions for RLS. **Run this entire block in your Supabase SQL Editor to ensure your database is set up correctly.**

--- START COPYING HERE (for Database Setup & Cleanup) ---
```sql
-- Table for storing user roles (if it doesn't exist)
create table if not exists public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamp with time zone not null default now()
);
comment on table public.user_roles is 'Stores roles for each user.';

-- CLEANUP: Drop all previous versions of triggers and functions.
-- This ensures a clean slate and optimal performance.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_assign_role on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_new_user_with_role();
drop function if exists public.handle_new_user_with_role_from_metadata();

-- OPTIMIZED HELPER FUNCTIONS (for RLS policies)
-- These functions are safe and required for the RLS policies below to work correctly.
-- They are optimized to be called within a (select ...) subquery.
create or replace function public.get_my_role() returns text language plpgsql security definer set search_path = public as $$ begin return (select role from public.user_roles where user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_student_id() returns text language plpgsql security definer set search_path = public as $$ begin return (select student_id_display from public.students where auth_user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_teacher_id() returns uuid language plpgsql security definer set search_path = public as $$ begin return (select id from public.teachers where auth_user_id = (select auth.uid())); end; $$;
create or replace function public.is_my_teacher_record(p_teacher_id uuid) returns boolean language plpgsql security definer set search_path = public as $$ begin return exists (select 1 from public.teachers where id = p_teacher_id and auth_user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_assigned_classes() returns text[] language plpgsql security definer set search_path = public as $$ begin return (select assigned_classes from public.teachers where auth_user_id = (select auth.uid())); end; $$;

```
--- END COPYING HERE (for Database Setup & Cleanup) ---

---
## RLS Policies by Table

**For each table or storage bucket listed below, it's best to delete any existing policies you have on it before adding the new ones.** This ensures there are no conflicting rules and avoids performance issues from multiple policies.

### `academic_results` Policies
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can do anything
      ((select public.get_my_role()) = 'admin'::text)
      OR
      -- Teachers can manage their own results, but cannot modify/delete approved ones
      (
        ((select public.get_my_teacher_id()) = teacher_id) AND
        (
            -- Allow INSERT
            (pg_catalog.current_query() ~* 'insert') OR
            -- Allow UPDATE/DELETE only if not approved
            (approval_status <> 'approved'::text)
        )
      )
      OR
      -- Students can VIEW their own published results
      (
        (student_id_display = (select public.get_my_student_id())) AND
        (approval_status = 'approved'::text) AND
        (published_at IS NOT NULL) AND
        (published_at <= now()) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `app_settings` Policies

-   **Policy Name:** `Allow public read and admin write`
-   **Allowed operation:** `ALL`
-   **Target roles:** `anon`, `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Allow anyone to read
      (pg_catalog.current_query() ~* 'select')
      OR
      -- Allow only admins to modify
      ((select public.get_my_role()) = 'admin'::text)
    )
    ```

### `assignments` Policies
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can do anything
      ((select public.get_my_role()) = 'admin'::text) OR
      -- Teachers can manage their own assignments
      (
        ((select public.get_my_role()) = 'teacher'::text) AND
        (teacher_id = (select public.get_my_teacher_id()))
      ) OR
      -- Students can view assignments for their class
      (
        (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (select auth.uid()) AND s.grade_level = class_id)) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `attendance_records` Policies
-   **Policy Name:** `Users can manage and view attendance based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can manage any record
      ((select public.get_my_role()) = 'admin'::text)
      OR
      -- Teachers can manage their own attendance records
      (
        ((select public.get_my_role()) = 'teacher'::text) AND
        (marked_by_teacher_auth_id = (select auth.uid()))
      )
      OR
      -- Students can view their own attendance records
      (
        (student_id_display = (select public.get_my_student_id())) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```
    
### `behavior_incidents` Policies
- **Policy Name:** `Allow access for admins and creating teacher`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    -- Admins can do anything
    ((select public.get_my_role()) = 'admin'::text)
    OR
    -- Teachers can manage their own incidents. `teacher_id` in this table stores auth.uid()
    (
      ((select public.get_my_role()) = 'teacher'::text) AND
      (teacher_id = (select auth.uid()))
    )
  )
  ```

### `fee_payments` Policies

-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can do anything
      ((select public.get_my_role()) = 'admin'::text) OR
      -- Students can only VIEW their own payments
      (
        (student_id_display = (select public.get_my_student_id())) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```
    
### `school_announcements` Policies
-   **Policy Name:** `Enable access based on target audience`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can do anything
      ((select public.get_my_role()) = 'admin'::text)
      OR
      -- All authenticated users can VIEW announcements based on their audience
      (
        (pg_catalog.current_query() ~* 'select') AND
        (
            (target_audience = 'All'::text) OR
            (
                (target_audience = 'Teachers'::text) AND
                (EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = (select auth.uid())))
            ) OR
            (
                (target_audience = 'Students'::text) AND
                (EXISTS (SELECT 1 FROM public.students WHERE auth_user_id = (select auth.uid())))
            )
        )
      )
    )
    ```

### `school_assets` (Storage Bucket) Policies

- **Policy #1: `Allow public read access`** (for `SELECT`)
- **Policy #2: `Allow admins to upload/modify`** (for `INSERT`, `UPDATE`, `DELETE`)
  ```sql
  -- USING expression for read access:
  (bucket_id = 'school-assets'::text)
  
  -- USING & WITH CHECK expression for write access:
  ((bucket_id = 'school-assets'::text) AND ((select public.get_my_role()) = 'admin'::text))
  ```

### `school_fee_items` Policies
-   **Policy Name:** `Admin write, all users read`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
        -- Any authenticated user can read
        (pg_catalog.current_query() ~* 'select')
        OR
        -- Only admins can write
        ((select public.get_my_role()) = 'admin'::text)
    )
    ```

### `student_arrears` Policies
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can perform any action
      ((select public.get_my_role()) = 'admin'::text)
      OR
      -- Students can only VIEW their own arrears.
      (
        (student_id_display = (select public.get_my_student_id())) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `students` Policies

- **Policy Name:** `Enable access based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    -- Admins can do anything
    ((select public.get_my_role()) = 'admin'::text) OR
    -- Teachers can view students in their assigned classes
    (
      ((select public.get_my_role()) = 'teacher'::text) AND
      (grade_level = ANY((select public.get_my_assigned_classes()))) AND
      (pg_catalog.current_query() ~* 'select')
    ) OR
    -- Students can view and update their own profile
    (auth_user_id = (select auth.uid()))
  )
  ```

### `teachers` Policies

- **Policy Name:** `Enable access for Admins and respective Teachers`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    -- Admins can do anything
    ((select public.get_my_role()) = 'admin'::text)
    OR
    -- Teachers can view/update their own profile
    (auth_user_id = (select auth.uid()))
  )
  ```


### `timetable_entries` Policies

-   **Policy Name:** `Users can manage and view timetables based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- All authenticated users can read any timetable entry
      (pg_catalog.current_query() ~* 'select')
      OR
      -- Admins can do anything
      ((select public.get_my_role()) = 'admin'::text)
      OR
      -- Teachers can manage their own records (INSERT, UPDATE, DELETE)
      (
        ((select public.get_my_role()) = 'teacher'::text) AND
        (teacher_id = (select public.get_my_teacher_id()))
      )
    )
    ```
    
### `user_roles` Policies

- **Policy Name:** `Enable read for all users and write for admins`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression (for SELECT):**
  ```sql
  true
  ```
- **WITH CHECK expression (for INSERT, UPDATE, DELETE):**
  ```sql
  ((select public.get_my_role()) = 'admin'::text)
  ```
