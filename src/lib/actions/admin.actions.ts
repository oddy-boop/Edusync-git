
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
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
    password: formData.get('password'),
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
  
  const { fullName, email, password } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Check if any admin user already exists.
    const { data: existingUsers, error: listError } = await supabaseAdmin.from('user_roles').select('id').eq('role', 'super_admin').limit(1);

    if (listError) {
      throw new Error(`Database error checking for existing admins: ${listError.message}`);
    }

    if (existingUsers && existingUsers.length > 0) {
      return { success: false, message: "A super administrator already exists. This form is for one-time setup only and is now disabled." };
    }
    
    // Create the first admin user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: lowerCaseEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'super_admin' },
    });
    if (error) throw error;
    if (!data.user) throw new Error("User creation failed unexpectedly.");
    const authUserId = data.user.id;
    
    // Assign the 'super_admin' role
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'super_admin' }, { onConflict: 'user_id' });
    
    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign super_admin role: ${roleError.message}`);
    }
    
    const successMessage = `Super Admin ${fullName} created successfully. You can now log in. Please delete the registration file for security.`;

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
