
'use server';

import { z } from 'zod';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server'; // Use server client
import { getSubdomain } from '@/lib/utils';
import { headers } from 'next/headers';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
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
  const validatedFields = contactFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.issues,
    };
  }

  const { name, email, subject, message } = validatedFields.data;
  const supabase = createClient();
  let resendApiKey: string | undefined | null;
  let emailToAddress: string | undefined | null;
  const emailFromAddress = process.env.EMAIL_FROM_ADDRESS;
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);

  try {
    let settingsQuery;
    if (subdomain) {
      settingsQuery = supabase.from('schools').select('email, resend_api_key').eq('domain', subdomain).single();
    } else {
      settingsQuery = supabase.from('schools').select('email, resend_api_key').order('created_at', { ascending: true }).limit(1).single();
    }
    
    const { data: settings, error: dbError } = await settingsQuery;
    if (dbError) throw dbError;

    resendApiKey = settings?.resend_api_key || process.env.RESEND_API_KEY;
    emailToAddress = settings?.email;

    if (!emailToAddress) {
      throw new Error("School contact email not found in settings.");
    }
  } catch (dbError: any) {
    console.error("Contact Form DB Error: Could not fetch settings.", dbError);
    return { success: false, message: "Could not determine where to send the message. Please contact support." };
  }

  if (!resendApiKey || resendApiKey.includes("YOUR_")) {
    console.error("Contact Form Error: RESEND_API_KEY is not configured in settings or environment.");
    return { success: false, message: "The server is not configured to send emails. Please contact support directly." };
  }
  
  if (!emailFromAddress) {
      console.error("Contact Form Error: EMAIL_FROM_ADDRESS is not set for the sender identity.");
      return { success: false, message: "The server email sender configuration is incomplete." };
  }
  
  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: `Contact Form <${emailFromAddress}>`,
    to: emailToAddress,
    reply_to: email,
    subject: `New Contact Form Message: ${subject}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>New Message from School Website</h2>
        <p>You have received a new message through the contact form.</p>
        <hr>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="padding: 10px; border-left: 3px solid #eee;">${message.replace(/\n/g, '<br>')}</p>
      </div>
    `,
  });

  if (error) {
    console.error("Error sending contact email via Resend:", error);
    return { success: false, message: `Failed to send message: ${error.message}` };
  }

  return { success: true, message: "Thank you for your message! We will get back to you shortly." };
}
