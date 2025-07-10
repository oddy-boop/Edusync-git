
# EduSync: The All-in-One School Management Platform

## 1. Introduction

EduSync is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust backend using Supabase for the database and authentication.

This platform is built to be a multi-tenant-ready solution, allowing it to be deployed and configured for any educational institution.

---

## 2. Key Features & Portals

EduSync is built around three distinct, role-based portals, ensuring a focused and intuitive experience for every user.

### The Admin Portal (Centralized Command)
The central hub for managing the entire school's operations.
- **Dashboard:** High-level overview of key statistics, announcements, and system health.
- **User Management:** Create, view, edit, and delete student, teacher, and admin profiles.
- **Fee & Payment Management:** Configure fee structures, record payments, manage student arrears, and download financial statements.
- **Announcements:** Broadcast targeted announcements to the entire school, teachers only, or students only, with automatic email notifications.
- **Academic Moderation:** Review and approve/reject academic results submitted by teachers.
- **System Settings:** Configure application-wide settings, including the current academic year and public website content (branding, about us, admissions info, etc.).

### The Teacher Portal (Empowering Educators)
Provides educators with the tools they need to manage their classes and students effectively.
- **Dashboard:** Personalized view of assigned classes, students, and school announcements.
- **Attendance & Behavior:** Mark daily attendance and log student behavior incidents.
- **Assignment Management:** Create, view, and manage class assignments with file attachments.
- **Results Management:** Enter and submit subject-specific scores for approval.
- **AI Lesson Planner:** A Genkit-powered assistant that generates creative lesson plan ideas based on subject and topic.

### The Student Portal (Engaging Learners)
A personalized space for students to access their academic information.
- **Dashboard:** Central hub showing recent results, announcements, and their timetable.
- **Academic Results:** View detailed term results (payment-gated) and download printable result slips.
- **Progress Tracking:** Visualize academic performance with charts tracking scores over time.
- **Fee Statement:** View a detailed fee statement and pay outstanding fees online via Paystack.
- **Attendance History:** Access a complete log of personal attendance records.

---

## 3. Technical Setup & Deployment Guide

This section provides instructions for setting up and deploying an instance of the EduSync platform.

### **Step 1: Environment Variables (`.env` file)**

To run the application, you must configure your environment variables. Create a file named `.env` in the root of the project and add the keys below.

#### **Core Services (Required)**
-   **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project URL.
-   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase project's public "anonymous" key.
-   **`SUPABASE_SERVICE_ROLE_KEY`**: Your Supabase project's secret "service role" key. **(Highly Sensitive)**
-   **`NEXT_PUBLIC_SITE_URL`**: The full URL of your deployed application (e.g., `https://edusync.yourapp.com`). **(Critical for password reset links)**

#### **Optional Services**
-   **Payment Gateway (Paystack):**
    -   `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`: Your Paystack public key (e.g., `pk_test_...` or `pk_live_...`).
    -   `PAYSTACK_SECRET_KEY`: Your Paystack secret key. **(Highly Sensitive)**
-   **Email Service (Resend):**
    -   `RESEND_API_KEY`: Your API key from Resend.com.
    -   `EMAIL_FROM_ADDRESS`: The verified email address you want to send emails from.
-   **AI Service (Google AI):**
    -   `GOOGLE_API_KEY`: Your API key for Google AI services (Gemini).
-   **Application Mode:**
    -   `APP_MODE`: Set to `development` to enable features like showing temporary passwords on user registration. In production, this should be unset or set to `production`.

### **Step 2: Database Schema & Policies (Crucial Step)**

Before the application can run, the Supabase database must be initialized with the correct schema and security policies. The error `relation "public.app_settings" does not exist` is a clear sign this step was missed.

1.  **Navigate to your Supabase Project.**
2.  Go to the **SQL Editor**.
3.  Open the `src/supabase/policies.md` file in this project.
4.  **Copy the entire content** of the `policies.md` file.
5.  **Paste the entire script** into the Supabase SQL Editor and click **"Run"**.

### **Step 3: Deploying to Vercel**

When deploying to a hosting provider like Vercel, you must add the environment variables from your `.env` file to the project's settings on the platform. Local `.env` files are not uploaded for security reasons.

1.  **Go to your Project Settings on Vercel.**
2.  Navigate to **Environment Variables**.
3.  Add each key-value pair from your `.env` file. Ensure there are no typos.
4.  **Configure Paystack Webhook (If using payments):**
    -   In your Paystack Dashboard -> Settings -> API Keys & Webhooks.
    -   Set the "Webhook URL" to: **`https://<your-deployed-app-url>/api/webhooks/paystack`**.
5.  **Redeploy the Application** to apply the new environment variables.

---

## 4. Technology Stack

- **Framework:** Next.js with App Router & Server Components
- **Language:** TypeScript
- **Styling:** Tailwind CSS with ShadCN UI Components
- **Database & Auth:** Supabase
- **Generative AI:** Google AI Platform via Genkit
- **Deployment:** Vercel
