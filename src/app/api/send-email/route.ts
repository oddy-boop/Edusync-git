import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { to, subject, message, thread_id, parent_email_id, school_id } = await request.json();

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch school's email configuration
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('resend_api_key, from_email, name')
      .eq('id', school_id)
      .single();

    if (schoolError || !school) {
      console.error('Failed to fetch school configuration:', schoolError);
      return NextResponse.json(
        { error: 'Failed to fetch school configuration' },
        { status: 500 }
      );
    }

    if (!school.from_email) {
      console.error('From email not configured for school:', school_id);
      return NextResponse.json(
        { error: 'From email not configured for this school. Please contact your administrator.' },
        { status: 500 }
      );
    }

    const html = `<div style="font-family: Inter, Poppins, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reply from ${school.name}</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
          This email was sent from ${school.name} administration system. 
          Please do not reply directly to this email.
        </p>
      </div>`;

    const mailPayload = {
      from: school.from_email,
      to: [to],
      subject,
      html,
      apiKey: school.resend_api_key || process.env.RESEND_API_KEY || undefined,
    };

    const mailResp = await fetch('https://mail-coral-sigma.vercel.app/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailPayload),
    });

    if (!mailResp.ok) {
      const body = await mailResp.text().catch(() => '');
      console.error('Mailer responded with', mailResp.status, body);
      return NextResponse.json({ error: 'Failed to send email', details: body }, { status: 500 });
    }

    // If email was sent successfully, record it in the database
    const emailRecord = {
      school_id: school_id,
      subject: subject,
      sender_name: 'Admin',
      sender_email: school.from_email,
      recipient_email: to,
      message: message,
      status: 'read',
      thread_id: thread_id,
      parent_email_id: parent_email_id,
      source: 'admin_reply',
      email_type: 'outgoing',
      sent_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('emails')
      .insert([emailRecord]);

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB insert fails, email was already sent
    }

    // Mark the original email as replied if parent_email_id is provided
    if (parent_email_id) {
      await supabase
        .from('emails')
        .update({ 
          status: 'replied',
          replied_at: new Date().toISOString()
        })
        .eq('id', parent_email_id);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully'
    });

  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}