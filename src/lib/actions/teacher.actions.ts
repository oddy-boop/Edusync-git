
'use server';

import { getLessonPlanIdeas, type LessonPlanIdeasInput, type LessonPlanIdeasOutput } from "@/ai/flows/lesson-plan-ideas";
import { z } from "zod";
import pool from "@/lib/db";
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const LessonPlannerSchema = z.object({
  subject: z.string().min(1, "Subject is required."),
  topic: z.string().min(1, "Topic is required."),
});

export async function generateLessonPlanIdeasAction(
  prevState: any,
  formData: FormData
): Promise<{
  message: string;
  data: LessonPlanIdeasOutput | null;
  errors?: { subject?: string[]; topic?: string[] };
}> {
  const validatedFields = LessonPlannerSchema.safeParse({
    subject: formData.get("subject"),
    topic: formData.get("topic"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation failed.",
      data: null,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const input: LessonPlanIdeasInput = {
    subject: validatedFields.data.subject,
    topic: validatedFields.data.topic,
  };

  try {
    const result = await getLessonPlanIdeas(input);
    return { message: "Lesson plan ideas generated successfully.", data: result };
  } catch (error) {
    console.error("[generateLessonPlanIdeasAction] Error generating lesson plan ideas:", error);
    let errorMessage = "Failed to generate lesson plan ideas. Please check server logs for more details.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { message: errorMessage, data: null };
  }
}

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  subjectsTaught: z.array(z.string()).min(1, "Please select at least one subject area."),
  contactNumber: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const internationalFormat = /^\+\d{11,14}$/;
        const localFormat = /^0\d{9}$/;
        return internationalFormat.test(val) || localFormat.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};


export async function registerTeacherAction(prevState: any, formData: FormData): Promise<ActionResponse> {
  // This action now requires an admin to be logged in to create a teacher.
  // The logic for checking the admin's session would be implemented in the component calling this action
  // or via middleware protecting the route.

  const subjectsTaughtValue = formData.get('subjectsTaught');
  const assignedClassesValue = formData.get('assignedClasses');
  
  const validatedFields = teacherSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    dateOfBirth: formData.get('dateOfBirth'),
    location: formData.get('location'),
    subjectsTaught: typeof subjectsTaughtValue === 'string' ? subjectsTaughtValue.split(',') : [],
    contactNumber: formData.get('contactNumber'),
    assignedClasses: typeof assignedClassesValue === 'string' ? assignedClassesValue.split(',') : [],
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return { success: false, message: `Validation failed: ${errorMessages}` };
  }
  
  const { fullName, email, dateOfBirth, location, subjectsTaught, contactNumber, assignedClasses } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!resendApiKey || !emailFromAddress) {
      return { success: false, message: "Server email service is not configured." };
  }
  const resend = new Resend(resendApiKey);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // For now, we'll assume the creating admin is from school_id 1. 
    // A more robust solution would pass the creating admin's school_id to this action.
    const schoolId = 1; 
    
    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [lowerCaseEmail]);
    if (existingUser.rows.length > 0) {
      return { success: false, message: `An account with the email ${lowerCaseEmail} already exists.` };
    }

    const temporaryPassword = randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    // Insert into users table
    const newUserResult = await client.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [fullName, lowerCaseEmail, hashedPassword, 'teacher']
    );
    const newUserId = newUserResult.rows[0].id;

    // Insert into teachers profile table
    await client.query(
      `INSERT INTO teachers 
       (school_id, user_id, full_name, email, date_of_birth, location, contact_number, subjects_taught, assigned_classes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [schoolId, newUserId, fullName, lowerCaseEmail, dateOfBirth || null, location || null, contactNumber, subjectsTaught, assignedClasses]
    );

    // Send invitation email
     await resend.emails.send({
      from: `EduSync Platform <${emailFromAddress}>`,
      to: lowerCaseEmail,
      subject: "You've been invited to join EduSync",
      html: `
        <p>Hello ${fullName},</p>
        <p>You have been registered as a teacher on the EduSync platform.</p>
        <p>You can log in with the following credentials:</p>
        <ul>
            <li><strong>Email:</strong> ${lowerCaseEmail}</li>
            <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="${siteUrl}/auth/teacher/login">Login Here</a>
      `,
    });


    await client.query('COMMIT');
    
    return { 
      success: true, 
      message: `Teacher ${fullName} has been registered and an invitation with a temporary password has been sent to ${lowerCaseEmail}.`,
      temporaryPassword: process.env.APP_MODE === 'development' ? temporaryPassword : null,
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Teacher Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected server error occurred." };
  } finally {
    client.release();
  }
}
