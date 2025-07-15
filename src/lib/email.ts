'use server';

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js'; // Use standard client

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM_ADDRESS;

interface Announcement {
  title: string;
  message: string;
}

export async function sendAnnouncementEmail(
  announcement: Announcement,
  targetAudience: 'All' | 'Students' | 'Teachers'
): Promise<{ success: boolean; message: string }> {
  if (!resendApiKey || resendApiKey.includes("YOUR_")) {
    const errorMsg = "Resend API key is not configured in environment variables.";
    console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
    return { success: false, message: "Email service is not configured on the server." };
  }
  
  if (!emailFrom) {
    const errorMsg = "EMAIL_FROM_ADDRESS is not set in environment variables.";
    console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
    return { success: false, message: "Email sender identity is not configured." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const errorMsg = "Supabase server credentials are not configured for sending emails.";
    return { success: false, message: errorMsg };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const resend = new Resend(resendApiKey);
  let recipientEmails: string[] = [];

  try {
    if (targetAudience === 'Students' || targetAudience === 'All') {
      const { data: students, error } = await supabaseAdmin.from('students').select('contact_email');
      if (error) throw new Error(`Failed to fetch student emails: ${error.message}`);
      if (students) {
        recipientEmails.push(...students.map(s => s.contact_email).filter((e): e is string => !!e));
      }
    }

    if (targetAudience === 'Teachers' || targetAudience === 'All') {
      const { data: teachers, error } = await supabaseAdmin.from('teachers').select('email');
      if (error) throw new Error(`Failed to fetch teacher emails: ${error.message}`);
      if (teachers) {
        recipientEmails.push(...teachers.map(t => t.email).filter((e): e is string => !!e));
      }
    }

    const uniqueEmails = [...new Set(recipientEmails)];

    if (uniqueEmails.length === 0) {
      console.log('No recipients found for the announcement email.');
      return { success: true, message: 'Announcement saved, but no recipients found to email.' };
    }
    
    // In a production app, it's better to send emails in batches or use a mailing list service.
    // For now, BCC is a reasonable approach for a smaller school.
    const { data, error } = await resend.emails.send({
      from: `EduSync Platform <${emailFrom}>`,
      to: emailFrom, // Send to self as a requirement for some providers
      bcc: uniqueEmails,
      subject: `School Announcement: ${announcement.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #2C3E50; border-bottom: 2px solid #C0392B; padding-bottom: 10px;">${announcement.title}</h1>
          <p style="line-height: 1.6;">${announcement.message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">This is an automated message from the school office.</p>
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
  }
}
