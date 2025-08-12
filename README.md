
# EduSync Platform

## 1. Project Idea

The EduSync Platform is a comprehensive, modern, and user-centric school management system designed to streamline administrative tasks, enhance communication, and empower students, teachers, and administrators. It provides distinct, role-based portals that cater to the specific needs of each user group, all powered by a robust PostgreSQL backend, making it suitable for hosting on platforms like Railway.

---

## 2. How to Set Up Environment Variables (Required)

To run this Next.js project, you must set your environment variables. Most hosting providers (like Railway, Vercel, Netlify) have a section in their project settings for this.

### **Step 1: Create the `.env` File (for Local Development)**

In the **root directory** of your project (the same level as `package.json`), create a new file named exactly **`.env`**.

### **Step 2: Add Your Keys to the `.env` File**

Copy the following template and paste it into your `.env` file. Then, replace the placeholder values with your actual keys.

```bash
# ==================================================================
# CORE APPLICATION KEYS (REQUIRED)
# ==================================================================
# PostgreSQL Database Connection URL (e.g., from Railway or Neon)
POSTGRES_URL="postgres://user:password@host:port/database"

# A long, secret string for encrypting user sessions.
# Generate one using: openssl rand -base64 32
SECRET_COOKIE_PASSWORD="your-long-secret-password-for-sessions"

# The public URL of your deployed application
# For local dev: http://localhost:3000
# For production: https://your-app.com
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ==================================================================
# THIRD-PARTY SERVICE KEYS (REQUIRED FOR FULL FUNCTIONALITY)
# ==================================================================
# Email Service (Resend)
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"

# Payment Gateway (Paystack)
# IMPORTANT: For development, use your Paystack TEST keys.
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="your_paystack_public_key"
PAYSTACK_SECRET_KEY="your_paystack_secret_key"

# AI Service (Optional - Google Gemini)
GOOGLE_API_KEY="your_google_api_key"

# SMS Service (Optional - Twilio)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_PHONE_NUMBER="+15017122661"

# ==================================================================
# APPLICATION SETTINGS (OPTIONAL)
# ==================================================================
# Set to 'development' to see temporary passwords on user registration.
# Leave empty or remove for production.
APP_MODE="development"
```

### **Explanation of Critical Variables**

-   **`POSTGRES_URL`**: This is the full connection string to your PostgreSQL database. If you use Railway, you can get this from your PostgreSQL service's "Connect" tab.
-   **`SECRET_COOKIE_PASSWORD`**: This is crucial for security. It encrypts the user's login session. Generate a random, long string for this value.
-   **`NEXT_PUBLIC_SITE_URL`**: **(CRITICAL FOR AUTH)** This is your application's public address. It's used to build the links sent in password reset emails. If this is not set correctly, those links will be broken.

### **Step 3: Run the Database Schema**

You need to set up the database tables and functions for the application to work.

1.  Connect to your PostgreSQL database using a tool like TablePlus, DBeaver, or the psql command line.
2.  Copy the entire content of the `src/supabase/schema.md` file.
3.  Paste and run the SQL script in your database client. This will create all the necessary tables like `users`, `schools`, `students`, etc.

This step is essential. Without the database tables, the application cannot store any data.

---

## 3. Deploying Your App to Railway

Railway is an excellent choice for hosting this application because it can manage both your Next.js app and your PostgreSQL database in one place.

1.  **Push to GitHub**: Make sure your code is in a GitHub repository.
2.  **Create a Railway Project**: Sign up for Railway and create a new project.
3.  **Deploy from GitHub**: Connect your GitHub account and choose your application's repository. Railway will automatically detect it's a Next.js app and deploy it.
4.  **Add a PostgreSQL Database**: In your Railway project, click "New" -> "Database" -> "PostgreSQL".
5.  **Set Environment Variables**: Go to your Next.js service's "Variables" tab in Railway.
    *   Railway automatically provides the `POSTGRES_URL`. You don't need to add it manually.
    *   Add all the other variables from your `.env` file (`SECRET_COOKIE_PASSWORD`, `RESEND_API_KEY`, etc.) as secrets.
6.  **Set `NEXT_PUBLIC_SITE_URL`**: Set this variable to the public URL that Railway provides for your application (e.g., `https://my-edusync-app.up.railway.app`).
7.  **Run Schema**: Connect to your new Railway PostgreSQL database using the connection string they provide and run the SQL from `src/supabase/schema.md` as described in Step 3 above.

Your application should now be live and fully functional on Railway.
