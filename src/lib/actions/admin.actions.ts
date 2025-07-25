
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for an already logged-in admin to invite another admin
export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = registerAdminSchema.safeParse({
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
        user_metadata: { full_name: fullName, role: 'admin' },
      });
      if (devError) throw devError;
      authUserId = devUser.user.id;
    } else {
      const redirectTo = `${siteUrl}/auth/update-password`;
      const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName, role: 'admin' }, redirectTo }
      );
      if (inviteError) throw inviteError;
      authUserId = invitedUser.user.id;
    }
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: authUserId, role: 'admin' }, { onConflict: 'user_id' });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new Error(`Failed to assign admin role: ${roleError.message}`);
    }

    const successMessage = isDevelopmentMode && temporaryPassword
      ? `Admin ${fullName} created in dev mode. Share their temporary password securely.`
      : `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
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

// Action for the initial one-time setup page.
const firstAdminFormSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function createFirstAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = firstAdminFormSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check the fields and try again.",
      errors: validatedFields.error.issues,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error for database." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: existingSuperAdmins, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact' })
      .eq('role', 'super_admin');
      
    if (checkError) throw checkError;

    if (existingSuperAdmins && existingSuperAdmins.length > 0) {
      return { success: false, message: "A super administrator already exists. This page is for one-time use only." };
    }
    
    const { fullName, email, password } = validatedFields.data;
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'super_admin' },
    });
    
    if (createError) throw createError;

    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role: 'super_admin' });

    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Failed to assign super_admin role: ${roleError.message}`);
    }

    return {
        success: true,
        message: `Super Admin ${fullName} created successfully. You can now log in. Remember to delete the registration page file for security.`,
    };

  } catch (error: any) {
    console.error('First Admin Creation Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred.';
    if (error.message?.toLowerCase().includes('user already registered')) {
        userMessage = `An account with the email ${validatedFields.data.email} already exists.`;
    } else if (error.message && error.message.toLowerCase().includes('error sending invite email')) {
        userMessage = "Could not send invitation email. This usually means the SMTP settings in the Supabase Dashboard are not correctly configured. Please see the README file for instructions."
    }
    return { success: false, message: userMessage };
  }
}
