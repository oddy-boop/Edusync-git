
'use server';

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { getSession } from './session';

interface Announcement {
  title: string;
  message: string;
}

export async function sendAnnouncementEmail(
  announcement: Announcement,
  targetAudience: 'All' | 'Students' | 'Teachers'
): Promise<{ success: boolean; message: string }> {

    const supabase = createClient();
    let schoolId: number | null = null;
    const session = await getSession();

    if(session.isLoggedIn && session.schoolId) {
        schoolId = session.schoolId;
    } else {
        const { data: fallbackSchool } = await supabase.from('schools').select('id').order('created_at', { ascending: true }).limit(1).single();
        schoolId = fallbackSchool?.id || null;
    }
    
    if (!schoolId) {
        return { success: false, message: "Could not determine a school for sending the email." };
    }

    let schoolName = "School Announcement";
    let resendApiKey: string | undefined | null;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  
    try {
        const { data: settings, error: settingsError } = await supabase.from('schools').select('name, resend_api_key, email').eq('id', schoolId).single();
        if(settingsError) throw settingsError;

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
            const { data: students, error: studentError } = await supabase.from('students').select('contact_email').eq('school_id', schoolId);
            if(studentError) throw studentError;
            recipientEmails.push(...students.map(s => s.contact_email).filter((e): e is string => !!e));
        }

        if (targetAudience === 'Teachers' || targetAudience === 'All') {
            const { data: teachers, error: teacherError } = await supabase.from('teachers').select('email').eq('school_id', schoolId);
            if(teacherError) throw teacherError;
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
    }
}
