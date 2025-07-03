
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

// Define the shape of the return value for the action
type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
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
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let authUserId: string;
    let tempPassword: string | null = null;
    let authUserExists = false;

    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.lookupUserByEmail(lowerCaseEmail);
    if (getUserError && getUserError.message !== 'User not found') {
        throw getUserError;
    }
    
    if (existingUser?.user) {
        authUserId = existingUser.user.id;
        authUserExists = true;
    } else {
        // Create user if they don't exist
        if (isDevelopmentMode) {
            const temporaryPassword = randomBytes(12).toString('hex');
            tempPassword = temporaryPassword;
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: lowerCaseEmail,
                password: temporaryPassword,
                email_confirm: true,
                user_metadata: { full_name: fullName, role: 'admin' },
            });
            if (error) throw error;
            if (!data.user) throw new Error("User creation failed unexpectedly.");
            authUserId = data.user.id;
        } else {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                lowerCaseEmail,
                { data: { full_name: fullName, role: 'admin' } }
            );
            if (error) throw error;
            if (!data.user) throw new Error("User invitation failed unexpectedly.");
            authUserId = data.user.id;
        }
    }
    
    // Assign the 'admin' role in the user_roles table
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'admin' });
    
    if (roleError) {
        // If assigning role fails, delete the auth user if we just created them
        if (!authUserExists) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
        }
        throw new Error(`Failed to assign admin role: ${roleError.message}`);
    }

    const successMessage = isDevelopmentMode && tempPassword
        ? `Admin created successfully in development mode.`
        : `An invitation has been sent to ${lowerCaseEmail}. They must click the link in the email to set their password.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: tempPassword,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred during registration.';
     if (error.message && error.message.toLowerCase().includes('user already registered')) {
        userMessage = `An account with the email ${lowerCaseEmail} already exists. Their role has been updated to admin if it wasn't already.`;
    }
    return {
      success: false,
      message: userMessage,
    };
  }
}
