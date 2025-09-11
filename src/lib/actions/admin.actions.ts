
'use server';

import { z } from 'zod';
import { createClient, createAuthClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  schoolId: z.coerce.number().min(1, "A school branch must be selected."),
});


type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
};

// This action is for a logged-in super_admin to invite a BRANCH admin
export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  // Use auth client to verify the current user's authentication and permissions
  const authSupabase = createAuthClient();
  const { data: { user: performingUser } } = await authSupabase.auth.getUser();

  if (!performingUser) {
    return { success: false, message: "Unauthorized: You must be logged in to perform this action." };
  }

  const { data: performingUserRole } = await authSupabase.from('user_roles').select('role').eq('user_id', performingUser.id).single();

  if (performingUserRole?.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only Super Administrators can register new branch administrators." };
  }
  
  // Use service role client for privileged operations
  const supabase = createClient();
    
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
    // First validate that the school exists
    const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', schoolId)
        .single();
    
    if (schoolError || !school) {
        throw new Error("The selected school branch does not exist.");
    }

    // Check for existing admin for this school
    const { data: existingAdmin, error: adminCheckError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('role', 'admin')
        .maybeSingle();

    if (adminCheckError) {
        throw new Error("Could not verify existing admin status.");
    }

    if (existingAdmin) {
        throw new Error(`The selected school branch already has an administrator assigned.`);
    }

    // Check if the email is already in use
    const { data: { users }, error: findError } = await supabase.auth.admin.listUsers();
    if(findError) throw new Error("Could not check for existing user.");

    const existingUser = users.find(u => u.email === lowerCaseEmail);
    if (existingUser) {
        throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }
    
  // Create the user and send invitation
  const headersList = headers();
  const siteUrl = (await headersList).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    lowerCaseEmail,
    {
      data: {
        full_name: fullName,
        school_id: schoolId, // Store school_id in user metadata
      },
      // ensure the invite redirects to our update-password page
      redirectTo: `${siteUrl}/auth/update-password`,
    }
  );
    if (inviteError) throw inviteError;
    const newUserId = inviteData.user.id;
    
    // Assign the admin role with school_id
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ 
            user_id: newUserId, 
            role: 'admin', 
            school_id: schoolId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

    if(roleError) throw roleError;
    
    const successMessage = `Successfully registered ${fullName} as administrator for ${school.name}. They will receive an email invitation to complete their registration.`;

    return {
        success: true,
        message: successMessage,
    };

  } catch (error: any) {
    console.error('Admin Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  }
}
