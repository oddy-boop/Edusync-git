
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendSms } from '@/lib/sms';
import { isSmsNotificationEnabled } from '@/lib/notification-settings';

const applicationSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date." }),
  studentReligion: z.string().optional(),
  studentLocation: z.string().optional(),
  gradeLevelApplyingFor: z.string().min(1, "Grade level is required."),
  previousSchoolName: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  guardianContact: z.string().min(10, "A valid contact number is required."),
  guardianEmail: z.string().email("A valid guardian email is required."),
  guardianReligion: z.string().optional(),
  guardianLocation: z.string().optional(),
  schoolId: z.coerce.number().min(1, "School ID is required."),
}).refine(data => !!data.fatherName || !!data.motherName, {
  message: "At least one parent's name (Father or Mother) is required.",
  path: ["fatherName"], // Assign error to the first field
});


type ActionResponse = {
  success: boolean;
  message: string;
  receiptData?: any;
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
    fatherName: formData.get('fatherName'),
    motherName: formData.get('motherName'),
    guardianContact: formData.get('guardianContact'),
    guardianEmail: formData.get('guardianEmail'),
    guardianReligion: formData.get('guardianReligion'),
    guardianLocation: formData.get('guardianLocation'),
    schoolId: formData.get('schoolId'),
  });


  if (!validatedFields.success) {
    console.error("Admission form validation failed:", validatedFields.error.flatten());
    return { success: false, message: 'Invalid form data. Please check your entries.' };
  }
  
  const supabase = createClient();

  try {
    const { schoolId, ...applicationData } = validatedFields.data;

    const { error } = await supabase.from('admission_applications').insert({
        school_id: schoolId,
        full_name: applicationData.fullName,
        date_of_birth: applicationData.dateOfBirth,
        student_religion: applicationData.studentReligion,
        student_location: applicationData.studentLocation,
        grade_level_applying_for: applicationData.gradeLevelApplyingFor,
        previous_school_name: applicationData.previousSchoolName,
        father_name: applicationData.fatherName,
        mother_name: applicationData.motherName,
        guardian_contact: applicationData.guardianContact,
        guardian_email: applicationData.guardianEmail,
        guardian_religion: applicationData.guardianReligion,
        guardian_location: applicationData.guardianLocation,
        status: 'pending'
    });

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
    newStatus: 'pending' | 'accepted' | 'rejected' | 'waitlisted';
    notes?: string | null;
    initialPassword?: string;
}

export async function admitStudentAction({ applicationId, newStatus, notes, initialPassword }: AdmitStudentPayload): Promise<ActionResponse> {
    const supabase = createClient();

    if (!applicationId) {
        return { success: false, message: "Application ID is missing." };
    }

    try {
        const { data: application, error: appError } = await supabase
            .from('admission_applications')
            .select('*')
            .eq('id', applicationId)
            .single();
        
        if (appError || !application) {
            return { success: false, message: "Could not find the application to process." };
        }

        const schoolId = application.school_id;
        const schoolName = 'The School';
        const primaryGuardianName = application.father_name || application.mother_name || 'Guardian';

        // --- Handle ACCEPTED status ---
        if (newStatus === 'accepted') {
            if (!initialPassword || initialPassword.length < 6) {
                return { success: false, message: "A secure initial password of at least 6 characters is required to admit a student." };
            }
            
            const { data: existingUser } = await supabase.from('users').select('id').eq('email', application.guardian_email.toLowerCase()).single();
            if (existingUser) {
                throw new Error(`An account with the email ${application.guardian_email} already exists. Please handle the existing user manually.`);
            }

            const { data: signupData, error: signupError } = await supabase.auth.admin.createUser({
                email: application.guardian_email.toLowerCase(),
                password: initialPassword,
                email_confirm: true, 
                user_metadata: { full_name: application.full_name }
            });
            if (signupError) throw signupError;

            const newUserId = signupData.user.id;

            const { error: roleError } = await supabase.from('user_roles').insert({ user_id: newUserId, role: 'student' });
            if (roleError) throw roleError;

            const yearDigits = new Date().getFullYear().toString().slice(-2);
            const schoolYearPrefix = `${yearDigits}`;
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

            const { error: studentInsertError } = await supabase.from('students').insert({
                auth_user_id: newUserId,
                student_id_display: studentIdDisplay,
                full_name: application.full_name,
                date_of_birth: application.date_of_birth,
                grade_level: application.grade_level_applying_for,
                guardian_name: primaryGuardianName,
                guardian_contact: application.guardian_contact,
                contact_email: application.guardian_email.toLowerCase(),
            });

            if(studentInsertError) throw studentInsertError;

            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'your school portal';
            const smsMessage = `Hello ${primaryGuardianName}, the application for ${application.full_name} to ${schoolName} has been accepted.\n\nPORTAL DETAILS:\nLogin Email: ${application.guardian_email.toLowerCase()}\nStudent ID: ${studentIdDisplay}\nPassword: ${initialPassword}\n\nPlease DON'T SHARE THIS WITH ANYONE.\nVisit ${siteUrl}/portals to log in.`;
            
            // Check if SMS notifications are enabled for this school
            const smsEnabled = await isSmsNotificationEnabled(schoolId);
            let smsResult: { errorCount: number; successCount: number; firstErrorMessage: string } = { errorCount: 0, successCount: 0, firstErrorMessage: '' };
            if (smsEnabled) {
                const rawSmsResult = await sendSms({
                    schoolId: schoolId,
                    message: smsMessage,
                    recipients: [{ phoneNumber: application.guardian_contact }]
                });
                // Ensure firstErrorMessage is always a string
                smsResult = {
                    errorCount: rawSmsResult.errorCount,
                    successCount: rawSmsResult.successCount,
                    firstErrorMessage: rawSmsResult.firstErrorMessage ?? ''
                };
                console.log('Admission SMS result:', smsResult);
            }

            await supabase.from('admission_applications').delete().eq('id', applicationId);

            let finalMessage = `Student ${application.full_name} admitted successfully with ID ${studentIdDisplay}.`;
            // Provide clear feedback to the admin about SMS delivery outcome
            if (smsResult.errorCount > 0) {
                finalMessage += ` However, SMS notification failed for ${smsResult.errorCount} recipient(s). First error: ${smsResult.firstErrorMessage || 'Unknown error.'}`;
            } else if (smsResult.successCount > 0) {
                finalMessage += ` Guardian notified via SMS (sent to ${application.guardian_contact}).`;
            } else {
                finalMessage += ` SMS not sent (no recipients or SMS provider not configured).`;
            }

            return { success: true, message: finalMessage };
        }

        // --- Handle OTHER statuses ---
        await supabase.from('admission_applications').update({ status: newStatus, notes: notes }).eq('id', applicationId);
        
        let finalMessage = `Application status updated to '${newStatus}'.`;

        if (newStatus === 'rejected') {
            const smsMessage = `Hello ${primaryGuardianName}, we regret to inform you that after careful review, we are unable to offer ${application.full_name} admission to ${schoolName} at this time. We wish you the best in your search.`;
            
            // Check if SMS notifications are enabled for this school
            const smsEnabled = await isSmsNotificationEnabled(schoolId);
            if (smsEnabled) {
                const smsResult = await sendSms({
                    schoolId: schoolId,
                    message: smsMessage,
                    recipients: [{ phoneNumber: application.guardian_contact }]
                });
                if (smsResult.successCount > 0) {
                    finalMessage += ` Guardian has been notified via SMS.`;
                }
            }
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
    const supabase = createClient();
    
    try {
        await supabase.from('admission_applications').delete().eq('id', applicationId);
        return { success: true, message: "Application deleted successfully." };
    } catch (error: any) {
        console.error("Delete Application Error:", error);
        return { success: false, message: `Failed to delete application: ${error.message}` };
    }
}

export async function fetchAdmissionApplicationsAction(): Promise<{ applications: any[], error: string | null }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('admission_applications')
            .select('*')
            .order('created_at', { ascending: false });
        if(error) throw error;
        return { applications: data, error: null };
    } catch (e: any) {
        return { applications: [], error: e.message };
    }
}
