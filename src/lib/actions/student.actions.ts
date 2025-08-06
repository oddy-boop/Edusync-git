
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("A valid email is required for student login."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters."),
  guardianContact: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const startsWithPlusRegex = /^\+\d{11,14}$/; 
        const startsWithZeroRegex = /^0\d{9}$/;     
        return startsWithPlusRegex.test(val) || startsWithZeroRegex.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
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

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: lowerCaseEmail,
      password: password,
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
      throw new Error("User creation did not return the expected user object.");
    }
    const authUserId = newUser.user.id;
    
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert(
      { user_id: authUserId, role: 'student' },
      { onConflict: 'user_id' }
    );
    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    const { data: settings } = await supabaseAdmin.from('app_settings').select('current_academic_year').eq('id', 1).single();
    const academicYear = settings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const endYear = academicYear.split('-')[1];
    if (!endYear || endYear.length !== 4) {
      throw new Error("Academic year format is invalid in settings.");
    }
    const yearPrefix = endYear.slice(1); // e.g., "2025" -> "225"
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const studentIdDisplay = `${yearPrefix}STD${randomNum}`;

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
            guardian_contact: guardianContact,
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
      temporaryPassword: null, 
    };
  
  } catch (error: any) {
    console.error("Student Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
