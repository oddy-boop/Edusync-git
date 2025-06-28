# Supabase RLS Policies for the `academic_results` Table

Here are the **new and improved** RLS policies for the `academic_results` table. These policies use helper functions for better performance and security, which should resolve the error you were seeing.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates/updates the necessary helper functions. If you have run the previous version, running this again will safely update the functions.

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

-- NEW/UPDATED HELPER FUNCTION
-- Checks if the current user is a teacher and if the provided teacher_id matches their own auth.uid().
create or replace function public.is_my_teacher_record(p_teacher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- First, check if the current user is a teacher at all.
  if not exists (select 1 from public.teachers where auth_user_id = auth.uid()) then
    return false;
  end if;
  
  -- Then, check if the record's teacher_id matches the current user's id.
  return p_teacher_id = auth.uid();
end;
$$;

-- Dropping the old is_teacher() function as it's replaced by the more specific is_my_teacher_record().
-- This is optional but good for cleanup. It will error if it doesn't exist, which is safe to ignore.
drop function if exists public.is_teacher();
```

---
## `academic_results` Policies

After running the SQL above, you can now apply these policies to the `academic_results` table. If you have old policies for `academic_results`, please **delete them first** to avoid conflicts, then add these new ones.

### Policy 1: Admins have full access
-   **Policy Name:** `Admins have full access to results`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.get_my_role() = 'admin'::text)`
-   **WITH CHECK expression:** `(public.get_my_role() = 'admin'::text)`

---

### Policy 2: Teachers can INSERT results for themselves
-   **Policy Name:** `Teachers can INSERT their own results`
-   **Allowed operation:** `INSERT`
-   **Target roles:** `authenticated`
-   **WITH CHECK expression:** `public.is_my_teacher_record(teacher_id)`

---

### Policy 3: Teachers can UPDATE their UNAPPROVED results
-   **Policy Name:** `Teachers can UPDATE their own unapproved results`
-   **Allowed operation:** `UPDATE`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.is_my_teacher_record(teacher_id) AND (approval_status <> 'approved'::text))`
-   **WITH CHECK expression:** `(public.is_my_teacher_record(teacher_id) AND (approval_status <> 'approved'::text))`

---

### Policy 4: Teachers can DELETE their UNAPPROVED results
-   **Policy Name:** `Teachers can DELETE their own unapproved results`
-   **Allowed operation:** `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.is_my_teacher_record(teacher_id) AND (approval_status <> 'approved'::text))`

---

### Policy 5: Teachers can SELECT their own results
-   **Policy Name:** `Teachers can SELECT their own results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `public.is_my_teacher_record(teacher_id)`

---

### Policy 6: Students can view their own PUBLISHED results
-   **Policy Name:** `Students can view their own published results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `((student_id_display = public.get_my_student_id()) AND (approval_status = 'approved'::text) AND (published_at IS NOT NULL) AND (published_at <= now()))`
