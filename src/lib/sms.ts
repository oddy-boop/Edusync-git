
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

// Helper to format Ghanaian phone numbers to E.164 standard for Twilio
function formatPhoneNumberToE164(phoneNumber: string): string | null {
  // Remove any non-digit characters, but keep a potential leading '+'
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');

  // If it already starts with '+', assume it's valid E.164 and return
  if (cleaned.startsWith('+')) {
    // A basic check for plausible length can be useful, e.g., +233 is 12 digits total
    return cleaned;
  }
  
  // Handle local Ghanaian format: 0XXXXXXXXX -> +233XXXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+233${cleaned.substring(1)}`;
  }
  
  // If we can't determine the format, it's invalid for our use case.
  console.warn(`Could not format phone number "${phoneNumber}" to E.164 standard. It will be skipped.`);
  return null;
}

interface Announcement {
    title: string;
    message: string;
}

interface SmsRecipient {
    phoneNumber: string; // Can be in local or E.164 format initially
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
    return { successCount: 0, errorCount: recipients.length };
  }

  if (recipients.length === 0) {
    console.log("No recipients for SMS announcement.");
    return { successCount: 0, errorCount: 0 };
  }

  const messageBody = `SJM Announcement: ${announcement.title}\n\n${announcement.message.substring(0, 300)}${announcement.message.length > 300 ? '...' : ''}`;

  const promises = recipients.map(recipient => {
    const formattedNumber = formatPhoneNumberToE164(recipient.phoneNumber);
    
    // If the number is invalid, treat it as a failed promise immediately.
    if (!formattedNumber) {
        console.error(`Invalid phone number format for SMS: ${recipient.phoneNumber}. Skipping.`);
        return Promise.resolve({ error: true, message: `Invalid phone number format for ${recipient.phoneNumber}` });
    }

    return client.messages.create({
      body: messageBody,
      from: fromPhoneNumber,
      to: formattedNumber,
    }).catch(error => {
      // Log individual errors from Twilio but don't let one failure stop the batch
      console.error(`Failed to send SMS to ${formattedNumber} (from ${recipient.phoneNumber}):`, error.message);
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
