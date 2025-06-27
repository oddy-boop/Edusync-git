
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

### Policy 3: Teachers can view, update, and delete records they created

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

After adding these, your attendance system will be securely configured.
