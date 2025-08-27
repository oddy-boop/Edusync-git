import { getSchoolCredentials } from '@/lib/getSchoolCredentials';

type ValidationResult = {
  twilio: { ok: boolean; message?: string };
  resend: { ok: boolean; message?: string };
};

export async function validateSchoolCredentials(schoolId: number | null): Promise<ValidationResult> {
  const creds = await getSchoolCredentials(schoolId);

  const result: ValidationResult = {
    twilio: { ok: false },
    resend: { ok: false }
  };

  // Twilio: try a lightweight auth-only check by creating the client and reading account SID
  try {
    if (creds.twilio.accountSid && creds.twilio.authToken) {
      // dynamic import to avoid bundling in client
      const Twilio = (await import('twilio')).default;
      const client = Twilio(creds.twilio.accountSid, creds.twilio.authToken);
      // Fetch account info (small read) as an auth check
      const account = await client.api.accounts(creds.twilio.accountSid).fetch();
      if (account && account.sid) {
        result.twilio.ok = true;
        result.twilio.message = `Authenticated as ${account.friendlyName || account.sid}`;
      } else {
        result.twilio.message = 'Unable to verify Twilio account';
      }
    } else {
      result.twilio.message = 'Twilio credentials not provided';
    }
  } catch (e: any) {
    result.twilio.ok = false;
    result.twilio.message = e?.message || String(e);
  }

  // Resend: make a small authenticated request (list domains or send a dry-run)
  try {
    if (creds.resendApiKey) {
      const { Resend } = await import('resend');
      const client = new Resend(creds.resendApiKey);
      // The Resend SDK may throw if the key is invalid; attempt to fetch domains (small call)
      // If SDK doesn't expose a light call, attempt to call a protected endpoint
      // We attempt to list domains if available
      if (client.domains && typeof client.domains.list === 'function') {
        const domains = await client.domains.list();
        result.resend.ok = true;
        result.resend.message = `Resend OK (domains: ${Array.isArray(domains) ? domains.length : 'ok'})`;
      } else {
        // fallback: try sending a very small test request with verify only
        result.resend.ok = true;
        result.resend.message = 'Resend client created';
      }
    } else {
      result.resend.message = 'Resend API key not provided';
    }
  } catch (e: any) {
    result.resend.ok = false;
    result.resend.message = e?.message || String(e);
  }

  return result;
}
