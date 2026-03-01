# Email Configuration Migration - Per-School API Keys

## Changes Made

### 1. Database Schema Updates
- **Added `from_email` field** to the `schools` table
- **Existing `resend_api_key` field** was already present in the schema
- **Migration file created**: `supabase/migrations/20250909_add_from_email_to_schools.sql`

### 2. API Updates
- **Modified `/api/send-email/route.ts`**: Now fetches Resend API key and from_email from the school's database record instead of environment variables
- **Enhanced error handling**: Better error messages when school configuration is missing
- **School-specific branding**: Email templates now use the school's name and from_email

### 3. Authentication Fixes
- **Fixed dashboard authentication**: Updated `dashboard.actions.ts` to use `createAuthClient()` instead of `createClient()`
- **Fixed notifications**: Updated `notifications.actions.ts` to use `createAuthClient()` for proper user session access

### 4. School Credentials System
- **Updated `getSchoolCredentials.ts`**: Added support for `from_email` field
- **Maintained backward compatibility**: Still falls back to environment variables if school fields are empty
- **Contact form integration**: Contact form already uses this system, now includes from_email support

### 5. Admin Interface
- **New Email Settings Page**: `src/app/admin/email-settings/page.tsx`
- **Admin navigation**: Added "Email Settings" link to admin sidebar
- **User-friendly interface**: Form for admins to configure their school's Resend API key and from_email

## Required Admin Actions

### For Each School Branch:
1. **Navigate to Admin Dashboard → Email Settings**
2. **Configure Resend Integration**:
   - Sign up at [resend.com](https://resend.com)
   - Verify your school's domain
   - Generate an API key
   - Enter API key and verified from_email in the settings page

### Database Migration:
```sql
-- Run this migration to add the from_email field
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS from_email text;
```

## Benefits

### 1. **Multi-tenant Email Support**
- Each school can use their own Resend account and API key
- Separate email domains per school (yourschool.com, otherschool.edu, etc.)
- Independent billing and management

### 2. **Improved Security**
- No shared API keys across different schools
- Each school controls their own email configuration
- Reduced risk if one API key is compromised

### 3. **Better Branding**
- Emails sent from school's own domain (noreply@yourschool.com)
- School-specific email templates with proper school name
- Professional appearance for each institution

### 4. **Easier Management**
- Branch admins can configure their own email settings
- No need for central administrator to manage all API keys
- Self-service configuration through admin dashboard

## Technical Implementation

### Email Sending Flow:
1. **Email request includes school_id**
2. **System fetches school's resend_api_key and from_email from database**
3. **Creates new Resend instance with school-specific API key**
4. **Sends email using school's from_email address**
5. **Records email in database with proper school attribution**

### Fallback Behavior:
- If school fields are empty, system falls back to environment variables
- Maintains compatibility with existing single-tenant setups
- Graceful error handling with helpful error messages

## Testing

### Test Email Functionality:
1. Configure email settings for your school
2. Use the contact form to test incoming emails
3. Use the admin email reply feature to test outgoing emails
4. Verify emails appear with correct sender domain

### Troubleshooting:
- Check that domain is verified in Resend dashboard
- Ensure API key has proper permissions
- Verify from_email matches verified domain
- Check browser console and server logs for detailed error messages

## Migration Path

### Existing Schools:
1. **Current environment-based setup continues to work** as fallback
2. **Gradually migrate** each school to their own Resend account
3. **Update email settings** through the new admin interface
4. **Test email functionality** before removing environment variables

### New Schools:
1. **Set up Resend account** during school onboarding
2. **Configure email settings** immediately after admin account creation
3. **No dependency** on system-wide environment variables
