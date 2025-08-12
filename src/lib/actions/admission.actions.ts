
'use server';

import { z } from 'zod';
import pool from "@/lib/db";
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
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

    if (!subdomain) return null;

    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id FROM schools WHERE domain = $1 LIMIT 1', [subdomain]);
        return rows[0]?.id || null;
    } catch (error) {
        console.error("Error fetching school ID from domain", error);
        return null;
    } finally {
        client.release();
    }
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
  const client = await pool.connect();

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

    await client.query(`
        INSERT INTO admission_applications (school_id, full_name, date_of_birth, student_religion, student_location, grade_level_applying_for, previous_school_name, father_name, mother_name, guardian_contact, guardian_email, guardian_religion, guardian_location, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, Object.values(dataToInsert));

    return {
      success: true,
      message: 'Your application has been successfully submitted! We will review it and get in touch with you soon.',
    };
  } catch (error: any) {
    console.error('Admission Application Error:', error);
    return { success: false, message: 'Failed to submit application: ' + error.message };
  } finally {
      client.release();
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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: appRows } = await client.query('SELECT * FROM admission_applications WHERE id = $1', [applicationId]);
        if (appRows.length === 0) {
            return { success: false, message: "Could not find the application to process." };
        }
        const application = appRows[0];

        const { rows: schoolRows } = await client.query('SELECT name FROM schools WHERE id = $1', [application.school_id]);
        const schoolName = schoolRows[0]?.name || 'The School';
        const primaryGuardianName = application.father_name || application.mother_name || 'Guardian';

        // --- Handle ACCEPTED status ---
        if (newStatus === 'accepted') {
            if (!initialPassword || initialPassword.length < 6) {
                return { success: false, message: "A secure initial password of at least 6 characters is required to admit a student." };
            }
            
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [application.guardian_email.toLowerCase()]);
            if (existingUser.rows.length > 0) {
                throw new Error(`An account with the email ${application.guardian_email} already exists. Please handle the existing user manually.`);
            }

            const hashedPassword = await bcrypt.hash(initialPassword, 10);
            const { rows: newUserRows } = await client.query('INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id', [application.full_name, application.guardian_email.toLowerCase(), hashedPassword, 'student']);
            const newUserId = newUserRows[0].id;

            const yearDigits = new Date().getFullYear().toString().slice(-2);
            const schoolYearPrefix = `S${yearDigits}`;
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

            await client.query('INSERT INTO students (school_id, user_id, student_id_display, full_name, date_of_birth, grade_level, guardian_name, guardian_contact, contact_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
                application.school_id,
                newUserId,
                studentIdDisplay,
                application.full_name,
                application.date_of_birth,
                application.grade_level_applying_for,
                primaryGuardianName,
                application.guardian_contact,
                application.guardian_email.toLowerCase(),
            ]);

            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'your school portal';
            const smsMessage = `Hello ${primaryGuardianName}, the application for ${application.full_name} to ${schoolName} has been accepted.\n\nPORTAL DETAILS:\nLogin Email: ${application.guardian_email.toLowerCase()}\nStudent ID: ${studentIdDisplay}\nPassword: ${initialPassword}\n\nPLEASE DON'T SHARE THIS WITH ANYONE.\nVisit ${siteUrl}/auth/student/login to log in.`;
            
            const smsResult = await sendSms({
                message: smsMessage,
                recipients: [{ phoneNumber: application.guardian_contact }]
            });
            
            await client.query('DELETE FROM admission_applications WHERE id = $1', [applicationId]);
            
            let finalMessage = `Student ${application.full_name} admitted successfully with ID ${studentIdDisplay}.`;
            if (smsResult.errorCount > 0) {
                finalMessage += ` However, SMS notification failed: ${smsResult.firstErrorMessage}`;
            } else if (smsResult.successCount > 0) {
                finalMessage += ` Guardian notified via SMS.`;
            }

            await client.query('COMMIT');
            return { success: true, message: finalMessage };
        }

        // --- Handle OTHER statuses ---
        await client.query('UPDATE admission_applications SET status = $1, notes = $2 WHERE id = $3', [newStatus, notes, applicationId]);
        
        let finalMessage = `Application status updated to '${newStatus}'.`;

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
        
        await client.query('COMMIT');
        return { success: true, message: finalMessage };

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Admission Process Error:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}

export async function deleteAdmissionApplicationAction(applicationId: string): Promise<ActionResponse> {
    if (!applicationId) {
        return { success: false, message: "Application ID is missing." };
    }
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM admission_applications WHERE id = $1', [applicationId]);
        return { success: true, message: "Application deleted successfully." };
    } catch (error: any) {
        console.error("Delete Application Error:", error);
        return { success: false, message: `Failed to delete application: ${error.message}` };
    } finally {
        client.release();
    }
}
