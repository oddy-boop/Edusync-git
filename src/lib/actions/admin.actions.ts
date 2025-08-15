
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for a logged-in super_admin or admin to invite another admin
export async function registerAdminAction(
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
      return { success: false, message: "Unauthorized: You do not have permission to register new administrators." };
  }
    
  const validatedFields = registerAdminSchema.safeParse({
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

    // Since we're in a single-school model now, we use the current admin's school_id
    // or fetch the first available school if none is found (fallback for safety).
    let schoolIdToAssign = adminRole.school_id;
    if (!schoolIdToAssign) {
        const { data: firstSchool } = await supabase.from('schools').select('id').limit(1).single();
        if(!firstSchool) throw new Error("No school found in the database to assign the admin to.");
        schoolIdToAssign = firstSchool.id;
    }

     const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { full_name: fullName } }
    );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUserId, role: 'admin', school_id: schoolIdToAssign });

    if(roleError) throw roleError;
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

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
