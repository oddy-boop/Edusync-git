
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

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
  const validatedFields = z.object({
    fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
    email: z.string().email({ message: "Invalid email address." }).trim(),
  }).safeParse({
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get the currently logged-in admin to find their school_id
  const cookieStore = cookies();
  const serverSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  const { data: { user: currentAdminUser } } = await serverSupabase.auth.getUser();
  if (!currentAdminUser) {
    return { success: false, message: "Action failed: Current admin is not authenticated." };
  }

  const { data: adminProfile } = await supabaseAdmin.from('user_roles').select('school_id').eq('user_id', currentAdminUser.id).single();
  const schoolId = adminProfile?.school_id;
  if (!schoolId) {
    return { success: false, message: "Could not determine the current admin's school. Registration failed." };
  }


  try {
    let authUserId: string;
    let tempPassword: string | null = null;
    
    // Create user. This will fail if the user already exists, which we handle.
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
        const redirectTo = `${siteUrl}/auth/update-password`;
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            lowerCaseEmail,
            { 
              data: { full_name: fullName, role: 'admin' },
              redirectTo: redirectTo,
            }
        );
        if (error) throw error;
        if (!data.user) throw new Error("User invitation failed unexpectedly.");
        authUserId = data.user.id;
    }
    
    // Assign the 'admin' role and school_id in the user_roles table
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'admin', school_id: schoolId }, { onConflict: 'user_id' });
    
    if (roleError) {
        // If assigning role fails, delete the auth user we just created.
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
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
        userMessage = `An account with the email ${lowerCaseEmail} already exists. You cannot register this user again.`;
    }
    return {
      success: false,
      message: userMessage,
    };
  }
}
