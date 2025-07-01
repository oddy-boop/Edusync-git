
'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const studentSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val))),
  gradeLevel: z.string().min(1),
  guardianName: z.string().min(3),
  guardianContact: z.string().min(10),
});

export async function registerStudentAction(prevState: any, formData: FormData) {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Student Registration Error: Supabase credentials are not configured.");
      return { success: false, message: "Server configuration error for database. Cannot process registration." };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const studentIdDisplay = `${"2" + (new Date().getFullYear() % 100).toString().padStart(2, '0')}SJM${Math.floor(1000 + Math.random() * 9000).toString()}`;
    
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { role: 'student', full_name: fullName, student_id_display: studentIdDisplay } }
    );
    
    if (inviteError) {
        if (inviteError.message.includes('User already registered')) {
            return { success: false, message: `An account with the email ${email} already exists.` };
        }
        throw inviteError;
    }
    if (!newUser?.user) {
        throw new Error("User invitation did not return the expected user object.");
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
        .eq('auth_user_id', newUser.user.id);
    
    if (profileUpdateError) {
        // If profile update fails, we should delete the auth user to avoid orphaned accounts
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(`Failed to update student profile after invitation: ${profileUpdateError.message}`);
    }

    return { success: true, message: `Invitation sent to ${email}. They need to check their email to complete registration.`, studentId: studentIdDisplay };
  
  } catch (error: any) {
    console.error("Student Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred.", studentId: null };
  }
}
