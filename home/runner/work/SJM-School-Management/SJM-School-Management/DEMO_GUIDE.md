
# EduSync Live Demo Guide & Script

This document provides a comprehensive guide for setting up and conducting a professional, live demonstration of the EduSync platform for potential school clients.

---

## Part 1: Demo Environment Setup Checklist

Before any presentation, ensure your demo instance of EduSync is populated with realistic sample data. This makes the platform feel alive and allows for a smooth presentation flow.

### ✅ Step 1: Configure Core Settings (`/admin/settings`)
-   **School Name:** "Premier Demo Academy"
-   **School Slogan:** "Excellence in Digital Education"
-   **Academic Year:** Set to the current or upcoming academic year (e.g., `2024-2025`).
-   **Logo:** Upload a placeholder or sample logo.

### ✅ Step 2: Create User Accounts
Create the following users to showcase the different roles. **Save their login credentials in a secure place for the demo.**

-   **Admin User (1):**
    -   **Name:** `Admin User`
    -   **Email:** `admin@edusync.demo`

-   **Teacher Users (2):**
    -   **Teacher 1:**
        -   **Name:** `Mrs. Evelyn Ansa`
        -   **Email:** `e.ansa@edusync.demo`
        -   **Assigned Classes:** `Basic 1`, `Basic 2`
    -   **Teacher 2:**
        -   **Name:** `Mr. David Kumi`
        -   **Email:** `d.kumi@edusync.demo`
        -   **Assigned Classes:** `JHS 1`

-   **Student Users (at least 5 across different classes):**
    -   **Student 1 (for detailed showcase):**
        -   **Name:** `Ben Carter`
        -   **Email:** `ben.carter@edusync.demo`
        -   **Grade Level:** `Basic 1`
    -   **Student 2:**
        -   **Name:** `Ama Yeboah`
        -   **Email:** `a.yeboah@edusync.demo`
        -   **Grade Level:** `Basic 1`
    -   **Student 3:**
        -   **Name:** `Kofi Mensah`
        -   **Email:** `k.mensah@edusync.demo`
        -   **Grade Level:** `JHS 1`

### ✅ Step 3: Populate Financial Data
-   **Fee Structure (`/admin/fees`):**
    -   Add at least 2-3 fee items for `Basic 1` for "Term 1" (e.g., Tuition Fee, Books Fee).
    -   Add at least 2-3 fee items for `JHS 1` for "Term 1".
-   **Record a Payment (`/admin/record-payment`):**
    -   Record a partial payment for `Ben Carter` to show how balances work.

### ✅ Step 4: Populate Other Data
-   **Log a Behavior Incident (`/teacher/behavior`):**
    -   Log in as `Mrs. Evelyn Ansa` and log a "Positive Recognition" for `Ama Yeboah`.
-   **Create an Assignment (`/teacher/assignments`):**
    -   Log in as `Mr. David Kumi` and create a "Mathematics" assignment for `JHS 1`.

---

## Part 2: Live Demo Presentation Script

Follow this script for a smooth, 20-25 minute presentation.

### Introduction (2 minutes)
-   **Goal:** Introduce yourself and the problem EduSync solves.
-   **Script:** "Good morning/afternoon. Thank you for your time. My name is [Your Name], and I'm the creator of EduSync. We've spoken with many school administrators who are overwhelmed with manual tasks, from tracking payments to communicating with parents. EduSync was built to solve these challenges by providing a single, easy-to-use platform that connects your entire school community. Today, I'd like to show you a 'day in the life' of a school running on EduSync."

### The Admin Portal (5 minutes)
-   **Goal:** Show high-level control and ease of communication.
-   **Action:** Log in as `admin@edusync.demo`.
-   **Script:**
    1.  "This is the Admin Dashboard, your command center. You get an immediate overview of key statistics like student enrollment and fees collected."
    2.  "Let's start with a common task: making an announcement. Imagine we need to inform everyone about an upcoming PTA meeting."
    3.  **Action:** Navigate to `/admin/announcements`. Click "Create New Announcement".
    4.  **Script:** "We'll create an announcement titled 'Upcoming PTA Meeting' for 'All' users. *[Type a short message]*. With one click, this is saved, and an email notification is sent to all teachers and students."
    5.  "EduSync also simplifies financial management. Here on the **Fee Structure** page, you can easily define all billable items for each class and term, ensuring billing is always accurate and transparent."
    6.  **Action:** Briefly show the fee structure page.

### The Teacher Portal (8 minutes)
-   **Goal:** Showcase tools that make a teacher's life easier.
-   **Action:** Log out. Log in as `e.ansa@edusync.demo`.
-   **Script:**
    1.  "Now, let's see things from a teacher's perspective. I'm logging in as Mrs. Ansa, a Basic 1 teacher."
    2.  "Right on her dashboard, she sees the PTA meeting announcement we just created. No more missed memos."
    3.  "Her first task of the day is attendance." **Action:** Go to `/teacher/attendance`. Select `Basic 1`.
    4.  "The system presents her with a simple list of her students. She can quickly mark them as present, absent, or late. Let's mark Ben and Ama as present. *[Click 'Save']*."
    5.  "Now, let's fast forward to the end of the term. Mrs. Ansa needs to enter results." **Action:** Go to `/teacher/results`.
    6.  "She selects her class, `Basic 1`, the student, `Ben Carter`, and the term. The form is straightforward."
    7.  **Action:** Enter scores for 2-3 subjects for Ben (e.g., English: 40, 45; Maths: 42, 48).
    8.  "Notice how the total score is calculated automatically. Once she's done, she submits this result for the admin's review and approval. This ensures quality control before results are published to students."

### Back to Admin: The Approval Workflow (3 minutes)
-   **Goal:** Show the seamless connection between teacher and admin roles.
-   **Action:** Log out. Log back in as `admin@edusync.demo`.
-   **Script:**
    1.  "Now, I'm the admin again. I've received a notification that a result is ready for review."
    2.  **Action:** Go to `/admin/approve-results`.
    3.  "Here on the approval page, I can see the result submitted by Mrs. Ansa for Ben Carter. I can review the details, and if everything is in order, I approve it with a single click. The result is now ready to be published."

### The Student Portal (5 minutes)
-   **Goal:** Demonstrate the value for students and parents.
-   **Action:** Log out. Log in as `ben.carter@edusync.demo`.
-   **Script:**
    1.  "Finally, let's see what the student and their parents see. I'm logging in as Ben Carter."
    2.  "This is Ben's personal dashboard, where he can see recent news and a summary of his information."
    3.  **Action:** Go to `/student/results`.
    4.  "Because his fees are paid and the result has been approved, his terminal report is immediately available. He can view a detailed breakdown of his performance for the term."
    5.  **Action:** Go to `/student/fees`.
    6.  "He can also view his financial statement at any time. It shows the total amount due, all payments made, and the final outstanding balance. If there's a balance, he has the option to pay it directly from here using a secure online payment gateway."

### Conclusion & Q&A (2 minutes)
-   **Goal:** Summarize the value and open the floor for questions.
-   **Script:** "So, in just a few minutes, we've seen how EduSync creates a seamless flow of information from an admin announcement, to a teacher's daily tasks, through an approval workflow, and finally to the student's personal dashboard. It saves time, reduces errors, and improves communication for everyone. I'd be happy to answer any questions you may have."
