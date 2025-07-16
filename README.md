
# EduSync EdTech Platform

## 1. Project Idea

The EduSync EdTech Platform is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust backend using Supabase for the database and authentication.

---

## 2. The Homepage

The homepage serves as the main entry point for all users.

- **Branding:** Features the school's name, logo, and slogan, which can be dynamically updated from the Admin Settings page.
- **Navigation:** Provides clear, role-based login buttons that direct users to the appropriate portal:
  - Student Portal
  - Teacher Portal
  - Admin Portal
- **Feature Overview:** Showcases the core functionalities of the platform to inform new and existing users of its capabilities.

---

## 3. The Admin Portal

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

## 4. The Teacher Portal

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

## 5. The Student Portal

The Student Portal is a personalized space for students to access their academic information.

- **Dashboard:** A central hub showing key information at a glance:
  - Quick links to common pages.
  - A summary of the most recent academic results.
  - Recent school announcements.
  - A personalized weekly timetable.
  - A summary of their attendance record.

- **Results:** View detailed academic results for each term. Access is "payment-gated"—results are only visible if school fees for the academic year are fully paid. Students can download a printable PDF result slip for any published term.

- **Progress:** A visual representation of academic performance. It includes charts that track the student's overall average score over time and a breakdown of subject scores in the latest term.

- **My Fees:** A detailed fee statement showing a breakdown of fees for the current academic year, all payments made, and the final outstanding balance. It also includes an option to pay outstanding fees online via Paystack.

- **My Attendance:** A complete log of the student's personal attendance history, as recorded by teachers.

- **Profile & Settings:**
  - **Profile:** View personal and guardian information on record with the school.
  - **Settings:** Manage personal notification preferences (e.g., enable or disable email alerts for new results).

---

## 6. Supabase & Services Linking Terms

To connect this Next.js project to your backend services, you must set the following environment variables. Create a file named `.env` in the root of the project and add these keys.

### **Supabase & App URL (Required)**

These are essential for the application to function. You can find the Supabase keys in your project's **Settings > API** section.

-   **`NEXT_PUBLIC_SUPABASE_URL`**: The public URL of your Supabase project.
-   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: The public "anonymous" key for your Supabase project. This is safe to expose in the browser.
-   **`SUPABASE_SERVICE_ROLE_KEY`**: The secret "service role" key. **This is highly sensitive and must not be exposed to the browser.** It is used for server-side administrative actions like creating and deleting users.

-   **`NEXT_PUBLIC_SITE_URL`**: **(CRITICAL FOR AUTH)** The full URL of your deployed application. This tells the app its own address.
    -   **Why it's critical:** This URL is used to build the links sent in password reset and user invitation emails. If this is not set correctly, those links will be broken.
    -   **For local development, use:** `http://localhost:3000`
    -   **For production (e.g., on Vercel), use your final URL:** `https://your-edusync-app.vercel.app`

#### **IMPORTANT: Matching URLs for Auth**
To ensure that password reset and email confirmation links work, the URL you set for `NEXT_PUBLIC_SITE_URL` **must EXACTLY match** the `Site URL` configured in your Supabase project's Authentication settings. Any mismatch (e.g., http vs https, www vs non-www) will cause authentication links to fail.

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Authentication > URL Configuration**.
3.  Set the **Site URL** to be the same value as your `NEXT_PUBLIC_SITE_URL`.
4.  Save the changes in Supabase.

### **Payment Gateway (Paystack)**

For online fee payments. Paystack has a **Test Mode** (for development) and a **Live Mode** (for real money).

-   **`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`**: Your public key from Paystack. In Test Mode, this starts with `pk_test_...`.
-   **`PAYSTACK_SECRET_KEY`**: Your secret key from Paystack. **This is highly sensitive.** In Test Mode, this starts with `sk_test_...`.

**To accept real payments, you must activate your Paystack account:**
1.  Log into your [Paystack Dashboard](https://dashboard.paystack.com/).
2.  Follow the **"Go Live" checklist** in your settings. This involves submitting compliance documents.
3.  Once approved, Paystack will give you **Live API Keys** (starting with `pk_live_...` and `sk_live_...`).
4.  Replace your test keys with the live keys in your `.env` file and your Vercel project settings.

### **Email Service (Optional)**

For sending email notifications (e.g., announcements, password resets).

-   **`RESEND_API_KEY`**: Your API key from [Resend](https://resend.com/).
-   **`EMAIL_FROM_ADDRESS`**: The email address you want to send emails from (e.g., `noreply@yourdomain.com`).

### **SMS Service (Optional)**

For sending SMS notifications.

-   **`TWILIO_ACCOUNT_SID`**: Your Account SID from [Twilio](https://www.twilio.com/).
-   **`TWILIO_AUTH_TOKEN`**: Your Auth Token from Twilio.
-   **`TWILIO_PHONE_NUMBER`**: The Twilio phone number you will use to send messages.

### **AI Service (Optional)**

For the AI Lesson Planner feature.

-   **`GOOGLE_API_KEY`**: Your API key for Google AI services (Gemini).

### **Application Mode (Optional)**

-   **`APP_MODE`**: Set this to `development` to enable features like showing temporary passwords on user registration. In production, it should be unset or set to `production`.

---

## 7. Deploying to Vercel (IMPORTANT FIX)

Your application will fail to build on Vercel if the environment variables are not set correctly in your Vercel project settings. The error `FATAL: Supabase Anon Key is not configured correctly` is a clear sign of this issue.

Your local `.env` file is **not** uploaded for security reasons. You must add the variables to Vercel manually.

### **Step-by-Step Guide to Add Environment Variables to Vercel:**

1.  **Open Your Project in Vercel:**
    *   Log in to your Vercel account.
    *   Navigate to your project dashboard.

2.  **Go to Settings:**
    *   Click on the **"Settings"** tab.

3.  **Find Environment Variables:**
    *   In the sidebar on the left, click on **"Environment Variables"**.

4.  **Add Each Variable:**
    *   You will see a form to add new variables. For each key from your `.env` file, you need to add it here.
    *   **Crucially, ensure there are no typos in the names.** Copy and paste them exactly as listed below.

    | Key (Name)                    | Value                                          |
    | ----------------------------- | ---------------------------------------------- |
    | `NEXT_PUBLIC_SUPABASE_URL`    | *Your project's Supabase URL*                  |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your project's Supabase anon key*             |
    | `SUPABASE_SERVICE_ROLE_KEY`   | *Your project's Supabase service role key*     |
    | `NEXT_PUBLIC_SITE_URL`        | *Your app's full production URL*               |
    | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | *(Optional) Your Paystack public key*        |
    | `PAYSTACK_SECRET_KEY`         | *(Optional) Your Paystack secret key*          |
    | `GOOGLE_API_KEY`              | *(Optional) Your Google AI key*                |
    | `RESEND_API_KEY`              | *(Optional) Your Resend API key*               |
    | `EMAIL_FROM_ADDRESS`          | *(Optional) Your "from" email address*         |
    
    *   After entering the Key and Value, **make sure you click the "Save" button** for each variable.
    *   By default, the variables will apply to all environments (Production, Preview, and Development), which is what you want.

5.  **Configure Paystack Webhook (IMPORTANT)**
    *   To ensure payments are reliably recorded, you must set up a webhook in your Paystack dashboard.
    *   Go to your Paystack Dashboard -> Settings -> API Keys & Webhooks.
    *   In the "Webhook URL" field, enter the full URL to your deployed application's webhook endpoint. It will be:
        **`https://<your-vercel-app-url>/api/webhooks/paystack`**
    *   For example: `https://your-edusync-app.vercel.app/api/webhooks/paystack`
    *   Save your changes in Paystack.

6.  **Redeploy the Application:**
    *   After you have added and saved all the variables, you must trigger a new deployment for the changes to take effect.
    *   Go to the **"Deployments"** tab in your Vercel project.
    *   Click the **"..."** (three-dots menu) on the most recent deployment from your `main` branch.
    *   Select **"Redeploy"** from the dropdown menu and confirm.

This will start a new build using the environment variables you just configured, and it will resolve the build error.
