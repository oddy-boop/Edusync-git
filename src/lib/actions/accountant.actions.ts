
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

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
  const supabase = createClient();
  const { data: { user: superAdminUser } } = await supabase.auth.getUser();

  if (!superAdminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', superAdminUser.id).single();
  if (adminRole?.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only super admins can register new accountants." };
  }
  
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
  
  const { fullName, email } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  if (!resendApiKey || !emailFromAddress) {
      return { success: false, message: "Server email service is not configured." };
  }
  const resend = new Resend(resendApiKey);
  
  try {
    const { data: existingUser } = await supabase.from('auth.users').select('id').eq('email', lowerCaseEmail).single();
    if (existingUser) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName } }
    );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'accountant', school_id: adminRole.school_id });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: null // Supabase handles the password setup
    };

  } catch (error: any) {
    console.error('Accountant Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
