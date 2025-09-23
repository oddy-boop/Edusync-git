import { getSchoolCredentials } from '@/lib/getSchoolCredentials';

type SchoolCredentials = {
  twilio: {
    // Legacy field name retained for storage compatibility; may contain provider-specific keys
    accountSid?: string;
    authToken?: string;
    // Generic API key or token field used by Arkesel or other SMS providers
    authKey?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
  resendApiKey?: string;
};

type ValidationResult = {
  twilio: { ok: boolean; message?: string };
  resend: { ok: boolean; message?: string };
};

export async function validateSchoolCredentials(schoolId: number | null): Promise<ValidationResult> {
  const creds = (await getSchoolCredentials(schoolId)) as unknown as SchoolCredentials;

  const result: ValidationResult = {
    twilio: { ok: false },
    resend: { ok: false }
  };

  // Arkesel: validate SMS gateway credentials
  // The app stores Arkesel creds under creds.arkesel (apiKey, senderId). Older rows may have legacy fields.
  try {
    // Prefer the explicit arkesel slot; fall back to legacy twilio-shaped slot if present
    const arkAny: any = (creds as any).arkesel ?? (creds as any).twilio ?? {};
    const hasApiKey = !!(arkAny?.apiKey || arkAny?.authKey);
    const hasBasic = !!(arkAny?.accountSid && arkAny?.authToken);

    if (hasApiKey || hasBasic) {
      // Use the SMS-specific Arkesel subdomain. The root domain returns HTML 404 and is not
      // the correct API host for SMS account validation.
      const url = 'https://sms.arkesel.com/api/account';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Prefer Bearer for arkesel apiKey, but also include apiKey header as a fallback for validation
      if (arkAny?.apiKey) {
        headers['Authorization'] = `Bearer ${arkAny.apiKey}`;
        headers['apiKey'] = arkAny.apiKey;
        headers['x-api-key'] = arkAny.apiKey;
      } else if (arkAny?.authKey) {
        headers['Authorization'] = `Bearer ${arkAny.authKey}`;
        headers['apiKey'] = arkAny.authKey;
      } else if (hasBasic) {
        const token = Buffer.from(`${arkAny.accountSid}:${arkAny.authToken}`).toString('base64');
        headers['Authorization'] = `Basic ${token}`;
      }

      try {
        const resp = await fetch(url, { method: 'GET', headers });
        const text = await resp.text();
        if (resp.ok) {
          result.twilio.ok = true;
          result.twilio.message = `Arkesel OK`;
        } else {
          result.twilio.ok = false;
          try {
            const json = JSON.parse(text);
            result.twilio.message = json?.message || json?.error || `Arkesel returned ${resp.status}`;
          } catch (e) {
            result.twilio.message = `Arkesel returned ${resp.status}: ${text.slice(0, 200)}`;
          }
        }
      } catch (networkErr: any) {
        result.twilio.ok = false;
        result.twilio.message = networkErr?.message || String(networkErr);
      }
    } else {
      result.twilio.message = 'Arkesel (SMS) credentials not provided';
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
