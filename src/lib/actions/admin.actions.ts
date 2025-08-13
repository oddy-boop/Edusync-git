
'use server';

import { z } from 'zod';
import pool from "@/lib/db";
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { getSession } from "@/lib/session";
import { randomBytes } from 'crypto';

const registerAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
};

// This action is for an already logged-in admin to invite another admin
export async function registerAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId || session.role !== 'super_admin') {
      return { success: false, message: "Unauthorized: Only super admins can register new administrators." };
    }
    
  const validatedFields = registerAdminSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ');
    return {
      success: false,
      message: `Validation failed: ${errorMessages}`,
      errors: validatedFields.error.issues,
    };
  }
  
  const { fullName, email } = validatedFields.data;
  const lowerCaseEmail = email.toLowerCase();
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const isDevelopmentMode = process.env.APP_MODE === 'development';

  if (!resendApiKey || !emailFromAddress) {
      return { success: false, message: "Server email service is not configured." };
  }
  const resend = new Resend(resendApiKey);
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [lowerCaseEmail]);
    if (existingUser.rows.length > 0) {
      throw new Error(`An account with the email ${lowerCaseEmail} already exists.`);
    }

    const temporaryPassword = randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // The new admin belongs to the same school as the creating super admin
    const schoolId = session.schoolId;

    // Create the user
    const newUserResult = await client.query(
        'INSERT INTO users (full_name, email, password_hash, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [fullName, lowerCaseEmail, hashedPassword, 'admin', schoolId]
    );
    const newUserId = newUserResult.rows[0].id;
    
    // Send invitation email
    await resend.emails.send({
      from: `EduSync Platform <${emailFromAddress}>`,
      to: lowerCaseEmail,
      subject: "You've been invited to be an Admin on EduSync",
      html: `
        <p>Hello ${fullName},</p>
        <p>You have been registered as an administrator on the EduSync platform.</p>
        <p>You can log in with the following credentials:</p>
        <ul>
            <li><strong>Email:</strong> ${lowerCaseEmail}</li>
            <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="${siteUrl}/auth/admin/login">Login Here</a>
      `,
    });

    await client.query('COMMIT');
    
    const successMessage = `Invitation sent to ${lowerCaseEmail}. They must check their email to complete registration.`;

    return {
        success: true,
        message: successMessage,
        temporaryPassword: isDevelopmentMode ? temporaryPassword : null,
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Admin Registration Action Error:', error);
    return { success: false, message: error.message || 'An unexpected server error occurred during registration.' };
  } finally {
      client.release();
  }
}

// Action for the initial one-time setup page.
const firstAdminFormSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function createFirstAdminAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const validatedFields = firstAdminFormSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation failed. Please check the fields and try again.",
      errors: validatedFields.error.issues,
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    const { rows: existingSuperAdmins } = await client.query("SELECT id FROM users WHERE role = 'super_admin'");
    if (existingSuperAdmins.length > 0) {
      return { success: false, message: "A super administrator already exists. This page is for one-time use only." };
    }
    
    const { fullName, email, password } = validatedFields.data;
    
    const { rows: newSchoolRows } = await client.query("INSERT INTO schools (name) VALUES ($1) RETURNING id", [`${fullName}'s School`]);
    const schoolId = newSchoolRows[0].id;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows: newUserRows } = await client.query('INSERT INTO users (full_name, email, password_hash, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id', [fullName, email.toLowerCase(), hashedPassword, 'super_admin', schoolId]);
    
    await client.query('COMMIT');

    return {
        success: true,
        message: `Super Admin ${fullName} created successfully. You can now log in.`,
        temporaryPassword: password,
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('First Admin Creation Error:', error);
    let userMessage = error.message || 'An unexpected server error occurred.';
    if (error.code === '23505') { // Unique violation
        userMessage = `An account with the email ${validatedFields.data.email} already exists.`;
    }
    return { success: false, message: userMessage };
  } finally {
      client.release();
  }
}
