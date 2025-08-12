
'use server';

import { Resend } from 'resend';
import pool from "@/lib/db";
import { getSession } from './session';

interface Announcement {
  title: string;
  message: string;
}

export async function sendAnnouncementEmail(
  announcement: Announcement,
  targetAudience: 'All' | 'Students' | 'Teachers'
): Promise<{ success: boolean; message: string }> {

  let schoolId: number | null = null;
  const session = await getSession();

  if(session.isLoggedIn && session.schoolId) {
    schoolId = session.schoolId;
  } else {
    // Fallback for system-wide context if no user is present (e.g., cron jobs)
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1');
        schoolId = rows[0]?.id;
    } catch (e) {
        console.warn("Email Service DB Warning: Could not fetch fallback school.", e);
    } finally {
        client.release();
    }
  }
  
  if (!schoolId) {
    return { success: false, message: "Could not determine a school for sending the email." };
  }

  const client = await pool.connect();
  let schoolName = "School Announcement";
  let resendApiKey: string | undefined | null;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  
  try {
    const { rows } = await client.query('SELECT name, resend_api_key, email FROM schools WHERE id = $1', [schoolId]);
    const settings = rows[0];

    if (!settings) throw new Error("Could not find school settings for the email operation.");

    schoolName = settings.name || schoolName;
    resendApiKey = settings.resend_api_key || process.env.RESEND_API_KEY;

  } catch (dbError: any) {
    console.warn("Email Service DB Warning: Could not fetch settings.", dbError);
    resendApiKey = process.env.RESEND_API_KEY;
  }

  if (!resendApiKey || resendApiKey.includes("YOUR_")) {
    const errorMsg = "Resend API key is not configured in settings or environment variables.";
    console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
    return { success: false, message: "Email service is not configured on the server." };
  }
  
  if (!emailFromAddress) {
    const errorMsg = "EMAIL_FROM_ADDRESS is not set in environment variables.";
    console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
    return { success: false, message: "Email sender identity is not configured." };
  }

  const resend = new Resend(resendApiKey);
  let recipientEmails: string[] = [];

  try {
    if (targetAudience === 'Students' || targetAudience === 'All') {
      const { rows: students } = await client.query('SELECT contact_email FROM students WHERE school_id = $1', [schoolId]);
      recipientEmails.push(...students.map(s => s.contact_email).filter((e): e is string => !!e));
    }

    if (targetAudience === 'Teachers' || targetAudience === 'All') {
      const { rows: teachers } = await client.query('SELECT email FROM teachers WHERE school_id = $1', [schoolId]);
      recipientEmails.push(...teachers.map(t => t.email).filter((e): e is string => !!e));
    }

    const uniqueEmails = [...new Set(recipientEmails)];

    if (uniqueEmails.length === 0) {
      console.log('No recipients found for the announcement email.');
      return { success: true, message: 'Announcement saved, but no recipients found to email.' };
    }
    
    const { data, error } = await resend.emails.send({
      from: `${schoolName} <${emailFromAddress}>`,
      to: emailFromAddress,
      bcc: uniqueEmails,
      subject: `Announcement from ${schoolName}: ${announcement.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #2C3E50; border-bottom: 2px solid #C0392B; padding-bottom: 10px;">${announcement.title}</h1>
          <p style="line-height: 1.6;">${announcement.message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">This is an automated message from the school office of ${schoolName}.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    return { success: true, message: `Email sent to ${uniqueEmails.length} recipients.` };
  } catch (error: any) {
    console.error('Error in sendAnnouncementEmail:', error);
    return { success: false, message: error.message || 'An unknown error occurred.' };
  } finally {
      client.release();
  }
}
