'use server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server'; // Use the server-aware client

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Must be a valid email address"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, {
    message: "Must be a valid date in the past (YYYY-MM-DD format)"
  }),
  gradeLevel: z.string().min(1, "Grade level is required"),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters"),
  guardianContact: z.string().min(10, "Guardian contact must be at least 10 characters"),
});

type ActionResponse = {
  success: boolean;
  message: string;
  studentId?: string | null;
  temporaryPassword?: string | null;
};

// This helper is for creating the privileged client
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Server configuration error: Supabase service role credentials are not set.");
  }
  return createServerClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function registerStudentAction(
  prevState: any, 
  formData: FormData
): Promise<ActionResponse> {
  const supabase = createServerClient(); // Session-aware client for permission check
  const supabaseAdmin = getSupabaseAdminClient(); // Privileged client for user creation

  try {
    // 1. Check if the current user is an admin
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      return { success: false, message: 'Authentication Error: Please log in again.' };
    }
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles').select('role').eq('user_id', adminUser.id).single();
    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return { success: false, message: 'Permission Denied: You must be an administrator to perform this action.' };
    }

    // 2. Validate form data
    const validatedFields = studentSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      dateOfBirth: formData.get('dateOfBirth'),
      gradeLevel: formData.get('gradeLevel'),
      guardianName: formData.get('guardianName'),
      guardianContact: formData.get('guardianContact'),
    });

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten();
      return { 
        success: false, 
        message: "Validation errors: " + 
          Object.values(errors.fieldErrors).flat().join(', ') 
      };
    }

    const { fullName, email, dateOfBirth, gradeLevel, guardianName, guardianContact } = validatedFields.data;
    const lowerCaseEmail = email.toLowerCase();
    
    // 3. Create the user
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/update-password`;
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      lowerCaseEmail,
      {
        data: { full_name: fullName },
        redirectTo,
      }
    );

    if (inviteError) {
      if (inviteError.message.includes('User already registered')) {
        return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
      }
      throw inviteError;
    }
    
    if(!inviteData.user) {
        throw new Error("User invitation did not return a user object.");
    }
    const newUser = inviteData.user;

    // 4. Create the student profile
    const studentIdDisplay = `STU${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: studentInsertError } = await supabaseAdmin
      .from('students')
      .insert({
        auth_user_id: newUser.id,
        student_id_display: studentIdDisplay,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        grade_level: gradeLevel,
        guardian_name: guardianName,
        guardian_contact: guardianContact,
        contact_email: lowerCaseEmail
      });

    if (studentInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw new Error(`Failed to create student profile: ${studentInsertError.message}`);
    }

    // 5. Create the user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.id, role: 'student' });
    
    if (roleInsertError) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.id); // Attempt cleanup
        throw new Error(`Failed to assign student role: ${roleInsertError.message}`);
    }
    
    const showPassword = process.env.APP_MODE === 'development';

    return { 
      success: true, 
      message: `Invitation sent to ${lowerCaseEmail}. Student ID: ${studentIdDisplay}`,
      studentId: studentIdDisplay,
      temporaryPassword: showPassword ? inviteData.user.user_metadata?.temporary_password : null,
    };

  } catch (error: any) {
    console.error("Student registration error:", error);
    return { 
      success: false, 
      message: error.message || "An unexpected error occurred during registration."
    };
  }
}
