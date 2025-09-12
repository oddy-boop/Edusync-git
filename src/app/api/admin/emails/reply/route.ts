import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

// Function to get Resend client with runtime API key resolution
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  return new Resend(apiKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role and get school_id and user details
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, school_id, full_name, email')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData || !['admin', 'super_admin', 'accountant'].includes(profileData.role)) {
      return NextResponse.json({ error: "Forbidden - Admin/Accountant access required" }, { status: 403 });
    }

    const schoolId = profileData.school_id;
    if (!schoolId) {
      return NextResponse.json({ error: "School ID not found" }, { status: 400 });
    }

    const body = await request.json();
    const { parentEmailId, recipientEmail, subject, message, replyTo } = body;

    if (!parentEmailId || !recipientEmail || !subject || !message) {
      return NextResponse.json({ 
        error: "Parent email ID, recipient email, subject, and message are required" 
      }, { status: 400 });
    }

    // Get the original email to inherit thread_id
    const { data: originalEmail, error: originalError } = await supabase
      .from('emails')
      .select('thread_id, sender_email, subject')
      .eq('id', parentEmailId)
      .eq('school_id', schoolId)
      .single();

    if (originalError || !originalEmail) {
      return NextResponse.json({ error: "Original email not found" }, { status: 404 });
    }

    // Get school details for sender information
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('name, contact_email')
      .eq('id', schoolId)
      .single();

    const fromEmail = school?.contact_email || process.env.RESEND_FROM_EMAIL || 'noreply@edusync.com';
    const fromName = `${profileData.full_name} - ${school?.name || 'EduSync'}`;
    const replyToEmail = replyTo || profileData.email || fromEmail;

    // Get Resend client and send email
    const resend = getResendClient();
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      reply_to: replyToEmail,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Reply from ${school?.name || 'EduSync'}</h2>
            <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #2563eb;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p><strong>From:</strong> ${fromName}</p>
              <p><strong>Email:</strong> ${replyToEmail}</p>
              <p>This is an automated response from the ${school?.name || 'EduSync'} admin portal.</p>
            </div>
          </div>
        </div>
      `,
      text: message,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    // Save the reply to the database
    const { data: savedReply, error: saveError } = await supabase
      .from('emails')
      .insert({
        school_id: schoolId,
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        sender_name: fromName,
        sender_email: fromEmail,
        recipient_email: recipientEmail,
        message: message,
        html_content: `Reply from ${fromName}: ${message}`,
        status: 'sent',
        thread_id: originalEmail.thread_id,
        parent_email_id: parentEmailId,
        source: 'admin_reply',
        email_type: 'outgoing',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving reply to database:', saveError);
      // Don't fail the request since email was sent successfully
    }

    // Update the original email status to 'replied'
    await supabase
      .from('emails')
      .update({ 
        status: 'replied', 
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', parentEmailId)
      .eq('school_id', schoolId);

    return NextResponse.json({ 
      success: true, 
      emailId: emailResult?.id,
      savedReply: savedReply 
    });

  } catch (error) {
    console.error('Email reply API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
