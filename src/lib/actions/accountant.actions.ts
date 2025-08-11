
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const registerAccountantSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for an already logged-in admin to invite an accountant
export async function registerAccountantAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = registerAccountantSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages}`,
      errors: validatedFields.error.issues,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDevelopmentMode = process.env.APP_MODE === 'development';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error for database." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
  });
  
  try {
    const { fullName, email } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();
    let temporaryPassword: string | null = null;
    let authUserId: string;

    if (isDevelopmentMode) {
      const tempPass = randomBytes(12).toString('hex');
      temporaryPassword = tempPass;
      const { data: devUser, error: devError } = await supabaseAdmin.auth.admin.createUser({
        email: lowerCaseEmail,
        password: tempPass,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'accountant' },
      });
      if (devError) throw devError;
      authUserId = devUser.user.id;
    } else {
      const redirectTo = `${siteUrl}/auth/update-password`;
      const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName, role: 'accountant' }, redirectTo }
      );
      if (inviteError) throw inviteError;
      authUserId = invitedUser.user.id;
    }
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: authUserId, role: 'accountant' }, { onConflict: 'user_id' });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new Error(`Failed to assign accountant role: ${roleError.message}`);
    }

    const successMessage = isDevelopmentMode && temporaryPassword
      ? `Accountant ${fullName} created in dev mode. Share their temporary password securely.`
      : `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword,
    };

  } catch (error: any) {
    console.error('Accountant Registration Action Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred during registration.';
     if (error.message && error.message.toLowerCase().includes('user already registered')) {
        userMessage = `An account with the email ${validatedFields.data.email} already exists.`;
    } else if (error.message && error.message.toLowerCase().includes('error sending invite email')) {
        userMessage = "Could not send invitation email. This usually means the SMTP settings in the Supabase Dashboard are not correctly configured. Please see the README file for instructions."
    }
    return {
      success: false,
      message: userMessage,
    };
  }
}
