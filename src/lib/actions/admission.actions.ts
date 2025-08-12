
'use server';

import { z } from 'zod';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { sendSms } from '@/lib/sms';
import { getSubdomain } from '@/lib/utils';
import { headers } from 'next/headers';


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
}).refine(data => !!data.fatherName || !!data.motherName, {
  message: "At least one parent's name (Father or Mother) is required.",
  path: ["fatherName"], // Assign error to the first field
});


type ActionResponse = {
  success: boolean;
  message: string;
};

async function getSchoolIdFromDomain(): Promise<number | null> {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);

    if (!subdomain) return null; // Or return a default school ID if applicable

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) return null;

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);
    const { data } = await supabaseAdmin.from('schools').select('id').eq('domain', subdomain).single();
    return data?.id || null;
}

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
  });


  if (!validatedFields.success) {
    console.error("Admission form validation failed:", validatedFields.error.flatten());
    return { success: false, message: 'Invalid form data. Please check your entries.' };
  }
  
  const schoolId = await getSchoolIdFromDomain() || 1; // Fallback to school 1 if domain not found

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
        fatherName,
        motherName,
        guardianContact,
        guardianEmail,
        guardianReligion,
        guardianLocation
     } = validatedFields.data;

    const dataToInsert = {
        school_id: schoolId,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        student_religion: studentReligion,
        student_location: studentLocation,
        grade_level_applying_for: gradeLevelApplyingFor,
        previous_school_name: previousSchoolName,
        father_name: fatherName,
        mother_name: motherName,
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
    newStatus: 'pending' | 'accepted' | 'rejected' | 'waitlisted';
    notes?: string | null;
    initialPassword?: string;
}

export async function admitStudentAction({ applicationId, newStatus, notes, initialPassword }: AdmitStudentPayload): Promise<ActionResponse> {
    if (!applicationId) {
        return { success: false, message: "Application ID is missing." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return { success: false, message: "Server configuration error." };
    }
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: application, error: appError } = await supabaseAdmin
        .from('admission_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (appError || !application) {
        return { success: false, message: "Could not find the application to process." };
    }
     const { data: settings } = await supabaseAdmin.from('schools').select('name').eq('id', application.school_id).single();
     const schoolName = settings?.name || 'The School';
     const primaryGuardianName = application.father_name || application.mother_name || 'Guardian';

    // --- Handle ACCEPTED status ---
    if (newStatus === 'accepted') {
        if (!initialPassword || initialPassword.length < 6) {
            return { success: false, message: "A secure initial password of at least 6 characters is required to admit a student." };
        }
        
        try {
            const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: application.guardian_email.toLowerCase(),
                password: initialPassword,
                email_confirm: true,
                user_metadata: { role: 'student', full_name: application.full_name },
            });

            if (authError) {
                if (authError.message.includes('User already registered')) {
                    throw new Error(`An account with the email ${application.guardian_email} already exists. Please handle the existing user manually.`);
                }
                throw authError;
            }

            const authUserId = newUser.user.id;
            await supabaseAdmin.from('user_roles').insert({ user_id: authUserId, role: 'student', school_id: application.school_id });
            
            const { data: appSettings } = await supabaseAdmin.from('schools').select('current_academic_year').eq('id', application.school_id).single();
            const academicYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
            const yearDigits = new Date().getFullYear().toString().slice(-2);
            const schoolYearPrefix = `S${yearDigits}`;
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

            await supabaseAdmin.from('students').insert({
                school_id: application.school_id,
                auth_user_id: authUserId,
                student_id_display: studentIdDisplay,
                full_name: application.full_name,
                date_of_birth: application.date_of_birth,
                grade_level: application.grade_level_applying_for,
                guardian_name: primaryGuardianName,
                guardian_contact: application.guardian_contact,
                contact_email: application.guardian_email.toLowerCase(),
            });
            
            
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'your school portal';
            const smsMessage = `Hello ${primaryGuardianName}, the application for ${application.full_name} to ${schoolName} has been accepted.\n\nPORTAL DETAILS:\nLogin Email: ${application.guardian_email.toLowerCase()}\nStudent ID: ${studentIdDisplay}\nPassword: ${initialPassword}\n\nPLEASE DON'T SHARE THIS WITH ANYONE.\nVisit ${siteUrl}/auth/student/login to log in.`;
            
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

    // --- Handle OTHER statuses (rejected, waitlisted, etc.) ---
    try {
        const { error: updateError } = await supabaseAdmin
            .from('admission_applications')
            .update({ status: newStatus, notes })
            .eq('id', applicationId);

        if (updateError) throw updateError;
        
        let finalMessage = `Application status updated to '${newStatus}'.`;

        // Send SMS on rejection
        if (newStatus === 'rejected') {
            const smsMessage = `Hello ${primaryGuardianName}, we regret to inform you that after careful review, we are unable to offer ${application.full_name} admission to ${schoolName} at this time. We wish you the best in your search.`;
            const smsResult = await sendSms({
                message: smsMessage,
                recipients: [{ phoneNumber: application.guardian_contact }]
            });
             if (smsResult.successCount > 0) {
                finalMessage += ` Guardian has been notified via SMS.`;
            }
        }

        return { success: true, message: finalMessage };

    } catch (error: any) {
        console.error("Update Application Status Error:", error);
        return { success: false, message: `Failed to update status: ${error.message}` };
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
