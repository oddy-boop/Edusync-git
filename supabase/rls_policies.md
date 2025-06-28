# Supabase RLS Policies for St. Joseph's Montessori App

This document contains the RLS policies for various tables in the application. It is structured with prerequisite helper functions first, followed by policies for each table.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates/updates the necessary helper functions that your policies rely on.

**If you see errors, it means this step was missed or is incomplete.** Running this script will fix the errors.

Go to `Database` -> `SQL Editor` -> `New query` in your Supabase project dashboard, paste the entire code block below, and click `RUN`.

--- START COPYING HERE ---
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
--- END COPYING HERE ---


---
## `academic_results` Policies

This single policy controls all access to academic results. **Delete all old policies** for `academic_results` before adding this one.

### Policy 1: `Users can manage and view results based on role`
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
        public.is_my_teacher_record(teacher_id) AND
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

---
## `student_arrears` Policies

This single policy controls access to student arrears records. **Delete all old policies** on this table and replace them with this one.

### Policy 1: `Users can manage and view arrears based on role`
-   **Policy Name:** `Users can manage and view arrears based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** For both `USING` and `WITH CHECK`, copy the code below.

--- START COPYING HERE (for student_arrears policy) ---
```sql
(
  -- Admins can perform any action (SELECT, INSERT, UPDATE, DELETE)
  (public.get_my_role() = 'admin'::text)
  OR
  -- Students can only VIEW their own arrears. The check for 'select' ensures they cannot insert/update/delete.
  (
    (student_id_display = public.get_my_student_id()) AND
    (pg_catalog.current_query() ~* 'select')
  )
)
```
--- END COPYING HERE (for student_arrears policy) ---


---
## `attendance_records` Policies

This single policy secures the attendance records table. **Delete all old policies** for `attendance_records` before adding this one.

### Policy 1: `Users can manage and view attendance based on role`
-   **Policy Name:** `Users can manage and view attendance based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can manage any record
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can manage attendance for students in their assigned classes
      (
        (public.get_my_role() = 'teacher'::text) AND
        (class_id = ANY(public.get_my_assigned_classes()))
      )
      OR
      -- Students can view their own attendance records
      (
        (public.get_my_role() = 'student'::text) AND
        (student_id_display = public.get_my_student_id()) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```

---
## `school_announcements` Policies

This single policy controls who can view and manage school-wide announcements. **Delete all old policies** for `school_announcements` before adding this one.

### Policy 1: `Users can view and manage announcements based on role`
-   **Policy Name:** `Users can view and manage announcements based on role`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:** For both `USING` and `WITH CHECK`, copy the code below.

--- START COPYING HERE (for school_announcements policy) ---
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
--- END COPYING HERE (for school_announcements policy) ---


---
## `timetable_entries` Policies

This single policy controls access to the weekly timetable. **Delete all old policies** for `timetable_entries` before adding this one.

### Policy 1: `Users can manage and view timetables based on role`
-   **Policy Name:** `Users can manage and view timetables based on role`
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
        (public.is_my_teacher_record(teacher_id))
      )
      OR
      -- All authenticated users (including students) can view any timetable
      (
        (auth.role() = 'authenticated'::text) AND
        (pg_catalog.current_query() ~* 'select')
      )
    )
    ```
```