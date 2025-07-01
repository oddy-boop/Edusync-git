
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const studentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val))),
  gradeLevel: z.string().min(1),
  guardianName: z.string().min(3),
  guardianContact: z.string().min(10),
});

type ActionResponse = {
  success: boolean;
  message: string;
  studentId?: string | null;
  temporaryPassword?: string | null;
};


export async function registerStudentAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  const validatedFields = studentSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    dateOfBirth: formData.get('dateOfBirth'),
    gradeLevel: formData.get('gradeLevel'),
    guardianName: formData.get('guardianName'),
    guardianContact: formData.get('guardianContact'),
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return { success: false, message: `Validation failed: ${errorMessages}` };
  }
  
  const { fullName, email, dateOfBirth, gradeLevel, guardianName, guardianContact } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Student Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const studentIdDisplay = `${"2" + (new Date().getFullYear() % 100).toString().padStart(2, '0')}SJM${Math.floor(1000 + Math.random() * 9000).toString()}`;
  
  try {
    let authUserId: string;
    let tempPassword: string | null = null;
    
    // DEVELOPMENT MODE: Create user directly with temporary password
    if (isDevelopmentMode) {
      const temporaryPassword = randomBytes(12).toString('hex');
      tempPassword = temporaryPassword;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: lowerCaseEmail,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email in dev mode
        user_metadata: { role: 'student', full_name: fullName, student_id_display: studentIdDisplay }
      });
      if (createError) {
        if (createError.message.includes('User already registered')) {
            return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
        }
        throw createError;
      }
      if (!newUser?.user) {
        throw new Error("User creation did not return the expected user object in dev mode.");
      }
      authUserId = newUser.user.id;

    } else { // PRODUCTION MODE: Invite user by email
      const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { data: { role: 'student', full_name: fullName, student_id_display: studentIdDisplay } }
      );
      if (inviteError) {
          if (inviteError.message.includes('User already registered')) {
              return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
          }
          throw inviteError;
      }
      if (!newUser?.user) {
          throw new Error("User invitation did not return the expected user object.");
      }
      authUserId = newUser.user.id;
    }
    
    // The trigger will have created a basic student profile. Now we update it with the rest of the form data.
    const { error: profileUpdateError } = await supabaseAdmin
        .from('students')
        .update({
            date_of_birth: dateOfBirth,
            grade_level: gradeLevel,
            guardian_name: guardianName,
            guardian_contact: guardianContact,
            updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);
    
    if (profileUpdateError) {
        // If profile update fails, we should delete the auth user to avoid orphaned accounts
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to update student profile after creation: ${profileUpdateError.message}`);
    }
    
    const successMessage = isDevelopmentMode
      ? `Student created in dev mode. Share the temporary password with them.`
      : `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return { 
      success: true, 
      message: successMessage,
      studentId: studentIdDisplay,
      temporaryPassword: tempPassword,
    };
  
  } catch (error: any) {
    console.error("Student Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred.", studentId: null };
  }
}
