
'use server';

import { z } from 'zod';
import pool from "@/lib/db";
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // For now, assume the creating admin is from school_id 1.
    // A more robust implementation would get the admin's school_id from their session.
    const schoolId = 1;

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [lowerCaseEmail]);
    if (existingUser.rows.length > 0) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }

    // Create the user in the new 'users' table
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserResult = await client.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [fullName, lowerCaseEmail, hashedPassword, 'student']
    );
    const newUserId = newUserResult.rows[0].id;

    // Generate Student ID
    const yearDigits = new Date().getFullYear().toString().slice(-2);
    const schoolYearPrefix = `S${yearDigits}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const studentIdDisplay = `${schoolYearPrefix}STD${randomNum}`;

    // Create the student profile
    await client.query(
        `INSERT INTO students (school_id, user_id, student_id_display, full_name, contact_email, date_of_birth, grade_level, guardian_name, guardian_contact) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [schoolId, newUserId, studentIdDisplay, fullName, lowerCaseEmail, dateOfBirth, gradeLevel, guardianName, guardianContact]
    );
    
    await client.query('COMMIT');
    
    const successMessage = `Student ${fullName} created successfully. They can now log in with their email and the password you provided.`;

    return { 
      success: true, 
      message: successMessage,
      studentId: studentIdDisplay,
      temporaryPassword: null, 
    };
  
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Student Registration Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  } finally {
    client.release();
  }
}
