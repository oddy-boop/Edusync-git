'use server';

import { z } from 'zod';
import { createClient as createServerClient } from '@supabase/supabase-js';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// Helper to get the privileged admin client
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createServerClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  // Use the admin client directly as this is a privileged operation
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const validatedFields = formSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
    });

    if (!validatedFields.success) {
      return { 
          success: false, 
          message: 'Validation failed. Please check the fields.',
          errors: validatedFields.error.issues,
      };
    }

    const { fullName, email } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/update-password`;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      {
        data: { full_name: fullName },
        redirectTo,
      }
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
      }
      throw inviteError;
    }

    if (!inviteData.user) {
        throw new Error("Invitation did not return a user object.");
    }

    // Manually insert into the user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: inviteData.user.id, role: 'admin' });

    if (roleError) {
      // If role insertion fails, we should ideally delete the invited user to keep things clean.
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      throw new Error(`Failed to assign admin role: ${roleError.message}`);
    }
    
    const showPassword = process.env.APP_MODE === 'development';
    
    return {
      success: true,
      message: `Invitation sent to ${lowerCaseEmail}. They must set their password via the email link.`,
      temporaryPassword: showPassword ? inviteData.user.user_metadata?.temporary_password : null,
    };

  } catch (error: any) {
    console.error('Admin registration error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during registration.',
    };
  }
}
