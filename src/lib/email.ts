
'use server';

import { getSchoolCredentials } from './getSchoolCredentials';
import { createClient } from '@/lib/supabase/server';

interface Announcement {
  title: string;
  message: string;
}

export async function sendAnnouncementEmail(
  announcement: Announcement,
  targetAudience: 'All' | 'Students' | 'Teachers',
  schoolId: number | null
): Promise<{ success: boolean; message: string }> {

    const creds = await getSchoolCredentials(schoolId);
    const supabase = createClient();

    if (!schoolId) {
        return { success: false, message: "School ID not provided for email service." };
    }

    const schoolName = creds.schoolName || "School Announcement";
    const schoolApiKey = creds.resendApiKey || process.env.RESEND_API_KEY || undefined;
    const emailFromAddress = creds.fromEmail || process.env.EMAIL_FROM_ADDRESS;

    if (!emailFromAddress) {
        const errorMsg = "EMAIL_FROM_ADDRESS is not set in school settings or environment variables.";
        console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
        return { success: false, message: "Email sender identity is not configured." };
    }
    let recipientEmails: string[] = [];

    try {
    if (targetAudience === 'Students' || targetAudience === 'All') {
            const { data: students, error: studentError } = await supabase.from('students').select('contact_email').eq('school_id', schoolId);
            if(studentError) throw studentError;
            recipientEmails.push(...(students as any[]).map((s: any) => s.contact_email).filter((e: any): e is string => !!e));
        }

        if (targetAudience === 'Teachers' || targetAudience === 'All') {
            const { data: teachers, error: teacherError } = await supabase.rpc('get_my_teacher_profile');
            if(teacherError) throw teacherError;
            recipientEmails.push(...(teachers as any[]).map((t: any) => t.email).filter((e: any): e is string => !!e));
        }

        const uniqueEmails = [...new Set(recipientEmails)];

        if (uniqueEmails.length === 0) {
        console.log('No recipients found for the announcement email.');
        return { success: true, message: 'Announcement saved, but no recipients found to email.' };
        }
        
        const html = `
            <div style="font-family: Inter, Poppins, Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #2C3E50; border-bottom: 2px solid #C0392B; padding-bottom: 10px;">${announcement.title}</h1>
            <p style="line-height: 1.6;">${announcement.message.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">This is an automated message from the school office of ${schoolName}.</p>
            </div>
        `;

        const payload = {
            from: `${schoolName} <${emailFromAddress}>`,
            to: emailFromAddress,
            bcc: uniqueEmails,
            subject: `Announcement from ${schoolName}: ${announcement.title}`,
            html,
            // include the school's API key when available so the custom service can relay if needed
            apiKey: schoolApiKey,
        };

        const resp = await fetch('https://mail-coral-sigma.vercel.app/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Mailer error ${resp.status}: ${body}`);
        }

        return { success: true, message: `Email sent to ${uniqueEmails.length} recipients.` };
    } catch (error: any) {
        console.error('Error in sendAnnouncementEmail:', error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
