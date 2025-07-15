'use server';

import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server'; // Use the server-aware client

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

// This helper is for creating the privileged client
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
  const supabase = createServerClient(); // Session-aware client for permission check
  const supabaseAdmin = getSupabaseAdminClient(); // Privileged client for user creation

  try {
    // 1. Check if the current user is an admin
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return { success: false, message: 'Authentication Error: Please log in again.' };
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .single();

    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: 'Permission Denied: You must be an administrator to perform this action.' };
    }

    // 2. Validate form data
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is not set in environment variables.");
    }
    const redirectTo = `${siteUrl}/auth/update-password`;

    // 3. Create the new admin user
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

    // 4. Manually insert into the user_roles table
    const { error: newRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: inviteData.user.id, role: 'admin' });

    if (newRoleError) {
      // If role insertion fails, delete the invited user to keep things clean.
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      throw new Error(`Failed to assign admin role: ${newRoleError.message}`);
    }
    
    // 5. Respond with success
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
