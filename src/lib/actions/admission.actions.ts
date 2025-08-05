
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const applicationSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date." }),
  gradeLevelApplyingFor: z.string().min(1, "Grade level is required."),
  previousSchoolName: z.string().optional(),
  guardianName: z.string().min(3, "Guardian name is required."),
  guardianContact: z.string().min(10, "A valid contact number is required."),
  guardianEmail: z.string().email("A valid guardian email is required."),
});

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function applyForAdmissionAction(
  prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = applicationSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: 'Invalid form data. Please check your entries.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: 'Server configuration error.' };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { error } = await supabaseAdmin.from('admission_applications').insert([
      { ...validatedFields.data, status: 'pending' },
    ]);

    if (error) throw error;

    return {
      success: true,
      message: 'Your application has been successfully submitted! We will review it and get in touch with you soon.',
    };
  } catch (error: any) {
    console.error('Admission Application Error:', error);
    return { success: false, message: 'Failed to submit application: ' + error.message };
  }
}

export async function admitStudentAction(prevState: any, formData: FormData): Promise<ActionResponse> {
    const applicationId = formData.get('applicationId') as string;

    if (!applicationId) {
        return { success: false, message: "Application ID is missing." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error." };
    }
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        // 1. Fetch the application data
        const { data: application, error: appError } = await supabaseAdmin
            .from('admission_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            throw new Error("Could not find the application to process.");
        }

        // 2. Create the user in Supabase Auth
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: application.guardian_email.toLowerCase(),
            password: 'password', // A secure temporary password should be generated
            email_confirm: true, // Auto-confirm email
            user_metadata: { role: 'student', full_name: application.full_name },
        });

        if (authError) {
             if (authError.message.includes('User already registered')) {
                throw new Error(`An account with the email ${application.guardian_email} already exists. Cannot create a new one.`);
            }
            throw authError;
        }

        const authUserId = newUser.user.id;

        // 3. Create the user role
        await supabaseAdmin.from('user_roles').insert({ user_id: authUserId, role: 'student' });
        
        // 4. Create the student profile
        const yearDigits = new Date().getFullYear().toString().slice(-2);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const studentIdDisplay = `${yearDigits}ADM${randomNum}`;

        await supabaseAdmin.from('students').insert({
            auth_user_id: authUserId,
            student_id_display: studentIdDisplay,
            full_name: application.full_name,
            date_of_birth: application.date_of_birth,
            grade_level: application.grade_level_applying_for,
            guardian_name: application.guardian_name,
            guardian_contact: application.guardian_contact,
            contact_email: application.guardian_email.toLowerCase(),
        });

        // 5. Delete the application
        await supabaseAdmin.from('admission_applications').delete().eq('id', applicationId);
        
        return { success: true, message: `Student ${application.full_name} has been admitted successfully with ID ${studentIdDisplay}.` };

    } catch (error: any) {
        console.error("Admission Process Error:", error);
        return { success: false, message: error.message };
    }
}
