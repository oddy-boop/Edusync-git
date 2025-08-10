
# EduSync Platform

## 1. Project Idea

The EduSync Platform is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust backend using Supabase for the database and authentication.

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

## 6. How to Set Up Environment Variables (Required)

To connect this Next.js project to your backend services, you must set your environment variables.

### **Step 1: Create the `.env` File**

In the **root directory** of your project (the same level as `package.json`), create a new file named exactly **`.env`**.

### **Step 2: Add Your Keys to the `.env` File**

Copy the following template and paste it into your `.env` file. Then, replace the placeholder values (like `your_supabase_project_url`) with your actual keys.

```bash
# ==================================================================
# CORE APPLICATION KEYS (REQUIRED)
# ==================================================================
# Supabase & App URL
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ==================================================================
# THIRD-PARTY SERVICE KEYS (REQUIRED FOR FULL FUNCTIONALITY)
# ==================================================================
# Payment Gateway (Paystack)
# IMPORTANT: For development, use your Paystack TEST keys.
# For production, use your Paystack LIVE keys.
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="your_paystack_public_key"
PAYSTACK_SECRET_KEY="your_paystack_secret_key"

# Email Service (Resend)
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"

# AI Service (Optional - Google Gemini)
GOOGLE_API_KEY="your_google_api_key"

# SMS Service (Optional - Twilio)
# Using a Messaging Service SID is STRONGLY RECOMMENDED for reliable delivery.
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" # Highly Recommended
TWILIO_PHONE_NUMBER="+15017122661" # Fallback if Messaging Service is not used

# ==================================================================
# ANALYTICS (OPTIONAL - Firebase)
# ==================================================================
# Add these if you want to use Firebase Analytics.
# If you leave these blank, Firebase will not be initialized.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=


# ==================================================================
# APPLICATION SETTINGS (OPTIONAL)
# ==================================================================
# Set to 'development' to see temporary passwords on user registration.
# Leave empty or remove for production.
APP_MODE="development" 
```

### **Explanation of Critical Variables**

-   **`NEXT_PUBLIC_SUPABASE_URL`** & **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Found in your Supabase project's **Settings > API** section. These are public keys, safe for the browser.
-   **`SUPABASE_SERVICE_ROLE_KEY`**: Also in **Settings > API**. This is a **secret** key and must never be exposed in the browser.
-   **`NEXT_PUBLIC_SITE_URL`**: **(CRITICAL FOR AUTH)** This is your application's public address.
    -   For local development, use: `http://localhost:3000`
    -   For production (e.g., on Vercel), use your final URL: `https://your-edusync-app.vercel.app`
    -   **Why it's critical:** This URL is used to build the links sent in password reset and user invitation emails. If this is not set correctly, those links will be broken and will not work.
-   **`TWILIO_...`**: Keys for the SMS service. Note that to send SMS with a name (Alphanumeric Sender ID) instead of a number, you may need to pre-register your sender ID with Twilio or your chosen provider, especially for countries like Ghana. This is a carrier requirement to prevent spam. Using a **Messaging Service SID** is the best way to ensure deliverability across all networks.

### **Step 3: IMPORTANT - Match Your Site URL in Supabase**

To ensure that password reset and email confirmation links work correctly, the URL you set for `NEXT_PUBLIC_SITE_URL` **must EXACTLY match** the `Site URL` configured in your Supabase project's Authentication settings.

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Project Settings > Authentication > URL Configuration**.
3.  Set the **Site URL** to be the same value as your `NEXT_PUBLIC_SITE_URL`. For local development, this should be `http://localhost:3000`.
4.  Save the changes in Supabase.

### **Step 4: IMPORTANT - Configure Supabase SMTP for Auth Emails**

For user invitations and password resets to work, you must configure Supabase to use your own email provider (e.g., Resend). The Resend API key you enter in the app's settings page is for *application* emails (like announcements), not for Supabase's built-in authentication emails.

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Project Settings > Authentication > SMTP Settings**.
3.  **Enable Custom SMTP**.
4.  Fill in the details for your provider. For **Resend**, use the following:
    *   **Host:** `smtp.resend.com`
    *   **Port:** `465`
    *   **Username:** `resend`
    *   **Password:** Your Resend API key (the one starting with `re_...`)
    *   **Sender Email:** The email address you set for `EMAIL_FROM_ADDRESS` in your `.env` file. This must be a verified domain in Resend.
5.  Click **"Save"**. Supabase will send a confirmation email. Click the link in that email to activate the custom SMTP settings.

### **Step 5: IMPORTANT - Configure CORS (To Fix "Failed to fetch" Errors)**

The most common reason for the "Failed to fetch" error on a deployed site is a Cross-Origin Resource Sharing (CORS) issue. By default, your Supabase project will only accept requests from its own URL. You must explicitly allow your application's URL.

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Project Settings > API**.
3.  Find the **"CORS Configuration"** section.
4.  In the "Additional allowed origins (CORS)" box, add the URL of your application.
    *   For **local development**, add: `http://localhost:3000`
    *   For your **production site** on Vercel, add its full URL: `https://your-edusync-app.vercel.app`
5.  **Save** the settings. You must do this for both your local development and your deployed application to work correctly.

---

## 7. Deploying to Vercel (IMPORTANT FIX)

Your local `.env` file is **not** uploaded to Vercel for security reasons. You must add the variables to your Vercel project settings manually. This is the most common reason for a deployed site to fail while working locally.

### **Step-by-Step Guide to Add Environment Variables to Vercel:**

1.  **Open Your Project in Vercel:** Log in and navigate to your project dashboard.
2.  **Go to Settings -> Environment Variables.**
3.  **Add Each Variable:** For each key from your `.env` file, you need to add it here. **Copy the names exactly.**

    | Key (Name)                    | Value                                          |
    | ----------------------------- | ---------------------------------------------- |
    | `NEXT_PUBLIC_SUPABASE_URL`    | *Your project's Supabase URL*                  |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Your project's Supabase anon key*             |
    | `SUPABASE_SERVICE_ROLE_KEY`   | *Your project's Supabase service role key*     |
    | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | *Your Paystack Public Key (Use LIVE key for production)* |
    | `PAYSTACK_SECRET_KEY`         | *Your Paystack Secret Key (Use LIVE key for production)* |
    | `GOOGLE_API_KEY`              | *Your Google AI/Gemini API Key* |
    | `RESEND_API_KEY`              | *Your Resend API Key* |
    | `TWILIO_ACCOUNT_SID`          | *Your Twilio Account SID* |
    | `TWILIO_AUTH_TOKEN`           | *Your Twilio Auth Token* |
    | `TWILIO_MESSAGING_SERVICE_SID`| *Your Twilio Messaging Service SID* |
    | `TWILIO_PHONE_NUMBER`         | *(Optional) Your Twilio Sender ID/Number* |
    | `NEXT_PUBLIC_SITE_URL`        | *Your app's full production URL*               |
    | `EMAIL_FROM_ADDRESS`          | *(Optional) Your "from" email address*         |
    | `APP_MODE`                    | *Leave this blank for production*              |
    | `NEXT_PUBLIC_FIREBASE_API_KEY` | *(Optional) Your Firebase API Key* |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | *(Optional) Your Firebase Auth Domain* |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | *(Optional) Your Firebase Project ID* |
    | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | *(Optional) Your Firebase Storage Bucket* |
    | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| *(Optional) Your Firebase Messaging Sender ID* |
    | `NEXT_PUBLIC_FIREBASE_APP_ID` | *(Optional) Your Firebase App ID* |
    | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | *(Optional) Your Firebase Measurement ID* |

    
    *   After entering the Key and Value, **click "Save"** for each variable.

4.  **Configure Webhooks (IMPORTANT)**
    *   To ensure services can communicate with your app, set up webhooks in your service provider dashboards.
    *   **Paystack:** Go to your Paystack Dashboard -> Settings -> API Keys & Webhooks. In the "Webhook URL" field, enter:
        **`https://<your-vercel-app-url>/api/webhooks/paystack`**
    *   **Twilio:** If you configure a Messaging Service and it requires a webhook URL for incoming messages, you can use:
        **`https://<your-vercel-app-url>/api/webhooks/twilio`** (Note: Our app does not process incoming SMS, so this is just to satisfy the setup requirement).

5.  **Redeploy the Application:**
    *   Go to the **"Deployments"** tab in your Vercel project.
    *   Click the **"..."** menu on the most recent deployment and select **"Redeploy"** to apply the new environment variables.








