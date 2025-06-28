# Supabase RLS Policies for St. Joseph's Montessori App

This document contains the RLS policies for various tables in the application. It is structured with prerequisite helper functions first, followed by policies for each table.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates/updates the necessary helper functions. If you have run a previous version of this, running it again will safely update the functions.

Go to `Database` -> `SQL Editor` -> `New query` and paste this entire code block, then click `RUN`.

```sql
-- Helper function to get the role of the currently logged-in user.
create or replace function public.get_my_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select role from public.user_roles where user_id = auth.uid()
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
  return (
    select student_id_display from public.students where auth_user_id = auth.uid()
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
  return exists (
    select 1
    from public.teachers
    where id = p_teacher_id and auth_user_id = auth.uid()
  );
end;
$$;
```

---
## `academic_results` Policies

After running the SQL above, you can now apply these policies to the `academic_results` table. **Please delete all old policies** for `academic_results` to avoid conflicts, then add these new ones.

### Policy 1: Users can view results based on their role
-   **Policy Name:** `Users can view results based on their role`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** 
    ```sql
    (
      -- Admins can see everything
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can see results they created
      (public.is_my_teacher_record(teacher_id))
      OR
      -- Students can see their own published results
      (
        (student_id_display = public.get_my_student_id()) AND
        (approval_status = 'approved'::text) AND
        (published_at IS NOT NULL) AND
        (published_at <= now())
      )
    )
    ```

### Policy 2: Admins and Teachers can insert results
-   **Policy Name:** `Admins and Teachers can insert results`
-   **Allowed operation:** `INSERT`
-   **Target roles:** `authenticated`
-   **WITH CHECK expression:**
    ```sql
    (
      (public.get_my_role() = 'admin'::text)
      OR
      (public.is_my_teacher_record(teacher_id))
    )
    ```

### Policy 3: Admins and Teachers can update specific results
-   **Policy Name:** `Admins and Teachers can update specific results`
-   **Allowed operation:** `UPDATE`
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (
      -- Admins can update anything
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can update their own unapproved results
      (
        public.is_my_teacher_record(teacher_id) AND
        (approval_status <> 'approved'::text)
      )
    )
    ```

### Policy 4: Admins and Teachers can delete specific results
-   **Policy Name:** `Admins and Teachers can delete specific results`
-   **Allowed operation:** `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression:**
    ```sql
    (
      -- Admins can delete anything
      (public.get_my_role() = 'admin'::text)
      OR
      -- Teachers can delete their own unapproved results
      (
        public.is_my_teacher_record(teacher_id) AND
        (approval_status <> 'approved'::text)
      )
    )
    ```

---
## `student_arrears` Policies

These policies control access to the student arrears records.

### Policy 1: Users can view arrears based on role
-   **Policy Name:** `Users can view arrears based on role`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:**
    ```sql
    (
      -- Admins can see all arrears
      (public.get_my_role() = 'admin'::text)
      OR
      -- Students can see their own arrears
      (student_id_display = public.get_my_student_id())
    )
    ```

### Policy 2: Admins can manage all arrear records
-   **Policy Name:** `Admins can manage all arrear records`
-   **Allowed operation:** `ALL` (Covers INSERT, UPDATE, DELETE)
-   **Target roles:** `authenticated`
-   **USING expression & WITH CHECK expression:**
    ```sql
    (public.get_my_role() = 'admin'::text)
    ```
