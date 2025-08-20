
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const registerAccountantSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for an already logged-in admin to invite an accountant
export async function registerAccountantAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role, school_id').eq('user_id', adminUser.id).single();
  if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
      return { success: false, message: "Unauthorized: You do not have permission to register accountants." };
  }
  if (!adminRole.school_id) {
    return { success: false, message: "Action Failed: Your admin account is not associated with a specific school branch." };
  }
  
  const validatedFields = registerAccountantSchema.safeParse({
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
  
  try {
    const { data: existingUser } = await supabase.from('auth.users').select('id').eq('email', lowerCaseEmail).single();
    if (existingUser) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName } }
    );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'accountant', school_id: adminRole.school_id });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: null // Supabase handles the password setup
    };

  } catch (error: any) {
    console.error('Accountant Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
