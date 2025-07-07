
'use server';

import { z } from 'zod';
import { Resend } from 'resend';

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

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.EMAIL_FROM_ADDRESS; // Send contact messages to the admin email

  if (!resendApiKey || resendApiKey.includes("YOUR_")) {
    console.error("Contact Form Error: RESEND_API_KEY is not configured.");
    return { success: false, message: "The server is not configured to send emails. Please contact support directly." };
  }
  
  if (!emailTo) {
      console.error("Contact Form Error: EMAIL_FROM_ADDRESS is not set. Cannot determine where to send the message.");
      return { success: false, message: "The server email configuration is incomplete." };
  }

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: `Contact Form <${emailTo}>`, // Use an admin or no-reply address
      to: emailTo,
      reply_to: email, // Set the sender's email as the reply-to address
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

    return { success: true, message: "Thank you for your message! We will get back to you shortly." };
  } catch (error: any) {
    console.error("Error sending contact email:", error);
    return { success: false, message: `Failed to send message: ${error.message}` };
  }
}
