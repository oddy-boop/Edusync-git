'use server';

import { z } from 'zod';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  schoolId: z.string().uuid("School ID is missing or invalid."),
});

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
  const supabase = createClient();

  try {
    // 1. Verify creator session and permissions
    const { data: { user: creatorUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !creatorUser) {
      console.error('Session error:', authError);
      return { success: false, message: "Authentication Error: Please log in again." };
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', creatorUser.id)
      .single();

    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: "Permission Denied: Administrator access required." };
    }

    // 2. Validate form data
    const validatedFields = formSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      schoolId: formData.get('schoolId'),
    });

    if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
        .flat()
        .join(' ');
      return { success: false, message: `Validation failed: ${errorMessages}` };
    }

    const { fullName, email, schoolId } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();

    if (roleData.role === 'admin' && roleData.school_id !== schoolId) {
      return { success: false, message: "Permission Denied: You can only create administrators for your own school." };
    }
    
    // 3. Use the privileged Supabase Admin client for creation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Missing Supabase admin configuration");
        return { success: false, message: "Server configuration error for registration." };
    }
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey);

    // 4. Invite user, passing metadata for the trigger to use
    const redirectTo = `${siteUrl}/auth/update-password`;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      { 
        data: { 
          full_name: fullName, 
          role: 'admin',
          school_id: schoolId, // Pass school_id in metadata for the trigger
        },
        redirectTo,
      }
    );

    if (error) {
      if (error.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
      }
      throw error;
    }
    if(!data.user) throw new Error("User invitation did not return a user object.");

    // The trigger 'handle_new_user' will now automatically create the user_roles entry.
    // No need to manually insert into user_roles here.

    return {
      success: true,
      message: `Invitation sent to ${lowerCaseEmail}. They must set their password via the email link.`,
    };

  } catch (error: any) {
    console.error('Admin registration error:', error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred during registration.',
    };
  }
}
