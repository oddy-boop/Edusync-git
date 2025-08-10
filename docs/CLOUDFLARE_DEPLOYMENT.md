
# Deploying Your EduSync App to Cloudflare Pages

This guide provides step-by-step instructions for deploying your Next.js application to Cloudflare Pages.

## Prerequisites

1.  **Cloudflare Account:** You need a free Cloudflare account.
2.  **GitHub/GitLab Repository:** Your application code must be in a Git repository hosted on GitHub or GitLab.
3.  **Local `.env` file:** You should have a complete `.env` file with all your secret keys and configuration variables as described in the main `README.md`.

---

## Step 1: Create a New Cloudflare Pages Project

1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  In the left sidebar, navigate to **Workers & Pages**.
3.  Click on **"Create application"**, then go to the **"Pages"** tab and click **"Connect to Git"**.
4.  Select the Git provider where your code is hosted (e.g., GitHub) and choose the repository for your EduSync application.
5.  Click **"Begin setup"**.

---

## Step 2: Configure Your Build Settings

Cloudflare will automatically detect that you are using Next.js and pre-fill most of these settings.

-   **Project name:** Choose a name for your project (e.g., `my-edusync-app`).
-   **Production branch:** Select your main branch (e.g., `main`).
-   **Framework preset:** This should be set to **Next.js**.
-   **Build command:** Should be automatically set to `next build`.
-   **Build output directory:** Should be automatically set to `.next`.

Leave the "Root directory" blank unless you have a monorepo setup.

---

## Step 3: Add Environment Variables (CRITICAL)

This is the most important step. Your application will not work without these variables.

1.  Scroll down to the **"Environment variables"** section.
2.  For each variable in your local `.env` file, you need to add it here. Click **"Add variable"** for each one.
    -   **IMPORTANT:** Add variables for **both Production and Preview** environments to ensure your preview deployments also work.

    **Required Variables:**
    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   `SUPABASE_SERVICE_ROLE_KEY`
    -   `NEXT_PUBLIC_SITE_URL` -> **Set this to `http://localhost:3000` for now.** We will update it after the first deployment.
    -   `PAYSTACK_PUBLIC_KEY`
    -   `PAYSTACK_SECRET_KEY`
    -   `RESEND_API_KEY`
    -   `EMAIL_FROM_ADDRESS`
    -   `GOOGLE_API_KEY`
    -   `TWILIO_ACCOUNT_SID`
    -   `TWILIO_AUTH_TOKEN`
    -   `TWILIO_MESSAGING_SERVICE_SID`
    -   `TWILIO_PHONE_NUMBER`

    **For variables that are secrets (like `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, etc.), click the "Encrypt" button after adding them.**

3.  Once all variables are added, click **"Save and Deploy"**.

The first deployment will begin. It might take a few minutes.

---

## Step 4: Update URLs After First Deployment

After your first successful deployment, Cloudflare will provide you with a unique URL for your project (e.g., `https://my-edusync-app.pages.dev`). You now need to update your environment variables and Supabase settings to use this new URL.

**1. Update `NEXT_PUBLIC_SITE_URL` in Cloudflare:**
   - Go back to your project's **Settings -> Environment variables**.
   - Edit the `NEXT_PUBLIC_SITE_URL` variable for both Production and Preview.
   - Change its value from `http://localhost:3000` to your new Cloudflare Pages URL (e.g., `https://my-edusync-app.pages.dev`).
   - Save the changes. This will automatically trigger a new deployment.

**2. Update Supabase `Site URL`:**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard).
   - Navigate to **Project Settings -> Authentication -> URL Configuration**.
   - Set the **Site URL** to be the same value as your new Cloudflare Pages URL.
   - Click **"Save"**.

**3. Update Supabase CORS Settings:**
   - In Supabase, navigate to **Project Settings -> API**.
   - Find the **"CORS Configuration"** section.
   - In the "Additional allowed origins (CORS)" box, add your new Cloudflare Pages URL. You can keep `http://localhost:3000` for local development.
   - **Save** the settings.

**4. Update Paystack Webhook URL (if using payments):**
   - Go to your Paystack Dashboard -> Settings -> API Keys & Webhooks.
   - In the "Webhook URL" field, enter: **`https://<your-app-url>/api/webhooks/paystack`**.
   - Replace `<your-app-url>` with your Cloudflare Pages URL.

---

## Step 5: Final Redeployment

Your last change to the environment variables in Cloudflare should have already started a new deployment. Wait for it to complete. Once it's done, your application will be live and fully configured!

From now on, every time you push a change to your production branch on GitHub/GitLab, Cloudflare Pages will automatically build and deploy the new version of your application.
