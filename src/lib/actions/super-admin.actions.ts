
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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
  const { data: { user: superAdminUser } } = await supabase.auth.getUser();
  if (!superAdminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as a Super Admin." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role').eq('user_id', superAdminUser.id).eq('role', 'super_admin').single();
  if (!adminRole) {
      return { success: false, message: "Unauthorized: Only Super Administrators can perform this action." };
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
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', lowerCaseEmail).single();
    if (existingUser) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }
    
     const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName } }
    );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    // Assign the super_admin role with a NULL school_id
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'super_admin', school_id: null });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
    };

  } catch (error: any) {
    console.error('Super Admin Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
