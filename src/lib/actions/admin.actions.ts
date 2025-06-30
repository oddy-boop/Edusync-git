
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
    // SECURITY CHECK: Only allow creation of the FIRST admin. Subsequent admins must be created from the admin dashboard.
    const { data: existingAdmins, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      throw new Error(`Database error checking for existing admins: ${countError.message}`);
    }

    if (existingAdmins && (existingAdmins as any).count > 0) {
      return {
        success: false,
        message: 'An admin account already exists. Further admin registrations must be done by an existing administrator.',
      };
    }

    // Create the new user with admin privileges in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the first admin's email for convenience
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
      message: `Admin account for ${email} created successfully. You can now log in.`,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected server error occurred during registration.',
    };
  }
}
