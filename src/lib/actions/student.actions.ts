
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Student Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    let authUserId: string;
    let tempPassword: string | null = null;
    
    if (isDevelopmentMode) {
      const temporaryPassword = randomBytes(12).toString('hex');
      tempPassword = temporaryPassword;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: lowerCaseEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { role: 'student', full_name: fullName }
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

    } else {
      const redirectTo = `${siteUrl}/auth/update-password`;
      const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        lowerCaseEmail,
        { 
          data: { role: 'student', full_name: fullName },
          redirectTo: redirectTo,
        }
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
    
    // Generate a unique student ID
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const studentIdDisplay = `${currentYear}SJM${randomNum}`;

    const { error: profileInsertError } = await supabaseAdmin
        .from('students')
        .insert({
            auth_user_id: authUserId,
            student_id_display: studentIdDisplay,
            full_name: fullName,
            contact_email: lowerCaseEmail,
            date_of_birth: dateOfBirth,
            grade_level: gradeLevel,
            guardian_name: guardianName,
            guardian_contact: guardianContact
        });

    if (profileInsertError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        console.error("Error inserting student profile, rolling back auth user creation.", profileInsertError);
        throw new Error(`Failed to create student profile after user authentication: ${profileInsertError.message}`);
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
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
