
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

const registerSuperAdminSchema = z.object({
    fullName: z.string().min(3),
    email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
};

export async function registerSuperAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  
  const { data: { user: performingUser } } = await supabase.auth.getUser();
  if (!performingUser) {
    return { success: false, message: "Unauthorized: You must be logged in to perform this action." };
  }

  const { data: performingUserRole } = await supabase.from('user_roles').select('role').eq('user_id', performingUser.id).single();
  if (performingUserRole?.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only Super Administrators can register new Super Admins." };
  }
    
  const validatedFields = registerSuperAdminSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: `Validation failed.`,
      errors: validatedFields.error.issues,
    };
  }
  
  const { fullName, email } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  try {
    const { data: { users }, error: findError } = await supabase.auth.admin.listUsers();
    if(findError) throw new Error("Could not check for existing user.");

    const existingUser = users.find(u => u.email === lowerCaseEmail);
    if (existingUser) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }
    
  const headersList = await headers();
  const siteUrl = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    lowerCaseEmail,
    { data: { full_name: fullName }, redirectTo: `${siteUrl}/auth/update-password` }
  );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    // Correctly insert the role with a NULL school_id for global access
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'super_admin', school_id: null });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration and set their password.`;

    return {
        success: true,
        message: successMessage,
    };

  } catch (error: any) {
    console.error('Super Admin Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
