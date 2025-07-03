
# St. Joseph's Montessori EdTech Platform

## 1. Project Idea

The St. Joseph's Montessori EdTech Platform is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust backend using Supabase for the database and authentication.

---

## 2. Setup and Deployment

### **Step 1: Local Environment Variables (`.env` file)**

First, to run the application on your local machine, create a file named `.env` in the root of the project and add the keys below.

-   **`NEXT_PUBLIC_SUPABASE_URL`**: The public URL of your Supabase project. Found in your Supabase project's **Settings > API** section.
-   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: The public "anonymous" key for your Supabase project. This is safe to expose in the browser.
-   **`SUPABASE_SERVICE_ROLE_KEY`**: The secret "service role" key. **This is highly sensitive and must not be exposed to the browser.** It is used for server-side administrative actions.
-   **`NEXT_PUBLIC_SITE_URL`**: The full URL of your deployed application (e.g., `https://sjm-school-app.vercel.app`). **This is critical for password reset and invitation links to work correctly.**
-   **`RESEND_API_KEY`**: (Optional) Your API key from [Resend](https://resend.com/) for sending emails.
-   **`EMAIL_FROM_ADDRESS`**: (Optional) The email address you want to send emails from (e.g., `noreply@yourdomain.com`).
-   **`GOOGLE_API_KEY`**: (Optional) Your API key for Google AI services (Gemini) for the AI Lesson Planner.
-   **`APP_MODE`**: (Optional) Set to `development` to enable features like showing temporary passwords on user registration. In production, it should be unset or set to `production`.


### **Step 2: Database Schema Setup (Crucial Step)**

After setting your environment variables, you **must** set up your Supabase database schema. The error `relation "public.app_settings" does not exist` means this step has not been completed.

1.  **Navigate to your Supabase Project.**
2.  Go to the **SQL Editor** in the sidebar.
3.  Open the `src/supabase/policies.md` file in this project.
4.  **Copy the entire content** of the `policies.md` file.
5.  **Paste the entire script** into the Supabase SQL Editor.
6.  Click **"Run"**. This will create all the necessary tables and security policies for the application to function correctly.

### **Step 3: Deploying to Vercel (IMPORTANT FIX)**

Your application will fail to build on Vercel if the environment variables are not set correctly in your Vercel project settings. The error `FATAL: Supabase Anon Key is not configured correctly` is a clear sign of this issue.

Your local `.env` file is **not** uploaded for security reasons. You must add the variables to Vercel manually.

1.  **Open Your Project in Vercel:**
    *   Log in to your Vercel account and navigate to your project dashboard.

2.  **Go to Settings -> Environment Variables:**
    *   Click on the **"Settings"** tab, then **"Environment Variables"** in the left sidebar.

3.  **Add Each Variable:**
    *   For each key from your `.env` file, add it here. **Copy and paste the names exactly** to avoid typos.

    | Key (Name)                    | Value                                          |
    | ----------------------------- | ---------------------------------------------- |
    | `NEXT_PUBLIC_SUPABASE_URL`    | *Your project's Supabase URL*                  |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your project's Supabase anon key*             |
    | `SUPABASE_SERVICE_ROLE_KEY`   | *Your project's Supabase service role key*     |
    | `NEXT_PUBLIC_SITE_URL`        | *Your app's full production URL*               |
    | `GOOGLE_API_KEY`              | *(Optional) Your Google AI key*                |
    | `RESEND_API_KEY`              | *(Optional) Your Resend API key*               |
    | `EMAIL_FROM_ADDRESS`          | *(Optional) Your "from" email address*         |

    *   After entering the Key and Value, **click the "Save" button** for each variable.

4.  **Redeploy the Application:**
    *   Go to the **"Deployments"** tab in your Vercel project.
    *   Click the **"..."** (three-dots menu) on the most recent deployment from your `main` branch and select **"Redeploy"**.

This will start a new build using the correct environment variables and will resolve the build error.
---

## 3. The Homepage

The homepage serves as the main entry point for all users.

- **Branding:** Features the school's name, logo, and slogan, which can be dynamically updated from the Admin Settings page.
- **Navigation:** Provides clear, role-based login buttons that direct users to the appropriate portal:
  - Student Portal
  - Teacher Portal
  - Admin Portal
- **Feature Overview:** Showcases the core functionalities of the platform to inform new and existing users of its capabilities.

---

## 4. The Admin Portal

The Admin Portal is the central hub for managing the entire school's operations.

- **Dashboard:** The landing page for administrators. It provides a high-level overview with:
  - Key statistics (total students, teachers, term-based fee collections).
  - Quick action links to common tasks like registering users or recording payments.
  - A feed of recent school-wide announcements and student behavior incidents.
  - A system health check for client-side diagnostics.

- **Announcements:** Create, view, and delete school-wide announcements. Announcements can be targeted to "All", "Students Only", or "Teachers Only". When created, an email notification is automatically sent to the selected audience via Resend.

- **Fee Structure:** Configure the school's fee items for each grade level and academic term (e.g., "Term 1 Tuition Fee" for "Basic 1").

- **Record Payment:** A dedicated form to log new fee payments made by students. The form verifies the student ID and generates a printable receipt upon successful submission.

- **Student Arrears:** View and manage outstanding fee balances carried over from previous academic years. Admins can log payments against arrears, update their status (e.g., "Cleared", "Waived"), or delete incorrect entries.

- **User Management:** A central place to view and manage all registered student and teacher profiles.
  - Edit student and teacher details.
  - Delete users (which also removes their authentication account).
  - Download a detailed annual fee statement for any student.

- **Behavior Logs:** View a complete log of all student behavior incidents (positive or negative) recorded by teachers. Admins can filter, edit, or delete these records.

- **Register Student/Teacher/Admin:** Secure forms accessible only to admins for creating new user accounts. The system handles sending invitations or providing temporary passwords.

- **Approve Results:** A critical moderation page where admins can review academic results submitted by teachers. They can approve results to make them visible to students or reject them with feedback for the teacher.

- **Profile & Settings:**
  - **Profile:** Manage the logged-in admin's own name and password.
  - **Settings:** A powerful page to configure application-wide settings, including the current academic year, school branding (name, logo, etc.), and email notification preferences.

---

## 5. The Teacher Portal

The Teacher Portal provides educators with the tools they need to manage their classes and students effectively.

- **Dashboard:** A personalized landing page showing the teacher's assigned classes, a list of their students, and recent school announcements.

- **Mark Attendance:** An interface to take daily attendance for each assigned class, marking students as "Present", "Absent", or "Late".

- **Attendance Overview:** A summary report showing the attendance records for all students in the teacher's assigned classes.

- **Behavior Tracking:** A form to log positive or negative behavior incidents for any student in their assigned classes.

- **Assignment Management:** Create, view, edit, and delete assignments for specific classes. Teachers can attach files to assignments.

- **Manage Results:** A comprehensive form to enter subject-specific scores (class and exam) for students. The system auto-calculates totals and averages. Once complete, the result is submitted to the admin for approval before it becomes visible to the student.

- **AI Lesson Planner:** A Genkit-powered AI assistant that generates creative lesson plan ideas based on a selected subject and topic, helping teachers with curriculum development.

- **Timetable:** A personal schedule management tool where teachers can create and view their weekly teaching timetable.

- **Profile:** Manage personal profile information, such as contact number and password.

---

## 6. The Student Portal

The Student Portal is a personalized space for students to access their academic information.

- **Dashboard:** A central hub showing key information at a glance:
  - Quick links to common pages.
  - A summary of the most recent academic results.
  - Recent school announcements.
  - A personalized weekly timetable.
  - A summary of their attendance record.

- **Results:** View detailed academic results for each term. Access is "payment-gated"—results are only visible if school fees for the academic year are fully paid. Students can download a printable PDF result slip for any published term.

- **Progress:** A visual representation of academic performance. It includes charts that track the student's overall average score over time and a breakdown of subject scores in the latest term.

- **My Fees:** A detailed fee statement showing a breakdown of fees for the current academic year, all payments made, and the final outstanding balance.

- **My Attendance:** A complete log of the student's personal attendance history, as recorded by teachers.

- **Profile & Settings:**
  - **Profile:** View personal and guardian information on record with the school.
  - **Settings:** Manage personal notification preferences (e.g., enable or disable email alerts for new results).
