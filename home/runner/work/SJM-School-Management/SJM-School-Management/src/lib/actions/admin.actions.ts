
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

// Define the shape of the return value for the action
type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null; // Kept for type consistency, but will be null
};

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = formSchema.safeParse({
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
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const redirectTo = `${siteUrl}/auth/update-password`;
    
    // Always use the invitation flow for production-readiness.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { 
          data: { full_name: fullName, role: 'admin' },
          redirectTo: redirectTo,
        }
    );
    if (error) throw error;
    if (!data.user) throw new Error("User invitation failed unexpectedly.");
    
    const authUserId = data.user.id;
    
    // Assign the 'admin' role in the user_roles table
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'admin' }, { onConflict: 'user_id' });
    
    if (roleError) {
        // If assigning role fails, delete the auth user we just created.
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign admin role: ${roleError.message}`);
    }
    
    const successMessage = `An invitation has been sent to ${lowerCaseEmail}. They must click the link in the email to set their password.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: null,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred during registration.';
     if (error.message && error.message.toLowerCase().includes('user already registered')) {
        userMessage = `An account with the email ${lowerCaseEmail} already exists. You cannot register this user again.`;
    }
    return {
      success: false,
      message: userMessage,
    };
  }
}
