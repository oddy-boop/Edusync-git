
'use server';

import { Resend } from 'resend';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Import admin client
import { createClient } from '@/lib/supabase/server'; // Import server component client

// This function dynamically gets the Resend client for a specific school
async function getResendClientForSchool(schoolId: string, supabaseAdmin: any): Promise<{ resend: Resend | null, fromAddress: string | null }> {
    const { data: settings, error } = await supabaseAdmin
        .from('app_settings')
        .select('resend_api_key, school_email')
        .eq('school_id', schoolId)
        .single();
        
    if (error || !settings?.resend_api_key || !settings?.school_email) {
        console.warn(`Email configuration not found for school_id ${schoolId}.`, error);
        return { resend: null, fromAddress: null };
    }

    return { 
        resend: new Resend(settings.resend_api_key), 
        fromAddress: settings.school_email 
    };
}


interface Announcement {
  title: string;
  message: string;
}

export async function sendAnnouncementEmail(
  announcement: Announcement,
  targetAudience: 'All' | 'Students' | 'Teachers'
): Promise<{ success: boolean; message: string }> {
  // Simplified client creation
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  const { data: adminRoleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
  if (!adminRoleData?.school_id) {
    return { success: false, message: "Could not determine the school for this announcement." };
  }
  const schoolId = adminRoleData.school_id;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const errorMsg = "Supabase server credentials are not configured for sending emails.";
    return { success: false, message: errorMsg };
  }
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceRoleKey);

  const { resend, fromAddress } = await getResendClientForSchool(schoolId, supabaseAdmin);

  if (!resend || !fromAddress) {
    const errorMsg = "Email provider (Resend) is not configured for this school.";
    console.error(`sendAnnouncementEmail failed: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  let recipientEmails: string[] = [];

  try {
    if (targetAudience === 'Students' || targetAudience === 'All') {
      const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('contact_email')
        .eq('school_id', schoolId); // Filter by school
      if (error) throw new Error(`Failed to fetch student emails: ${error.message}`);
      if (students) {
        recipientEmails.push(...students.map(s => s.contact_email).filter((e): e is string => !!e));
      }
    }

    if (targetAudience === 'Teachers' || targetAudience === 'All') {
      const { data: teachers, error } = await supabaseAdmin
        .from('teachers')
        .select('email')
        .eq('school_id', schoolId); // Filter by school
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
    
    const { data, error } = await resend.emails.send({
      from: `EduSync Announcement <${fromAddress}>`,
      to: fromAddress, // Send to self as a requirement for some providers
      bcc: uniqueEmails,
      subject: `EduSync Announcement: ${announcement.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #2C3E50; border-bottom: 2px solid #C0392B; padding-bottom: 10px;">${announcement.title}</h1>
          <p style="line-height: 1.6;">${announcement.message.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">This is an automated message from the EduSync Platform.</p>
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
