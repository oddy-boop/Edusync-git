
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const studentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
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
    password: formData.get('password'),
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
  
  const { fullName, email, password, dateOfBirth, gradeLevel, guardianName, guardianContact } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Student Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Create the user in Supabase Auth with the admin-set password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: lowerCaseEmail,
      password: password,
      email_confirm: true, // Auto-confirm the email since the admin is creating the account
      user_metadata: { role: 'student', full_name: fullName }
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
          return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
      }
      throw createError;
    }

    if (!newUser?.user) {
      throw new Error("User creation did not return the expected user object.");
    }
    const authUserId = newUser.user.id;
    
    // Assign the 'student' role in the user_roles table
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert(
      { user_id: authUserId, role: 'student' },
      { onConflict: 'user_id' }
    );
    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // Generate a unique student ID
    const yearDigits = new Date().getFullYear().toString().slice(-2);
    const schoolYearPrefix = `2${yearDigits}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const studentIdDisplay = `${schoolYearPrefix}SJM${randomNum}`;

    // Create the student profile in the 'students' table
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
    
    const successMessage = `Student ${fullName} created successfully. They can now log in with their email and the password you provided.`;

    return { 
      success: true, 
      message: successMessage,
      studentId: studentIdDisplay,
      temporaryPassword: null, // No longer sending temporary password
    };
  
  } catch (error: any) {
    console.error("Student Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
