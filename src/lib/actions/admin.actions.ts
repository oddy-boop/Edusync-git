
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

  const validatedFields = formSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    schoolId: formData.get('schoolId'),
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
  
  const { fullName, email, schoolId } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Admin Registration Error: Supabase credentials are not configured.");
    return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }
  
  const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: { user: creatorUser } } = await supabase.auth.getUser();
    if (!creatorUser) {
        return { success: false, message: "Authentication Error: Could not verify your session." };
    }
    const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role, school_id').eq('user_id', creatorUser.id).single();
    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
        return { success: false, message: "Permission Denied: You must be an administrator to perform this action." };
    }

    if (roleData.role === 'admin' && roleData.school_id !== schoolId) {
        return { success: false, message: "Permission Denied: You can only create administrators for your own school." };
    }

    let authUserId: string;
    
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
    
    const { error: assignRoleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'admin', school_id: schoolId }, { onConflict: 'user_id' });
    
    if (assignRoleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign admin role: ${assignRoleError.message}`);
    }
    
    const successMessage = `An invitation has been sent to ${lowerCaseEmail}. They must click the link in the email to set their password and access their school's admin portal.`;

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
