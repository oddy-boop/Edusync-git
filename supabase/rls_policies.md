
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

After adding these, your attendance system will be securely configured.

---
---

# Supabase RLS Policies for the `academic_results` Table

Here are the refined, simple, copy-pasteable Row Level Security (RLS) policies for the `academic_results` table. These policies ensure that data is secure and that users can only perform actions they are authorized to.

## How to Apply These Policies

1.  Go to your Supabase project dashboard and navigate to the `academic_results` table.
2.  Go to the **Table Policies** tab and click **New Policy**.
3.  Use the "From scratch" option and copy the details below for each of the five policies.

---

### Policy 1: Admins have full access
Gives administrators complete control over all academic results.
-   **Policy Name:** `Admins have full access to results`
-   **Allowed operation:** `ALL`
-   **Target roles:** `authenticated`
-   **USING expression:** `(EXISTS ( SELECT 1 FROM public.user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))`
-   **WITH CHECK expression:** `(EXISTS ( SELECT 1 FROM public.user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))`

---

### Policy 2: Teachers can create results
Allows a logged-in user who is a registered teacher to insert new result records for themselves.
-   **Policy Name:** `Teachers can create results`
-   **Allowed operation:** `INSERT`
-   **Target roles:** `authenticated`
-   **WITH CHECK expression:** `((EXISTS ( SELECT 1 FROM public.teachers WHERE (teachers.auth_user_id = auth.uid()))) AND (new.teacher_id = auth.uid()))`
    
---

### Policy 3: Teachers can view their own results
Allows teachers to view any result record they have created, regardless of its approval status.
-   **Policy Name:** `Teachers can view their own results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `(teacher_id = auth.uid())`

---

### Policy 4: Teachers can update and delete UNAPPROVED results
This is a critical security rule. It allows teachers to modify or delete their records **only if** the result has not yet been approved by an admin.
-   **Policy Name:** `Teachers can manage their own unapproved results`
-   **Allowed operation:** `UPDATE`, `DELETE`
-   **Target roles:** `authenticated`
-   **USING expression:** `((teacher_id = auth.uid()) AND (approval_status <> 'approved'::text))`
-   **WITH CHECK expression:** `((teacher_id = auth.uid()) AND (approval_status <> 'approved'::text))`

---

### Policy 5: Students can view their own PUBLISHED results
Allows a student to view their own result only if it has been **approved** by an admin and the **publication date** has passed.
-   **Policy Name:** `Students can view their own published results`
-   **Allowed operation:** `SELECT`
-   **Target roles:** `authenticated`
-   **USING expression:** `((EXISTS ( SELECT 1 FROM public.students WHERE ((students.auth_user_id = auth.uid()) AND (students.student_id_display = academic_results.student_id_display)))) AND (approval_status = 'approved'::text) AND (published_at IS NOT NULL) AND (published_at <= now()))`

After adding these, your results management system will be securely and logically configured.
```