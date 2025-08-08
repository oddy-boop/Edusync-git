
'use server';

import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// This function attempts to create a Twilio client and identify the sender.
async function getTwilioConfig() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("SMS Service Error: Supabase credentials not found.");
        return { client: null, from: null, messagingServiceSid: null, error: "Supabase credentials not configured." };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch settings from DB first
    const { data: settings, error: dbError } = await supabaseAdmin
        .from('app_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_phone_number, twilio_messaging_service_sid')
        .single();
    
    if (dbError && dbError.code !== 'PGRST116') {
        console.warn("SMS Service Warning: Could not fetch settings from DB. Will rely on .env.", dbError);
    }
    
    const accountSid = settings?.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = settings?.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = settings?.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = settings?.twilio_messaging_service_sid || process.env.TWILIO_MESSAGING_SERVICE_SID;

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
        const client = Twilio(accountSid, authToken);
        return { client, from: fromPhoneNumber, messagingServiceSid, error: null };
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
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it already starts with '+', assume it's valid E.164
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's a 10-digit number starting with '0', assume it's a local Ghanaian number
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `+233${cleaned.substring(1)}`;
  }
  
  // If it's a 9-digit number, assume it's a local Ghanaian number missing the leading '0'
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      return `+233${cleaned}`;
  }

  // Log a warning for numbers that couldn't be formatted.
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
  const { client, from, messagingServiceSid, error: clientError } = await getTwilioConfig();

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
