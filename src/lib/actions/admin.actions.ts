
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
    // DEVELOPMENT MODE: Create user directly with a temporary password
    if (isDevelopmentMode) {
      const temporaryPassword = randomBytes(12).toString('hex');
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'admin' },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { success: false, message: `An account with the email ${email} already exists.` };
        }
        throw error;
      }

      return {
        success: true,
        message: `Admin created successfully in development mode.`,
        temporaryPassword: temporaryPassword,
      };
    }
    
    // PRODUCTION MODE: Invite user by email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: fullName, role: 'admin' } }
    );

    if (error) {
      if (error.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${email} already exists.` };
      }
      throw error;
    }

    return { success: true, message: `An invitation has been sent to ${email}. They must click the link in the email to set their password.` };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected server error occurred during registration.',
    };
  }
}
