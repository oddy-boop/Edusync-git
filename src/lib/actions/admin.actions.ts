
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  schoolId: z.coerce.number().min(1, "A school must be selected."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for a logged-in super_admin to invite another admin
export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user: superAdminUser } } = await supabase.auth.getUser();
  if (!superAdminUser) {
    return { success: false, message: "Unauthorized: You must be logged in as an administrator." };
  }

  const { data: adminRole } = await supabase.from('user_roles').select('role').eq('user_id', superAdminUser.id).single();
  if (adminRole?.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only super admins can register new administrators." };
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
        .insert({ user_id: newUserId, role: 'admin', school_id: schoolId });

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

// Action for the initial one-time setup page.
const firstAdminFormSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function createFirstAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = firstAdminFormSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check the fields and try again.",
      errors: validatedFields.error.issues,
    };
  }

  const supabase = createClient();

  try {
    const { data: existingUsers, error: checkError } = await supabase.from('user_roles').select('user_id').eq('role', 'super_admin').limit(1);
    if (checkError) throw new Error("Could not check for existing admins: " + checkError.message);
    
    if (existingUsers.length > 0) {
      return { success: false, message: "A super administrator already exists. This page is for one-time use only." };
    }
    
    const { fullName, email, password } = validatedFields.data;
    
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({ name: `${fullName}'s School` })
      .select('id')
      .single();
    
    if (schoolError) throw new Error("Could not create initial school: " + schoolError.message);
    const schoolId = schoolData.id;

    // Use auth.admin.createUser for direct, confirmed user creation
    const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm the user since we are an admin
        user_metadata: {
            full_name: fullName,
        }
    });

    if (signupError) throw signupError;
    if (!signupData.user) throw new Error("User was not created successfully.");

    const { error: roleError } = await supabase.from('user_roles').insert({ user_id: signupData.user.id, role: 'super_admin', school_id: schoolId });
    if(roleError) throw new Error("Could not assign super admin role: " + roleError.message);

    return {
        success: true,
        message: `Super Admin ${fullName} created successfully. You can now log in.`,
        temporaryPassword: password,
    };

  } catch (error: any) {
    console.error('First Admin Creation Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred.';
    return { success: false, message: userMessage };
  }
}
