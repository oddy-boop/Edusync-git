
'use server';

import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const isTwilioConfigured = 
  accountSid && !accountSid.includes("YOUR_") &&
  authToken && !authToken.includes("YOUR_") &&
  fromPhoneNumber && !fromPhoneNumber.includes("YOUR_");

if (!isTwilioConfigured) {
  console.warn("SMS_PROVIDER_UNCONFIGURED: Twilio environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not fully set with valid values. SMS notifications will be disabled.");
}

const client = isTwilioConfigured ? Twilio(accountSid, authToken) : null;

function formatPhoneNumberToE164(phoneNumber: string): string | null {
  if (!phoneNumber) return null;
  const cleaned = phoneNumber.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+233${cleaned.substring(1)}`;
  }
  
  console.warn(`Could not format phone number "${phoneNumber}" to E.164 standard. It will be skipped.`);
  return null;
}

interface SmsPayload {
    message: string;
    recipients: { phoneNumber: string }[];
}

/**
 * Sends an SMS to a list of recipients.
 * @param payload - The SMS payload with message and recipients.
 * @returns A promise that resolves with the count of successful/failed messages and the first error message if any.
 */
export async function sendSms(payload: SmsPayload): Promise<{ successCount: number; errorCount: number; firstErrorMessage: string | null; }> {
  if (!client || !fromPhoneNumber) {
    const errorMsg = "Twilio is not initialized. Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are correctly set in your .env file.";
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

    return client.messages.create({
      body: messageBody,
      from: fromPhoneNumber,
      to: formattedNumber,
    }).then(message => {
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
