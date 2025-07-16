# Supabase Maintenance Guide

This guide provides instructions for resolving common warnings from the Supabase Database Linter and for general database maintenance.

## 1. Resolving "Function Search Path Mutable" Warnings

This warning indicates a security risk where a database function could be tricked into executing unintended code. The `get_my_role` function has been fixed in the `policies.md` script.

However, you may still have old, unused functions in your database from previous development stages.

**Action Required:**

1.  Go to your **Supabase Dashboard**.
2.  Navigate to the **SQL Editor**.
3.  In the left sidebar, expand the `public` schema and find the **"Database Functions"** section.
4.  If you see the functions `upsert_teacher_profile` or `set_teacher_auth_user_id`, they are no longer used by the application and should be deleted.
5.  Right-click on each of those functions and select **"Delete function"**. Confirm the deletion.

This will remove the unused, insecure functions and clear the linter warnings.

## 2. Improving Auth Security Settings

The linter has identified two security settings that should be enabled for your project. These are not code issues but are configured in the Supabase Dashboard.

**Action Required:**

1.  Go to your **Supabase Dashboard**.
2.  In the left navigation, go to **Authentication -> Providers**.
3.  Find the **Email** provider and click the three-dot menu to select **"Edit provider"**.
4.  **Leaked Password Protection:** Ensure the toggle for "Enable leaked password protection" is **ON**.
5.  **OTP Expiry:** Find the "OTP Expiry" setting. The recommended value is **3600 seconds (1 hour)** or less. Adjust this value if it is significantly higher.
6.  Click **"Save"** to apply the changes.

These steps will enhance your application's security by preventing users from using known compromised passwords and ensuring one-time passwords expire in a timely manner.
