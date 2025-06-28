
# Supabase RLS Policies for St. Joseph's Montessori App

This document contains the RLS policies and necessary database modifications for the application.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates the necessary tables, helper functions, and database triggers that your policies rely on.

Go to `Database` -> `SQL Editor` -> `New query` in your Supabase project dashboard, paste the entire code block below, and click `RUN`.

--- START COPYING HERE (for Database Setup) ---
```sql
-- Table for storing user roles
create table if not exists public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamp with time zone not null default now()
);

comment on table public.user_roles is 'Stores roles for each user.';


-- Helper function to get the role of the currently logged-in user.
-- BYPASS RLS is added to prevent recursive policy checks.
create or replace function public.get_my_role()
returns text
language plpgsql
security definer
bypass rls
set search_path = public
as $$
begin
  -- Wraps auth.uid() in a SELECT to make it stable and avoid re-evaluating per row.
  return (
    select role from public.user_roles where user_id = (select auth.uid())
  );
end;
$$;

-- Helper function to get the student_id_display for the currently logged-in student.
-- BYPASS RLS is added to prevent recursive policy checks.
create or replace function public.get_my_student_id()
returns text
language plpgsql
security definer
bypass rls
set search_path = public
as $$
begin
  -- Wraps auth.uid() in a SELECT to make it stable and avoid re-evaluating per row.
  return (
    select student_id_display from public.students where auth_user_id = (select auth.uid())
  );
end;
$$;

-- Helper function to get the teacher's profile ID (from the teachers table)
create or replace function public.get_my_teacher_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select id from public.teachers where auth_user_id = (select auth.uid())
  );
end;
$$;


-- Helper function to check if the current user is a teacher and if the provided teacher_id matches their own profile ID.
create or replace function public.is_my_teacher_record(p_teacher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Wraps auth.uid() in a SELECT to make it stable and avoid re-evaluating per row.
  return exists (
    select 1
    from public.teachers
    where id = p_teacher_id and auth_user_id = (select auth.uid())
  );
end;
$$;

-- Helper function to get the list of classes assigned to the current teacher.
create or replace function public.get_my_assigned_classes()
returns text[]
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Wraps auth.uid() in a SELECT to make it stable and avoid re-evaluating per row.
  return (
    select assigned_classes from public.teachers where auth_user_id = (select auth.uid())
  );
end;
$$;

-- Creates a trigger function that assigns the 'admin' role to the first two users that sign up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  admin_count integer;
begin
  -- Set a transaction-local variable that RLS policies can check.
  -- This allows the trigger to bypass RLS checks that would otherwise block it.
  perform set_config('my_app.is_admin_bootstrap', 'true', true);

  -- Check if there are already 2 admins
  select count(*) into admin_count from public.user_roles where role = 'admin';

  -- If there are fewer than 2 admins, assign the new user the 'admin' role
  if admin_count < 2 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  end if;
  
  -- The setting is automatically dropped at the end of the transaction.
  return new;
end;
$$;

-- Drop existing trigger if it exists, to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger to fire after a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

```
--- END COPYING HERE (for Database Setup) ---

---
## Schema Modifications

Sometimes, new features require changes to your database table structures. Run the following commands in the SQL Editor if you encounter errors about missing columns.

### Add `attendance_summary` to `academic_results`

This is required for automatically attaching attendance data to student results.

--- START COPYING HERE (for attendance_summary column) ---
```sql
ALTER TABLE public.academic_results
ADD COLUMN IF NOT EXISTS attendance_summary JSONB;
```
--- END COPYING HERE (for attendance_summary column) ---

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
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can manage their own results, but cannot modify/delete approved ones
      (
        (public.get_my_teacher_id() = teacher_id) AND
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
        (student_id_display = public.get_my_student_id()) AND
        (approval_status = 'approved'::text) AND
        (published_at IS NOT NULL) AND
        (published_at <= now()) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `app_settings` Policies

**IMPORTANT**: To fix the "multiple permissive policies" warning, please **delete all existing policies** on the `app_settings` table before adding this single, consolidated policy.

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
      (public.get_my_role() = 'admin'::text)
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
      (public.get_my_role() = 'admin'::text) OR
      -- Teachers can manage their own assignments
      (
        (public.get_my_role() = 'teacher'::text) AND
        (teacher_id = public.get_my_teacher_id())
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
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can manage their own attendance records
      (
        (public.get_my_role() = 'teacher'::text) AND
        (marked_by_teacher_auth_id = (SELECT auth.uid()))
      )
      OR
      -- Students can view their own attendance records
      (
        (student_id_display = public.get_my_student_id()) AND
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
    (public.get_my_role() = 'admin'::text)
    OR
    -- Teachers can manage their own incidents. `teacher_id` in this table stores auth.uid()
    (
      (public.get_my_role() = 'teacher'::text) AND
      (teacher_id = (SELECT auth.uid()))
    )
  )
  ```

### `fee_payments` Policies

**IMPORTANT**: To fix the "multiple permissive policies" warning, please **delete all existing policies** on the `fee_payments` table before adding this single, consolidated policy.

-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** 
    ```sql
    (
      -- Admins can do anything
      (public.get_my_role() = 'admin'::text) OR
      -- Students can only VIEW their own payments
      (
        (student_id_display = public.get_my_student_id()) AND
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
      (public.get_my_role() = 'admin'::text)
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

This section guides you through setting up security for file uploads (like school logos).

**Step-by-Step Instructions:**

1.  Navigate to the **Storage** section in your Supabase dashboard.
2.  If it doesn't exist, create a new bucket named `school-assets` and make sure 'Public bucket' is checked.
3.  Click on the `school-assets` bucket to open its details pane, then click on the **Policies** tab.
4.  **This is important:** You will likely see one or more default policies. **Delete ALL existing policies** on this bucket to avoid conflicts.
5.  Now, create the two new policies below. For each one, click `New policy` and choose `Create a policy from scratch`.

**Policy #1: Allow Public Read Access**

-   **Policy name:** `Allow public read access`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `anon`, `authenticated`
-   **USING expression:**
    ```sql
    (bucket_id = 'school-assets'::text)
    ```

**Policy #2: Allow Admins to Upload and Modify**

-   **Policy name:** `Allow admins to upload/modify`
-   **Allowed operations:** `INSERT`, `UPDATE`, `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    ((bucket_id = 'school-assets'::text) AND (public.get_my_role() = 'admin'::text))
    ```

### `school_fee_items` Policies
- **Policy 1 Name:** `Allow any authenticated user to view fee items`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **USING expression:** `true`

- **Policy 2 Name:** `Allow admins to manage fee items`
- **Allowed operation:** `INSERT`, `UPDATE`, `DELETE`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:** `(public.get_my_role() = 'admin'::text)`

### `student_arrears` Policies
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can perform any action (SELECT, INSERT, UPDATE, DELETE)
      (public.get_my_role() = 'admin'::text)
      OR
      -- Students can only VIEW their own arrears.
      (
        (student_id_display = public.get_my_student_id()) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

### `students` Policies

**IMPORTANT**: To fix the "multiple permissive policies" warning, please **delete all existing policies** on the `students` table before adding this single, consolidated policy.

- **Policy Name:** `Enable access based on role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:**
  ```sql
  (
    -- Admins can do anything
    (public.get_my_role() = 'admin'::text) OR
    -- Teachers can view students in their assigned classes
    (
      (public.get_my_role() = 'teacher'::text) AND
      (grade_level = ANY(public.get_my_assigned_classes()))
    ) OR
    -- Students can view and update their own profile
    (auth_user_id = (select auth.uid()))
  )
  ```

### `teachers` Policies
- **Policy 1 Name:** `Allow authenticated users to view teacher info`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **USING expression:** `true`

- **Policy 2 Name:** `Allow admins to manage teachers`
- **Allowed operation:** `INSERT`, `UPDATE`, `DELETE`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:** `(public.get_my_role() = 'admin'::text)`


### `timetable_entries` Policies

**IMPORTANT**: To fix the performance warning, please **delete the existing policy** on the `timetable_entries` table before adding this single, optimized policy.

-   **Policy Name:** `Users can manage and view timetables based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can do anything
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can manage their own records (INSERT, UPDATE, DELETE)
      (
        (public.get_my_role() = 'teacher'::text) AND
        (teacher_id = public.get_my_teacher_id())
      )
      OR
      -- All authenticated users can read any timetable entry
      (
        ((select auth.role()) = 'authenticated'::text) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```
    
### `user_roles` Policies

**First, delete any existing policies on the `user_roles` table.**

**Policy 1: Users can view roles**
- **Policy Name:** `Users can view roles`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **USING expression:** 
    ```sql
    (
      (public.get_my_role() = 'admin'::text) OR (user_id = (SELECT auth.uid()))
    )
    ```

**Policy 2: Admins and system can manage roles**
- **Policy Name:** `Admins and system can manage roles`
- **Allowed operations:** `INSERT`, `UPDATE`, `DELETE`
- **Target roles:** `authenticated`
- **USING expression & WITH CHECK expression:** 
    ```sql
    (
      (public.get_my_role() = 'admin'::text) OR (current_setting('my_app.is_admin_bootstrap', true) = 'true')
    )
    ```
