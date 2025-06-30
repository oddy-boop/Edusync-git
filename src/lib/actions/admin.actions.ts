
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
}> {
  const validatedFields = formSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed. Please check your inputs.',
      errors: validatedFields.error.issues,
    };
  }
  
  const { fullName, email, password } = validatedFields.data;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey || supabaseServiceRoleKey.includes("YOUR")) {
      console.error("Admin Registration Error: Supabase Service Role Key is not configured.");
      return { success: false, message: "Server configuration error. Cannot process registration." };
  }

  // This admin client has elevated privileges and must only be used in server actions.
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // SECURITY CHECK: Only allow creation of the FIRST admin via this public form.
    // Subsequent admins should be created by an existing admin from within the dashboard (feature to be added).
    const { count, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      throw new Error(`Database error checking for existing admins: ${countError.message}`);
    }

    if (count && count > 0) {
      // This is a security measure to prevent anyone from creating more admin accounts from the public registration page.
      // In a real application, you would create a new form inside the admin dashboard to add more admins.
      return {
        success: false,
        message: 'An admin account already exists. Further admin registrations must be done by an existing administrator from within the admin portal.',
      };
    }

    // Create the new user with admin privileges in Supabase Auth
    // By REMOVING the `email_confirm` flag, we allow Supabase to follow the project's
    // default behavior, which is to send a confirmation email if enabled.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        full_name: fullName,
        role: 'admin', // This metadata will be used by the DB trigger to assign the role.
      },
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
        return { success: false, message: 'This email address is already in use. Please use a different email or log in.' };
      }
      throw createError;
    }
    
    if (!newUser?.user) {
        throw new Error("User creation process did not return the expected user object.");
    }

    return {
      success: true,
      message: `Admin account for ${email} created. A verification link has been sent to the email address. Please check the inbox to complete registration.`,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected server error occurred during registration.',
    };
  }
}
