
# EduSync Mobile App - Project Blueprint

## 1. Project Overview

**EduSync Mobile** is a multi-tenant, role-based school management system designed as a mobile application for iOS and Android using Flutter. The platform enables multiple schools to operate independently on a single backend infrastructure, with data securely segregated. It provides dedicated portals for School Administrators, Teachers, and Students, each with features tailored to their specific roles. A Super Admin will manage the creation and configuration of individual school instances.

---

## 2. Core Architectural Concept: Multi-Tenancy

The entire system is built around a multi-tenant database architecture.

-   **`schools` Table:** A central table managed only by the Super Admin. Each row represents a unique school instance and will hold school-specific information, including its name, branding assets, and crucial API keys (for payments, email, etc.).
-   **`school_id` Foreign Key:** Nearly every other data table (`students`, `teachers`, `announcements`, `fee_items`, etc.) **must** have a `school_id` foreign key.
-   **Data Segregation:** All database queries for school data **must** be filtered by the `school_id` of the currently logged-in user's institution. This is the most critical rule for ensuring data privacy and security between schools.

---

## 3. User Roles & Portals

The app will feature four distinct roles, with three accessible via the mobile app.

### 3.1. Super Admin (Web-Based Recommended)

This role is for platform management and is best suited for a simple, secure web interface rather than being part of the main mobile app.

-   **Functionality:**
    -   Create, view, and edit school instances in the `schools` table.
    -   Configure school-specific API keys (Paystack, Resend, Google AI).
    -   Oversee the entire platform.

### 3.2. School Admin (Mobile Portal)

-   **Authentication:** Standard email and password. Login screen should have a "School Selector" or ask for a school-specific domain/ID first.
-   **Core Features:**
    -   **Dashboard:** High-level stats for their school (student/teacher count, fee collection).
    -   **User Management:** Create, view, edit, and delete Student and Teacher profiles for their school.
    -   **Fee Structure:** Define fee items and amounts for different grades and terms.
    -   **Announcements:** Post and manage school-wide announcements.
    -   **Approve Results:** Review and approve/reject academic results submitted by teachers.
    -   **School Settings:** Manage their school's branding (logo, name, colors), current academic year, and notification settings.

### 3.3. Teacher (Mobile Portal)

-   **Authentication:** Standard email and password (scoped to their school).
-   **Core Features:**
    -   **Dashboard:** View assigned classes and upcoming schedule.
    -   **Attendance:** Mark daily attendance for assigned classes.
    -   **Assignment Management:** Create, distribute, and view assignments.
    -   **Behavior Logging:** Record positive or negative student behavior incidents.
    -   **Manage Results:** Input student scores for tests and exams and submit them for admin approval.
    -   **AI Lesson Planner:** An AI-powered assistant to generate lesson plan ideas.

### 3.4. Student (Mobile Portal)

-   **Authentication:** School-issued Student ID and password.
-   **Core Features:**
    -   **Dashboard:** Personalized view of recent results, announcements, and timetable.
    -   **View Results:** Access term-by-term academic results (gated by fee payment status).
    -   **Fee Statement:** See a detailed breakdown of fees, payments made, and outstanding balance.
    -   **Online Payments:** Integrate a payment gateway (like Paystack) to allow fee payment directly within the app.
    -   **View Attendance:** See their personal attendance history.

---

## 4. UI/UX & Style Guide

A consistent and professional design is key.

-   **Color Palette:**
    -   **Primary:** Dark Navy (`#2C3E50`) - Used for headers, primary buttons, and major UI elements.
    -   **Background:** Very Light Grayish Blue (`#E0E5EA`) - For screen backgrounds to provide a soft, professional feel.
    -   **Accent:** Gold/Yellow (`#FFEE7E`) - Used for highlights, calls-to-action, and important icons.
    -   **Destructive/Error:** A standard red, like `#e53e3e`.
    -   **Success:** A standard green, like `#38a169`.

-   **Typography:**
    -   **Font:** 'PT Sans' (Sans-Serif). It's modern, highly readable on mobile screens, and has a touch of personality.
    -   **Hierarchy:** Use clear font weights and sizes to distinguish between titles, subtitles, and body text.

-   **Component Design:**
    -   **Cards:** Use cards with rounded corners and subtle drop shadows to organize information.
    -   **Buttons:** Primary actions should use the primary color. Secondary actions can be outlined or use a lighter shade.
    -   **Icons:** Use a clean, modern icon set (like `lucide-flutter` or Material Icons) that is intuitive and universally understood.
    -   **Forms:** Inputs should be clean, with clear labels and validation messages.

-   **Layout:**
    -   Emphasize a clean, uncluttered layout. Use whitespace effectively.
    -   Ensure a clear visual hierarchy to guide the user's attention.
    -   Implement smooth transitions and subtle animations for a polished user experience.

---

## 5. Conceptual Database Schema (Supabase)

This is a high-level overview of the necessary tables.

-   `schools`: (id, name, domain, paystack_key, resend_key, etc.)
-   `users`: (Supabase's built-in `auth.users` table)
-   `user_roles`: (user_id, role, **school_id**)
-   `students`: (id, auth_user_id, **school_id**, student_id_display, full_name, grade_level, etc.)
-   `teachers`: (id, auth_user_id, **school_id**, full_name, email, assigned_classes, etc.)
-   `announcements`: (id, **school_id**, title, message, target_audience)
-   `fee_items`: (id, **school_id**, grade_level, term, description, amount)
-   `fee_payments`: (id, **school_id**, student_id, amount_paid, payment_date)
-   `academic_results`: (id, **school_id**, student_id, teacher_id, term, year, subject_results [jsonb], approval_status)
-   `assignments`: (id, **school_id**, teacher_id, class_id, title, due_date)
-   `attendance_records`: (id, **school_id**, student_id, date, status)
-   `behavior_incidents`: (id, **school_id**, student_id, teacher_id, type, description)
-   `timetable_entries`: (id, **school_id**, teacher_id, day_of_week, periods [jsonb])

---

## 6. Development & Technology Stack

-   **Mobile Framework:** Flutter
-   **Backend & Database:** Supabase (PostgreSQL with Row Level Security)
-   **Authentication:** Supabase Auth
-   **Storage:** Supabase Storage (for school logos, assignment files, etc.)
-   **AI Features:** Genkit/Google AI (via a secure serverless function or backend endpoint)
-   **Email:** Resend (or another provider, via backend)
-   **Payments:** Paystack (or another provider)
