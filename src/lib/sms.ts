

// Arkesel SMS API integration
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const ARKESEL_SENDER_ID = process.env.ARKESEL_SENDER_ID || 'EduSync';

interface SmsPayload {
  schoolId: number | null;
  message: string;
  recipients: { phoneNumber: string }[];
  apiKey?: string;
  senderId?: string;
}



/**
 * Sends an SMS to a list of recipients using Arkesel API.
 */
export async function sendSms(payload: SmsPayload): Promise<{ successCount: number; errorCount: number; firstErrorMessage: string | null; }> {
  const apiKey = payload.apiKey || ARKESEL_API_KEY;
  const senderId = payload.senderId || ARKESEL_SENDER_ID;
  if (!apiKey) {
    const errorMsg = 'Arkesel API key not configured.';
    console.error(errorMsg);
    return { successCount: 0, errorCount: payload.recipients.length, firstErrorMessage: errorMsg };
  }
  if (payload.recipients.length === 0) {
    return { successCount: 0, errorCount: 0, firstErrorMessage: null };
  }
  const messageBody = payload.message.substring(0, 1600);
  let successCount = 0;
  let errorCount = 0;
  let firstErrorMessage: string | null = null;

  for (const recipient of payload.recipients) {
    const formattedNumber = formatPhoneNumberToE164(recipient.phoneNumber);
    if (!formattedNumber) {
      errorCount++;
      if (!firstErrorMessage) firstErrorMessage = `Invalid phone number: ${recipient.phoneNumber}`;
      continue;
    }
    try {
      const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
        },
        body: JSON.stringify({
          sender: senderId,
          message: messageBody,
          recipients: [formattedNumber],
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        successCount++;
      } else {
        errorCount++;
        if (!firstErrorMessage) firstErrorMessage = data.message || 'Unknown Arkesel error.';
      }
    } catch (e: any) {
      errorCount++;
      if (!firstErrorMessage) firstErrorMessage = e?.message || 'Network error.';
    }
  }
  return { successCount, errorCount, firstErrorMessage };
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


// Only Arkesel SMS integration remains
