"use server";

import { createClient } from '@/lib/supabase/server';

export type TwilioConfig = {
  accountSid?: string | null;
  authToken?: string | null;
  phoneNumber?: string | null;
  messagingServiceSid?: string | null;
};

export type SchoolCredentials = {
  schoolName?: string | null;
  email?: string | null;
  resendApiKey?: string | null;
  twilio: TwilioConfig;
};

/**
 * Retrieve credentials for a given school and apply environment fallbacks.
 * This centralizes the logic so callers don't duplicate DB access + fallback rules.
 */
export async function getSchoolCredentials(schoolId: number | null): Promise<SchoolCredentials> {
  const supabase = createClient();

  const creds: SchoolCredentials = {
    schoolName: undefined,
    email: undefined,
    resendApiKey: undefined,
    twilio: {
      accountSid: undefined,
      authToken: undefined,
      phoneNumber: undefined,
      messagingServiceSid: undefined,
    },
  };

  if (!schoolId) {
    // return env-only fallbacks
    creds.resendApiKey = process.env.RESEND_API_KEY || null;
    creds.email = process.env.SCHOOL_CONTACT_EMAIL || null;
    creds.twilio.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    creds.twilio.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    creds.twilio.phoneNumber = process.env.TWILIO_PHONE_NUMBER || null;
    creds.twilio.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
    return creds;
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('name, email, resend_api_key, twilio_account_sid, twilio_auth_token, twilio_phone_number, twilio_messaging_service_sid')
      .eq('id', schoolId)
      .single();

    if (!error && data) {
      creds.schoolName = data.name ?? null;
      creds.email = data.email ?? null;
      creds.resendApiKey = data.resend_api_key ?? null;
      creds.twilio.accountSid = data.twilio_account_sid ?? null;
      creds.twilio.authToken = data.twilio_auth_token ?? null;
      creds.twilio.phoneNumber = data.twilio_phone_number ?? null;
      creds.twilio.messagingServiceSid = data.twilio_messaging_service_sid ?? null;
    }
  } catch (e) {
    // if DB read fails, we'll fall back to environment variables below
    console.warn('getSchoolCredentials: failed to read school settings:', e);
  }

  // Apply environment fallbacks when school values are missing
  creds.resendApiKey = creds.resendApiKey || process.env.RESEND_API_KEY || null;
  creds.email = creds.email || process.env.SCHOOL_CONTACT_EMAIL || null;
  creds.twilio.accountSid = creds.twilio.accountSid || process.env.TWILIO_ACCOUNT_SID || null;
  creds.twilio.authToken = creds.twilio.authToken || process.env.TWILIO_AUTH_TOKEN || null;
  creds.twilio.phoneNumber = creds.twilio.phoneNumber || process.env.TWILIO_PHONE_NUMBER || null;
  creds.twilio.messagingServiceSid = creds.twilio.messagingServiceSid || process.env.TWILIO_MESSAGING_SERVICE_SID || null;

  return creds;
}
