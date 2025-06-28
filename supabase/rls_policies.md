
# Supabase RLS Policies for the `attendance_records` Table

Here are the simple, copy-pasteable Row Level Security (RLS) policies for the `attendance_records` table.

## How to Apply These Policies

1.  Go to your Supabase project dashboard.
2.  In the left sidebar, click the **Table Editor** icon.
3.  Select the `attendance_records` table.
4.  In the top tabs for the table, click on **Table Policies**.
5.  If RLS is not enabled, click the **Enable RLS** button.
6.  Click **New Policy** and use the details below for each policy you need to create. You can use the "From scratch" option.

---

### Policy 1: Admins have full access

This policy allows any user with the 'admin' role to perform any action on any attendance record.

-   **Policy Name:** `Admins have full access to attendance`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression:**
    ```sql
    (EXISTS ( SELECT 1
       FROM public.user_roles
      WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))
    ```
-   **WITH CHECK expression:**
    ```sql
    (EXISTS ( SELECT 1
       FROM public.user_roles
      WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))
    ```

---

### Policy 2: Teachers can create attendance records for their assigned classes

This policy allows a logged-in teacher to **INSERT** new attendance records, but only if the student belongs to a class they are assigned to.

-   **Policy Name:** `Teachers can create attendance for their students`
-   **Allowed operation:** `INSERT`
-   **Target roles:** `authenticated`
-   **WITH CHECK expression:**
    ```sql
    (EXISTS ( SELECT 1
       FROM public.teachers
      WHERE ((teachers.auth_user_id = auth.uid()) AND (NEW.class_id = ANY (teachers.assigned_classes)))))
    ```

---

### Policy 3: Teachers can manage their own attendance records

This policy allows a teacher to **SELECT**, **UPDATE**, or **DELETE** attendance records that they personally created.

-   **Policy Name:** `Teachers can manage their own attendance records`
-   **Allowed operation:** `SELECT`, `UPDATE`, `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression:**
    ```sql
    (marked_by_teacher_auth_id = auth.uid())
    ```
-   **WITH CHECK expression (for UPDATE):**
     ```sql
    (marked_by_teacher_auth_id = auth.uid())
    ```
---

### Policy 4: Students can view their own attendance

This policy allows a logged-in student to **SELECT** (view) only their own attendance records. They cannot see anyone else's.

-   **Policy Name:** `Students can view their own attendance records`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:**
    ```sql
    (EXISTS ( SELECT 1
       FROM public.students
      WHERE ((students.auth_user_id = auth.uid()) AND (students.student_id_display = attendance_records.student_id_display))))
    ```

---
---

# Supabase RLS Policies for the `academic_results` Table

Here are the **new and improved** RLS policies for the `academic_results` table. These policies use helper functions for better performance and security.

## IMPORTANT: Prerequisite - Run This SQL First

Before applying the policies below, you **must** run the following SQL code in your Supabase SQL Editor. This creates the necessary helper functions that make the policies fast and efficient, preventing performance issues.

Go to `Database` -> `SQL Editor` -> `New query` and paste this entire code block, then click `RUN`.

```sql
-- Helper function to get the role of the currently logged-in user.
-- Returns 'admin', 'teacher', or 'student'.
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

-- Helper function to check if the current user is a registered teacher.
-- Returns true or false.
create or replace function public.is_teacher()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.teachers where auth_user_id = auth.uid()
  );
end;
$$;

-- Helper function to get the student_id_display for the currently logged-in student.
-- Returns the 10-digit student ID.
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
```

---
## `academic_results` Policies

After running the SQL above, you can now apply these policies to the `academic_results` table. Go to the **Table Policies** tab for the table. If you have old policies for `academic_results`, delete them first to avoid conflicts, then add these.

### Policy 1: Admins have full access
-   **Policy Name:** `Admins have full access to results`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.get_my_role() = 'admin'::text)`
-   **WITH CHECK expression:** `(public.get_my_role() = 'admin'::text)`

---

### Policy 2: Teachers can create results for their students
-   **Policy Name:** `Teachers can create results for their students`
-   **Allowed operation:** `INSERT`
-   **Target roles:** `authenticated`
-   **WITH CHECK expression:** `(public.is_teacher() AND (new.teacher_id = auth.uid()))`
    
---

### Policy 3: Teachers can view results they created
-   **Policy Name:** `Teachers can view their own results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.is_teacher() AND (teacher_id = auth.uid()))`

---

### Policy 4: Teachers can manage their UNAPPROVED results
This policy allows teachers to update or delete results they created, but only if an admin has not yet approved them.
-   **Policy Name:** `Teachers can manage their own unapproved results`
-   **Allowed operation:** `UPDATE`, `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression:** `(public.is_teacher() AND (teacher_id = auth.uid()) AND (approval_status <> 'approved'::text))`
-   **WITH CHECK expression (for UPDATE):** `(public.is_teacher() AND (teacher_id = auth.uid()) AND (approval_status <> 'approved'::text))`

---

### Policy 5: Students can view their own PUBLISHED results
This policy allows a student to view their result only if it's approved and the publication date has passed.
-   **Policy Name:** `Students can view their own published results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `((student_id_display = public.get_my_student_id()) AND (approval_status = 'approved'::text) AND (published_at IS NOT NULL) AND (published_at <= now()))`

After running the helper function SQL and adding these policies, your results management system will be securely and performantly configured.
