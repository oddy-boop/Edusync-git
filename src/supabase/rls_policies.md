
# Supabase RLS Policies for St. Joseph's Montessori App

## IMPORTANT: Prerequisite - Run This SQL First

This script cleans up old, problematic database triggers and functions, then creates a single, robust trigger to handle new user setup. **Run this entire block in your Supabase SQL Editor to ensure your database is set up correctly.**

--- START COPYING HERE (for Database Setup & Cleanup) ---
```sql
-- CLEANUP: Drop all previous versions of triggers and functions.
-- This ensures a clean slate and optimal performance.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_assign_role on auth.users;
drop trigger if exists on_auth_user_created_create_profile on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_new_user_with_role();
drop function if exists public.handle_new_user_with_role_from_metadata();
drop function if exists public.handle_new_user_with_profile_creation();

-- Create user_roles table if it doesn't exist
create table if not exists public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamp with time zone not null default now()
);
comment on table public.user_roles is 'Stores roles for each user.';

-- This new trigger function is robust and handles profile creation atomically.
create or replace function public.handle_new_user_with_profile_creation()
returns trigger
language plpgsql
security definer -- This is crucial for bypassing RLS
set search_path = public
as $$
declare
  user_role text;
  meta_data jsonb;
begin
  meta_data := new.raw_user_meta_data;
  user_role := meta_data->>'app_role';

  -- If no role is specified in metadata, do nothing.
  if user_role is null then
    return new;
  end if;

  -- Insert the role into the user_roles table
  insert into public.user_roles (user_id, role)
  values (new.id, user_role);

  -- Create a profile based on the role
  if user_role = 'teacher' then
    insert into public.teachers (auth_user_id, full_name, email, contact_number, subjects_taught, assigned_classes)
    values (
      new.id,
      meta_data->>'full_name',
      new.email,
      meta_data->>'contact_number',
      meta_data->>'subjects_taught',
      -- Safely handle the case where assigned_classes is null or not a valid array
      COALESCE((select array_agg(elem::text) from jsonb_array_elements_text(meta_data->'assigned_classes')), '{}'::text[])
    );
  elsif user_role = 'student' then
    insert into public.students (auth_user_id, student_id_display, full_name, date_of_birth, grade_level, guardian_name, guardian_contact, contact_email)
    values (
      new.id,
      meta_data->>'student_id_display',
      meta_data->>'full_name',
      (meta_data->>'date_of_birth')::date,
      meta_data->>'grade_level',
      meta_data->>'guardian_name',
      meta_data->>'guardian_contact',
      new.email
    );
  end if;
  
  -- Note: No 'admin' profile table is created by this trigger.
  -- The admin's identity is stored in auth.users and public.user_roles only.

  return new;
end;
$$;

-- Create the new trigger to replace all old ones.
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_with_profile_creation();


-- OPTIMIZED HELPER FUNCTIONS (for RLS policies)
-- These functions are optimized to be called within a (select ...) subquery to prevent re-evaluation per row.
create or replace function public.get_my_role() returns text language plpgsql as $$ begin return (select role from public.user_roles where user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_student_id() returns text language plpgsql as $$ begin return (select student_id_display from public.students where auth_user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_teacher_id() returns uuid language plpgsql as $$ begin return (select id from public.teachers where auth_user_id = (select auth.uid())); end; $$;
create or replace function public.is_my_teacher_record(p_teacher_id uuid) returns boolean language plpgsql as $$ begin return exists (select 1 from public.teachers where id = p_teacher_id and auth_user_id = (select auth.uid())); end; $$;
create or replace function public.get_my_assigned_classes() returns text[] language plpgsql as $$ begin return (select assigned_classes from public.teachers where auth_user_id = (select auth.uid())); end; $$;

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
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_teacher_id()) = teacher_id) AND
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

### `app_settings` Policies

-   **Policy Name:** `Allow public read and admin write`
-   **Allowed operation:** `ALL`
-   **Target roles:** `anon`, `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      (pg_catalog.current_query() ~* 'select') OR
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
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select public.get_my_teacher_id()))
      ) OR
      (
        (EXISTS (SELECT 1 FROM public.students s WHERE s.auth_user_id = (select auth.uid()) AND s.grade_level = class_id)) AND (pg_catalog.current_query() ~* 'select')
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
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (marked_by_teacher_auth_id = (select auth.uid()))
      ) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
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
    ((select public.get_my_role()) = 'admin'::text) OR
    (
      ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select auth.uid()))
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
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
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
        (pg_catalog.current_query() ~* 'select') OR ((select public.get_my_role()) = 'admin'::text)
    )
    ```

### `student_arrears` Policies
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        (student_id_display = (select public.get_my_student_id())) AND (pg_catalog.current_query() ~* 'select')
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
    ((select public.get_my_role()) = 'admin'::text) OR
    (
      ((select public.get_my_role()) = 'teacher'::text) AND (grade_level = ANY ((select public.get_my_assigned_classes()))) AND (pg_catalog.current_query() ~* 'select')
    ) OR
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
    ((select public.get_my_role()) = 'admin'::text) OR (auth_user_id = (select auth.uid()))
  )
  ```


### `timetable_entries` Policies
-   **Policy Name:** `Users can manage and view timetables based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      (pg_catalog.current_query() ~* 'select') OR
      ((select public.get_my_role()) = 'admin'::text) OR
      (
        ((select public.get_my_role()) = 'teacher'::text) AND (teacher_id = (select public.get_my_teacher_id()))
      )
    )
    ```
    
### `user_roles` Policies
- **Policy Name:** `Admins can manage roles, all can read`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    (pg_catalog.current_query() ~* 'select') OR ((select public.get_my_role()) = 'admin'::text)
  )
  ```

```