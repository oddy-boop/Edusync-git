
'use server';

import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const isTwilioConfigured = 
  accountSid && !accountSid.includes("YOUR_") &&
  authToken && !authToken.includes("YOUR_") &&
  fromPhoneNumber && !fromPhoneNumber.includes("YOUR_");

// Safety checks for environment variables
if (!isTwilioConfigured) {
  console.warn("SMS_PROVIDER_UNCONFIGURED: Twilio environment variables (ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER) are not fully set with valid values. SMS notifications will be disabled.");
}

const client = isTwilioConfigured ? Twilio(accountSid, authToken) : null;


interface Announcement {
    title: string;
    message: string;
}

interface SmsRecipient {
    phoneNumber: string; // E.164 format e.g., +14155552671
}

/**
 * Sends an announcement SMS to a list of recipients.
 * @param announcement - The announcement object with title and message.
 * @param recipients - An array of recipient objects with phone numbers.
 * @returns A promise that resolves with the count of successful and failed messages.
 */
export async function sendAnnouncementSms(announcement: Announcement, recipients: SmsRecipient[]): Promise<{ successCount: number; errorCount: number; }> {
  if (!client || !fromPhoneNumber) {
    console.error("sendAnnouncementSms failed: Twilio is not initialized. Check your environment variables.");
    // Do not throw to avoid breaking the main flow, but log for the developer.
    return { successCount: 0, errorCount: recipients.length };
  }

  if (recipients.length === 0) {
    console.log("No recipients for SMS announcement.");
    return { successCount: 0, errorCount: 0 };
  }

  const messageBody = `SJM Announcement: ${announcement.title}\n\n${announcement.message.substring(0, 300)}${announcement.message.length > 300 ? '...' : ''}`;

  const promises = recipients.map(recipient => {
    return client.messages.create({
      body: messageBody,
      from: fromPhoneNumber,
      to: recipient.phoneNumber,
    }).catch(error => {
      // Log individual errors but don't let one failure stop the batch
      console.error(`Failed to send SMS to ${recipient.phoneNumber}:`, error.message);
      return { error: true, message: error.message }; // Return an error object
    });
  });

  const results = await Promise.allSettled(promises);
  
  let successCount = 0;
  let errorCount = 0;

  results.forEach(result => {
    if (result.status === 'fulfilled' && !(result.value as any)?.error) {
      successCount++;
    } else {
      errorCount++;
    }
  });

  console.log(`SMS sending complete. Success: ${successCount}, Failed: ${errorCount}`);
  return { successCount, errorCount };
}
