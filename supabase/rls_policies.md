# Supabase RLS Policies for St. Joseph's Montessori App

This document contains the RLS policies and necessary database modifications for the application.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates/updates the necessary helper functions that your policies rely on.

**Performance Note:** These functions wrap calls like `auth.uid()` inside a `(select auth.uid())`. This is a crucial performance optimization that prevents the function from being re-evaluated for every row in a query, making your database much faster.

Go to `Database` -> `SQL Editor` -> `New query` in your Supabase project dashboard, paste the entire code block below, and click `RUN`.

--- START COPYING HERE (for Helper Functions) ---
```sql
-- Helper function to get the role of the currently logged-in user.
create or replace function public.get_my_role()
returns text
language plpgsql
security definer
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
create or replace function public.get_my_student_id()
returns text
language plpgsql
security definer
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
```
--- END COPYING HERE (for Helper Functions) ---

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
-   **Policy Name:** `Enable access based on user role`
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
        (marked_by_teacher_auth_id = (select auth.uid()))
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
- **Policy Name:** `Enable access for admins and creating teacher`
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

This section guides you through setting up security for file uploads (like school logos). When you create a policy on a storage bucket, it's crucial that the policy expression correctly identifies the bucket. The policies below include the necessary `bucket_id` check.

**Step-by-Step Instructions:**

1.  Navigate to the **Storage** section in your Supabase dashboard and click on the `school-assets` bucket.
2.  In the bucket details pane, click on the **Policies** tab.
3.  **This is important:** You will likely see one or more default policies. **Delete all of them** to avoid conflicts.
4.  Now, create the two new policies below. For each one, click `New policy` and choose `Create a policy from scratch`.

**Policy #1: Allow Public Read Access**

-   **Policy name:** `Allow public read access`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `anon`, `authenticated`
-   **USING expression:**
    ```sql
    (bucket_id = 'school-assets'::text)
    ```
-   Click `Review`, then `Save policy`.

**Policy #2: Allow Admins to Upload and Modify**

-   **Policy name:** `Allow admins to upload/modify`
-   **Allowed operations:** `INSERT`, `UPDATE`, `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    ((bucket_id = 'school-assets'::text) AND (public.get_my_role() = 'admin'::text))
    ```
-   Click `Review`, then `Save policy`.

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
- **Policy Name:** `Enable access based on user role`
- **Allowed operation:** `ALL`
- **Target roles:** `authenticated`
- **WITH CHECK expression:** `(public.get_my_role() = 'admin'::text)`
- **USING expression:**
  ```sql
  (
    -- Admins can view all students
    (public.get_my_role() = 'admin'::text) OR
    -- Teachers can view students in their assigned classes
    (
      (public.get_my_role() = 'teacher'::text) AND
      (grade_level = ANY(public.get_my_assigned_classes()))
    ) OR
    -- Students can view their own profile
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
-   **Policy Name:** `Enable access based on user role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can do anything
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can manage their own records
      (
        (public.get_my_role() = 'teacher'::text) AND
        (teacher_id = public.get_my_teacher_id())
      )
      OR
      -- All authenticated users (including students) can view any timetable
      (
        ((select auth.role()) = 'authenticated'::text) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```
    
### `user_roles` Policies
- **Policy Name:** `Allow admins to see all roles, users see their own`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **USING expression:** 
    ```sql
    (
      -- An admin can see all roles.
      (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (select auth.uid()) AND r.role = 'admin'::text))
      OR
      -- Any user can see their own role.
      (user_id = (select auth.uid()))
    )
    ```
