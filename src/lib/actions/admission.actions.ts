
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendSms } from '@/lib/sms';

const applicationSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date." }),
  studentReligion: z.string().optional(),
  studentLocation: z.string().optional(),
  gradeLevelApplyingFor: z.string().min(1, "Grade level is required."),
  previousSchoolName: z.string().optional(),
  guardianName: z.string().min(3, "Guardian name is required."),
  guardianContact: z.string().min(10, "A valid contact number is required."),
  guardianEmail: z.string().email("A valid guardian email is required."),
  guardianReligion: z.string().optional(),
  guardianLocation: z.string().optional(),
});


type ActionResponse = {
  success: boolean;
  message: string;
};

export async function applyForAdmissionAction(
  prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = applicationSchema.safeParse({
    fullName: formData.get('fullName'),
    dateOfBirth: formData.get('dateOfBirth'),
    studentReligion: formData.get('studentReligion'),
    studentLocation: formData.get('studentLocation'),
    gradeLevelApplyingFor: formData.get('gradeLevelApplyingFor'),
    previousSchoolName: formData.get('previousSchoolName'),
    guardianName: formData.get('guardianName'),
    guardianContact: formData.get('guardianContact'),
    guardianEmail: formData.get('guardianEmail'),
    guardianReligion: formData.get('guardianReligion'),
    guardianLocation: formData.get('guardianLocation'),
  });


  if (!validatedFields.success) {
    console.error("Admission form validation failed:", validatedFields.error.flatten());
    return { success: false, message: 'Invalid form data. Please check your entries.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: 'Server configuration error.' };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { 
        fullName,
        dateOfBirth,
        studentReligion,
        studentLocation,
        gradeLevelApplyingFor,
        previousSchoolName,
        guardianName,
        guardianContact,
        guardianEmail,
        guardianReligion,
        guardianLocation
     } = validatedFields.data;

    const dataToInsert = {
        full_name: fullName,
        date_of_birth: dateOfBirth,
        student_religion: studentReligion,
        student_location: studentLocation,
        grade_level_applying_for: gradeLevelApplyingFor,
        previous_school_name: previousSchoolName,
        guardian_name: guardianName,
        guardian_contact: guardianContact,
        guardian_email: guardianEmail,
        guardian_religion: guardianReligion,
        guardian_location: guardianLocation,
        status: 'pending'
    };

    const { error } = await supabaseAdmin.from('admission_applications').insert([dataToInsert]);

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

interface AdmitStudentPayload {
    applicationId: string;
    initialPassword?: string;
}

export async function admitStudentAction({ applicationId, initialPassword }: AdmitStudentPayload): Promise<ActionResponse> {
    if (!applicationId) {
        return { success: false, message: "Application ID is missing." };
    }
     if (!initialPassword || initialPassword.length < 6) {
        return { success: false, message: "A secure initial password of at least 6 characters is required." };
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error." };
    }
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const { data: application, error: appError } = await supabaseAdmin
            .from('admission_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            throw new Error("Could not find the application to process.");
        }

        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: application.guardian_email.toLowerCase(),
            password: initialPassword,
            email_confirm: true,
            user_metadata: { role: 'student', full_name: application.full_name },
        });

        if (authError) {
             if (authError.message.includes('User already registered')) {
                throw new Error(`An account with the email ${application.guardian_email} already exists. Please delete this application and handle the existing user manually.`);
            }
            throw authError;
        }

        const authUserId = newUser.user.id;

        await supabaseAdmin.from('user_roles').insert({ user_id: authUserId, role: 'student' });
        
        const { data: settings } = await supabaseAdmin.from('app_settings').select('current_academic_year, school_name, NEXT_PUBLIC_SITE_URL').eq('id', 1).single();
        const academicYear = settings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        const schoolName = settings?.school_name || 'The School';
        const siteUrl = settings?.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'your school portal';

        const endYear = academicYear.split('-')[1];
        const yearPrefix = endYear.slice(-3); // e.g., "2024" -> "024", "2025" -> "025" but `slice` on string '2024' gives '24'. Let's use full year.
        const yearDigits = endYear || new Date().getFullYear().toString();
        const schoolYearPrefix = yearDigits.substring(1);
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

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
        
        const smsMessage = `Hello ${application.guardian_name}, the application for ${application.full_name} to ${schoolName} has been accepted.\n\nPORTAL DETAILS:\nStudent ID: ${studentIdDisplay}\nPassword: ${initialPassword}\n\nPLEASE DON'T SHARE THIS WITH ANYONE.\nVisit ${siteUrl}/auth/student/login to log in.`;
        
        const smsResult = await sendSms({
            message: smsMessage,
            recipients: [{ phoneNumber: application.guardian_contact }]
        });
        
        await supabaseAdmin.from('admission_applications').delete().eq('id', applicationId);
        
        let finalMessage = `Student ${application.full_name} admitted successfully with ID ${studentIdDisplay}.`;
        if (smsResult.errorCount > 0) {
            finalMessage += ` However, SMS notification failed: ${smsResult.firstErrorMessage}`;
        } else if (smsResult.successCount > 0) {
            finalMessage += ` Guardian notified via SMS.`;
        }

        return { success: true, message: finalMessage };

    } catch (error: any) {
        console.error("Admission Process Error:", error);
        return { success: false, message: error.message };
    }
}

export async function deleteAdmissionApplicationAction(applicationId: string): Promise<ActionResponse> {
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
        const { error } = await supabaseAdmin.from('admission_applications').delete().eq('id', applicationId);
        if (error) throw error;
        return { success: true, message: "Application deleted successfully." };
    } catch (error: any) {
        console.error("Delete Application Error:", error);
        return { success: false, message: `Failed to delete application: ${error.message}` };
    }
}
