
'use server';

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

const isResendConfigured = resendApiKey && !resendApiKey.includes("YOUR_");

// Safety check for the API key
if (!isResendConfigured) {
  console.warn("EMAIL_PROVIDER_UNCONFIGURED: RESEND_API_KEY is not set with a valid value in the environment variables. Email notifications will be disabled.");
}

const resend = isResendConfigured ? new Resend(resendApiKey) : null;
// It's recommended to use a verified domain from your email provider
const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

interface Announcement {
    title: string;
    message: string;
    author_name?: string | null;
}

interface Recipient {
    email: string;
    full_name: string;
}

/**
 * Sends an announcement email to a list of recipients.
 * @param announcement - The announcement object with title, message, and author.
 * @param recipients - An array of recipient objects with email and full_name.
 * @returns A promise that resolves when the email is sent.
 */
export async function sendAnnouncementEmail(announcement: Announcement, recipients: Recipient[]) {
  if (!resend) {
    console.error("sendAnnouncementEmail failed: Resend is not initialized. Check RESEND_API_KEY.");
    // We don't throw an error here to avoid breaking the main flow, 
    // but we log it for the developer.
    return;
  }

  if (recipients.length === 0) {
    console.log("No recipients to send announcement to.");
    return;
  }

  const emailsToSend = recipients.map(recipient => ({
    from: `St. Joseph's Montessori <${fromAddress}>`,
    to: recipient.email,
    subject: `New School Announcement: ${announcement.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Announcement from St. Joseph's Montessori</h2>
        <p>Hello ${recipient.full_name},</p>
        <p>A new announcement has been posted by <strong>${announcement.author_name || 'Admin'}</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <h3>${announcement.title}</h3>
        <p style="white-space: pre-wrap;">${announcement.message}</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p>You can view all announcements by logging into your portal.</p>
        <p style="font-size: 0.8em; color: #888;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    `,
  }));

  try {
    // Resend's batch send has a limit of 100 emails per call
    const batchSize = 100;
    for (let i = 0; i < emailsToSend.length; i += batchSize) {
        const batch = emailsToSend.slice(i, i + batchSize);
        await resend.batch.send(batch);
        console.log(`Successfully sent announcement email batch ${i/batchSize + 1} to ${batch.length} recipients.`);
    }
  } catch (error) {
    console.error("Failed to send announcement emails:", error);
    // Re-throw to be caught by the calling function
    throw new Error("Failed to send one or more notification emails.");
  }
}
