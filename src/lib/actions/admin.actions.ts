
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  schoolId: z.coerce.number().min(1, "A school branch must be selected."),
});


type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for a logged-in super_admin to invite a BRANCH admin
export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role').eq('user_id', adminUser.id).single();
  if (!adminRole || adminRole.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only Super Administrators can register new branch administrators." };
  }
    
  const validatedFields = registerAdminSchema.safeParse({
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
    
    // Assign the new admin to the selected school branch
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'admin', school_id: schoolId });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration for their assigned branch.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: null
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
