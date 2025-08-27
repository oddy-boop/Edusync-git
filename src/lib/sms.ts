
'use server';

import Twilio from 'twilio';
import { getSchoolCredentials } from './getSchoolCredentials';

// This function attempts to create a Twilio client and identify the sender.
async function getTwilioConfig(schoolId: number | null) {
  const creds = await getSchoolCredentials(schoolId);

  const accountSid = creds.twilio.accountSid;
  const authToken = creds.twilio.authToken;
  const fromPhoneNumber = creds.twilio.phoneNumber;
  const messagingServiceSid = creds.twilio.messagingServiceSid;

  const isConfigured = 
    accountSid && !accountSid.includes("YOUR_") && !accountSid.includes("ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") &&
    authToken && !authToken.includes("YOUR_") &&
    (fromPhoneNumber || messagingServiceSid);

  if (!isConfigured) {
    const warningMsg = "SMS_PROVIDER_UNCONFIGURED: Twilio credentials are not fully set. SMS notifications will be disabled.";
    console.warn(warningMsg);
    return { client: null, from: null, messagingServiceSid: null, error: warningMsg };
  }

  try {
    const twilioClient = Twilio(accountSid as string, authToken as string);
    return { client: twilioClient, from: fromPhoneNumber, messagingServiceSid, error: null };
  } catch (e: any) {
    const errorMsg = `Failed to initialize Twilio client: ${e.message}`;
    console.error(errorMsg);
    return { client: null, from: null, messagingServiceSid: null, error: errorMsg };
  }
}


/**
 * Formats a phone number to E.164 standard.
 * Specifically handles Ghanaian numbers starting with '0'.
 * @param phoneNumber The phone number string to format.
 * @returns A formatted E.164 string (e.g., +233244123456) or null if invalid.
 */
function formatPhoneNumberToE164(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  
  // Remove all non-digit characters except for the leading '+'
  let cleaned = phoneNumber.trim();
  // Remove common separators
  cleaned = cleaned.replace(/[\s\-\.\(\)]/g, '');

  // If it already starts with '+', normalize and return
  if (cleaned.startsWith('+')) {
    const digits = cleaned.replace(/[^\d+]/g, '');
    return digits;
  }

  // Handle numbers that start with international 00 prefix (e.g., 00233244123456)
  if (cleaned.startsWith('00')) {
    const withoutZeros = cleaned.replace(/^00/, '');
    return `+${withoutZeros}`;
  }

  // If starts with country code without plus (e.g., 233244123456), accept it
  if (/^233\d{8,12}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Local Ghanaian formats
  // 10-digit starting with 0 -> +233XXXXXXXXX
  if (/^0\d{9}$/.test(cleaned)) {
    return `+233${cleaned.substring(1)}`;
  }

  // 9-digit local number missing leading 0 -> +233XXXXXXXXX
  if (/^\d{9}$/.test(cleaned)) {
    return `+233${cleaned}`;
  }

  console.warn(`Could not format phone number "${phoneNumber}" to E.164 standard. It will be skipped.`);
  return null;
}

interface SmsPayload {
    schoolId: number | null;
    message: string;
    recipients: { phoneNumber: string }[];
}

/**
 * Sends an SMS to a list of recipients.
 * @param payload - The SMS payload with message and recipients.
 * @returns A promise that resolves with the count of successful/failed messages and the first error message if any.
 */
export async function sendSms(payload: SmsPayload): Promise<{ successCount: number; errorCount: number; firstErrorMessage: string | null; }> {
  const { client, from, messagingServiceSid, error: clientError } = await getTwilioConfig(payload.schoolId);

  if (!client || clientError) {
    const errorMsg = clientError || "Twilio is not initialized.";
    console.error(`sendSms failed: ${errorMsg}`);
    return { successCount: 0, errorCount: payload.recipients.length, firstErrorMessage: errorMsg };
  }
  
  if (!messagingServiceSid && !from) {
      const errorMsg = "No sending method configured. Either a 'From' phone number or a 'Messaging Service SID' is required.";
      console.error(`sendSms failed: ${errorMsg}`);
      return { successCount: 0, errorCount: payload.recipients.length, firstErrorMessage: errorMsg };
  }

  if (payload.recipients.length === 0) {
    console.log("No recipients provided for SMS.");
    return { successCount: 0, errorCount: 0, firstErrorMessage: null };
  }

  const messageBody = payload.message.substring(0, 1600); // Twilio max length

  const promises = payload.recipients.map(recipient => {
    const formattedNumber = formatPhoneNumberToE164(recipient.phoneNumber);
    
    if (!formattedNumber) {
        const errorMsg = `Invalid phone number format for ${recipient.phoneNumber}`;
        console.error(`SMS Sending Error: ${errorMsg}. Skipping.`);
        return Promise.resolve({ error: true, message: errorMsg });
    }

    const messageOptions: { body: string; to: string; from?: string; messagingServiceSid?: string } = {
        body: messageBody,
        to: formattedNumber,
    };
    
    // Prioritize Messaging Service for better deliverability
    if (messagingServiceSid) {
        messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (from) {
        messageOptions.from = from;
    }

    return client.messages.create(messageOptions).then(message => {
        return { error: false, message: `SMS sent to ${formattedNumber} with SID ${message.sid}` };
    }).catch(error => {
      const errorMessage = (error as any).message || "Unknown Twilio error.";
      console.error(`Failed to send SMS to ${formattedNumber} (from ${recipient.phoneNumber}):`, errorMessage);
      return { error: true, message: errorMessage };
    });
  });

  const results = await Promise.all(promises);
  
  let successCount = 0;
  let errorCount = 0;
  let firstErrorMessage: string | null = null;

  results.forEach(result => {
    if (result && !result.error) {
      successCount++;
    } else {
      errorCount++;
      if (!firstErrorMessage && result) {
        firstErrorMessage = result.message;
      }
    }
  });
  
  if (firstErrorMessage) {
      console.log(`SMS sending finished with errors. First error: ${firstErrorMessage}`);
  }
  console.log(`SMS sending complete. Success: ${successCount}, Failed: ${errorCount}`);
  return { successCount, errorCount, firstErrorMessage };
}
