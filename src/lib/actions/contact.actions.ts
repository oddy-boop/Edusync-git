
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSchoolCredentials } from '@/lib/getSchoolCredentials';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
  schoolId: z.coerce.number().min(1, "School ID is required."),
});

type ContactFormState = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
};

export async function sendContactMessageAction(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const formValues = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
    schoolId: formData.get('schoolId'),
  };

  const validatedFields = contactFormSchema.safeParse(formValues);

  if (!validatedFields.success) {
    console.error("Contact form validation failed:", validatedFields.error.issues);
    return {
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.issues,
    };
  }

  const { name, email, subject, message, schoolId } = validatedFields.data;
  
  // centralize credentials retrieval (reads school row and falls back to env vars)
  const creds = await getSchoolCredentials(schoolId);




    // Determine actual recipient: prefer school's configured fromEmail in production,
    // but allow a test override in non-production environments.
    const testingEmail = process.env.RESEND_TEST_EMAIL || 'odoomrichard089@gmail.com';
    const emailToAddress = creds.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'noreply@edusync.com';
    const actualToAddress = process.env.NODE_ENV === 'production' ? emailToAddress : testingEmail;

    // Use the centralized mailer service instead of the Resend SDK.
    const mailerPayload = {
      from: `${creds.schoolName} <${emailToAddress}>`,
      to: actualToAddress,
      subject: `[Contact] ${subject}`,
      html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Message:</strong></p><div>${message.replace(/\n/g, '<br>')}</div>`,
      reply_to: email,
      apiKey: creds.resendApiKey || process.env.RESEND_API_KEY || undefined,
    };

    const resp = await fetch('https://mail-coral-sigma.vercel.app/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailerPayload),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('Contact email failed, mailer responded with', resp.status, body);
      return { success: false, message: 'Failed to send message.' };
    }

  // Save the contact message to the emails table for admin management
  try {
    const supabase = createClient();
    
    const emailRecord = {
      school_id: schoolId,
      subject: subject,
      sender_name: name,
      sender_email: email,
      recipient_email: actualToAddress, // Use the actual recipient email (testing or production)
      message: message,
      status: 'unread',
      source: 'contact_form',
      email_type: 'incoming',
      sent_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('emails')
      .insert([emailRecord]);

    if (dbError) {
      console.error("Error saving contact message to database:", dbError);
      // Don't fail the request if DB insert fails, email was already sent
    }
  } catch (dbError) {
    console.error("Database error when saving contact message:", dbError);
    // Continue with success since email was sent
  }

  return { success: true, message: "Thank you for your message! We will get back to you shortly." };
}
