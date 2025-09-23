"use server";

import { createClient } from '@/lib/supabase/server';

export type ArkeselConfig = {
  apiKey?: string | null;
  senderId?: string | null;
};

export type SchoolCredentials = {
  schoolName?: string | null;
  email?: string | null;
  fromEmail?: string | null;
  resendApiKey?: string | null;
  arkesel: ArkeselConfig;
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
    fromEmail: undefined,
    resendApiKey: undefined,
    arkesel: {
      apiKey: undefined,
      senderId: undefined,
    },
  };

  if (!schoolId) {
    creds.resendApiKey = process.env.RESEND_API_KEY || null;
    creds.email = process.env.SCHOOL_CONTACT_EMAIL || null;
    creds.fromEmail = process.env.FROM_EMAIL || null;
    creds.arkesel.apiKey = process.env.ARKESEL_API_KEY || null;
    creds.arkesel.senderId = process.env.ARKESEL_SENDER_ID || null;
    return creds;
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('name, email, from_email, resend_api_key, arkesel_api_key, arkesel_sender_id')
      .eq('id', schoolId)
      .single();

    if (!error && data) {
      creds.schoolName = data.name ?? null;
      creds.email = data.email ?? null;
      creds.fromEmail = data.from_email ?? null;
      creds.resendApiKey = data.resend_api_key ?? null;
      creds.arkesel.apiKey = data.arkesel_api_key ?? process.env.ARKESEL_API_KEY ?? null;
      creds.arkesel.senderId = data.arkesel_sender_id ?? process.env.ARKESEL_SENDER_ID ?? null;
    }
  } catch (e) {
    console.warn('getSchoolCredentials: failed to read school settings:', e);
  }

  creds.resendApiKey = creds.resendApiKey || process.env.RESEND_API_KEY || null;
  creds.email = creds.email || process.env.SCHOOL_CONTACT_EMAIL || null;
  creds.fromEmail = creds.fromEmail || process.env.FROM_EMAIL || null;
  creds.arkesel.apiKey = creds.arkesel.apiKey || process.env.ARKESEL_API_KEY || null;
  creds.arkesel.senderId = creds.arkesel.senderId || process.env.ARKESEL_SENDER_ID || null;

  return creds;
}
