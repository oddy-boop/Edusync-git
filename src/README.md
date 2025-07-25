
# EduSync Platform - School Management System

## 1. Project Idea

The EduSync Platform is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust backend using Supabase for the database and authentication.

This platform is architected as a multi-tenant SaaS application, allowing for the registration and management of multiple distinct school instances from a single codebase and database, with data securely isolated for each school.

---

## 2. The Homepage (`/portals`)

The homepage serves as the main entry point for all users of any school.

- **Navigation:** Provides clear, role-based login buttons that direct users to the appropriate portal:
  - Student Portal
  - Teacher Portal
  - Admin Portal
- **Feature Overview:** The login page itself showcases the core functionalities of the platform to inform new and existing users of its capabilities.

---

## 3. The Super Admin & School Management

A special `super_admin` role exists to manage the entire platform.

- **Schools Page (`/admin/schools`):** Accessible only to super admins, this page allows for:
    - Creating new school instances on the platform.
    - Editing a school's name and domain.
    - Managing school-specific API keys for services like Paystack (payment gateway), Resend (email), and Google AI (for AI features).
- **Data Isolation:** The system uses Supabase's Row Level Security (RLS) to ensure that data from one school is completely inaccessible to users from another school.

---

## 4. The Admin Portal

The Admin Portal is the central hub for a specific school's operations.

- **Dashboard:** The landing page for administrators. It provides a high-level overview with:
  - Key statistics (total students, teachers, term-based fee collections).
  - Quick action links to common tasks like registering users or recording payments.
  - A feed of recent school-wide announcements and student behavior incidents.
  - A system health check for client-side diagnostics.

- **Announcements:** Create, view, and delete school-wide announcements. Announcements can be targeted to "All", "Students Only", or "Teachers Only".

- **Fee Structure:** Configure the school's fee items for each grade level and academic term (e.g., "Term 1 Tuition Fee" for "Basic 1").

- **Record Payment:** A dedicated form to log new fee payments made by students. The form verifies the student ID and generates a printable receipt upon successful submission.

- **Student Arrears:** View and manage outstanding fee balances carried over from previous academic years. Admins can log payments against arrears, update their status (e.g., "Cleared", "Waived"), or delete incorrect entries.

- **User Management:** A central place to view and manage all registered student and teacher profiles within their school.
  - Edit student and teacher details.
  - Delete users (which also removes their authentication account).
  - Download a detailed annual fee statement for any student.

- **Behavior Logs:** View a complete log of all student behavior incidents (positive or negative) recorded by teachers. Admins can filter, edit, or delete these records.

- **Register Student/Teacher/Admin:** Secure forms accessible only to admins for creating new user accounts for their school.

- **Approve Results:** A critical moderation page where admins can review academic results submitted by teachers. They can approve results to make them visible to students or reject them with feedback for the teacher.

- **Profile & Settings:**
  - **Profile:** Manage the logged-in admin's own name and password.
  - **Settings:** A powerful page to configure application-wide settings for their specific school, including the current academic year, school branding (name, logo, etc.), and email notification preferences.

---

## 5. The Teacher Portal

The Teacher Portal provides educators with the tools they need to manage their classes and students effectively.

- **Dashboard:** A personalized landing page showing the teacher's assigned classes, a list of their students, and recent school announcements.
- **Mark Attendance:** An interface to take daily attendance for each assigned class.
- **Behavior Tracking:** A form to log positive or negative behavior incidents for any student in their assigned classes.
- **Assignment Management:** Create, view, edit, and delete assignments for specific classes.
- **Manage Results:** A comprehensive form to enter subject-specific scores for students.
- **AI Lesson Planner:** A Genkit-powered AI assistant that generates creative lesson plan ideas.
- **Timetable:** A personal schedule management tool where teachers can create and view their weekly teaching timetable.
- **Profile:** Manage personal profile information.

---

## 6. The Student Portal

The Student Portal is a personalized space for students to access their academic information.

- **Dashboard:** A central hub showing key information at a glance.
- **Results:** View detailed academic results for each term. Access can be "payment-gated".
- **Progress:** A visual representation of academic performance with charts.
- **My Fees:** A detailed fee statement showing a breakdown of fees, payments made, and outstanding balance. Allows for online payment.
- **My Attendance:** A complete log of the student's personal attendance history.
- **Profile & Settings:** View personal information and manage notification preferences.

---

## 7. Supabase & Services Linking Terms

To connect this Next.js project to your backend services, you must set the following environment variables. Create a file named `.env` in the root of the project and add these keys.

### **Supabase & App URL (Required)**

-   **`NEXT_PUBLIC_SUPABASE_URL`**: The public URL of your Supabase project.
-   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: The public "anonymous" key for your Supabase project.
-   **`SUPABASE_SERVICE_ROLE_KEY`**: The secret "service role" key. **This is highly sensitive and must not be exposed to the browser.**
-   **`NEXT_PUBLIC_SITE_URL`**: The full URL of your deployed application (e.g., `https://yourapp.vercel.app`).

### **School-Specific API Keys (Managed by Super Admin)**

For a multi-tenant setup, the following keys are **no longer stored in the `.env` file**. Instead, they are managed by the `super_admin` on the `/admin/schools` page for each individual school.

-   **Payment Gateway (Paystack):** `paystack_public_key`, `paystack_secret_key`
-   **Email Service (Resend):** `resend_api_key`
-   **AI Service (Google AI):** `google_api_key`

A `super_admin` must configure these keys in the database for each school to enable those features for that school. The application code will dynamically load the correct key based on the school being accessed.

### **Optional Fallback Keys (for Super Admin actions)**

You may still want to keep these in your `.env` file as a platform-wide fallback, for instance, for sending platform-level emails (not school-specific ones).

-   `RESEND_API_KEY`: Fallback Resend API key.
-   `EMAIL_FROM_ADDRESS`: Default "from" email address.

---
## 8. Critical Setup: Configure Supabase SMTP for Auth Emails

For user invitations and password resets to work, you **must** configure Supabase to use your own email provider (e.g., Resend, Zoho, SendGrid). The API keys you enter in the app's Admin Settings page are for *application* emails (like announcements), **not** for Supabase's built-in authentication emails.

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Project Settings > Authentication > SMTP Settings**.
3.  **Enable Custom SMTP**.
4.  Fill in the details for your provider. **Pay close attention to the `Username` and `Password` fields.**

---

### **Example Configuration for Resend:**

*   **Host:** `smtp.resend.com`
*   **Port:** `465` (or `587`)
*   **Username:** `resend`  *(This is a special case for Resend)*
*   **Password:** Your Resend API key (the one starting with `re_...`)
*   **Sender Email:** The email address you set for `EMAIL_FROM_ADDRESS` in your `.env` file. This must be a verified domain in Resend.

---

### **Example Configuration for Zoho Mail (or other standard providers):**

*   **Host:** `smtp.zoho.com` (or your provider's SMTP host)
*   **Port:** `587` (or `465`)
*   **Username:** `richoddy@zohomail.com`  **(CRITICAL: This must be your full email address, not a display name like "EduSync")**
*   **Password:** Your Zoho Mail account password or an **app-specific password**. (Many providers like Zoho and Gmail require you to generate a special "App Password" for security reasons if you have 2-Factor Authentication enabled).
*   **Sender Email:** `richoddy@zohomail.com` (Must match the username)

---

5.  Click **"Save"**. Supabase will send a confirmation email. Click the link in that email to activate the custom SMTP settings.

If you get an "Error sending invite email", it is almost always because the SMTP settings in the Supabase Dashboard are incorrect, especially the `Username` and `Password`.


## 9. Deploying to Vercel (IMPORTANT FIX)

Your application will fail to build on Vercel if the environment variables are not set correctly in your Vercel project settings. Your local `.env` file is **not** uploaded.

### **Step-by-Step Guide to Add Environment Variables to Vercel:**

1.  **Open Your Project in Vercel.**
2.  **Go to Settings -> Environment Variables.**
3.  **Add Each Required Variable:**

    | Key (Name)                    | Value                                      |
    | ----------------------------- | ------------------------------------------ |
    | `NEXT_PUBLIC_SUPABASE_URL`    | *Your project's Supabase URL*              |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your project's Supabase anon key*         |
    | `SUPABASE_SERVICE_ROLE_KEY`   | *Your project's Supabase service role key* |
    | `NEXT_PUBLIC_SITE_URL`        | *Your app's full production URL*           |
    | `RESEND_API_KEY`              | *(Optional) Your platform Resend API key*  |
    | `EMAIL_FROM_ADDRESS`          | *(Optional) Your platform "from" email*    |

4.  **Configure Paystack Webhook (IMPORTANT)**
    -   To ensure payments are reliably recorded, you must set up a webhook in your Paystack dashboard.
    -   Go to your Paystack Dashboard -> Settings -> API Keys & Webhooks.
    -   In the "Webhook URL" field, enter: `https://<your-vercel-app-url>/api/webhooks/paystack`

5.  **Redeploy the Application:**
    -   Go to the **"Deployments"** tab and redeploy the latest build to apply the new environment variables.
