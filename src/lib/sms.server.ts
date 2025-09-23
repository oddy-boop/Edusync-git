import { getSchoolCredentials } from '@/lib/getSchoolCredentials';

// Note: we no longer read ARKESEL_* directly from env at module init for sendSmsServer.
// Instead, fetch per-school credentials at call time so DB-stored keys take precedence.

interface SmsRecipient { phoneNumber: string }
interface SmsPayload { schoolId: number | null; message: string; recipients: SmsRecipient[] }

function formatPhoneNumberToE164(phoneNumber: string): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  let cleaned = phoneNumber.trim();
  cleaned = cleaned.replace(/[\s\-\.\(\)]/g, '');
  if (cleaned.startsWith('+')) return cleaned.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.replace(/^00/, '')}`;
  if (/^233\d{8,12}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0\d{9}$/.test(cleaned)) return `+233${cleaned.substring(1)}`;
  if (/^\d{9}$/.test(cleaned)) return `+233${cleaned}`;
  return null;
}

export async function sendSmsServer(payload: SmsPayload) {
  // Resolve credentials: prefer per-school DB credentials, fallback to env vars
  let arkeselApiKey: string | null = null;
  let arkeselSenderId: string | null = null;
  try {
    const creds = await getSchoolCredentials(payload.schoolId ?? null);
    arkeselApiKey = creds.arkesel.apiKey || process.env.ARKESEL_API_KEY || null;
    arkeselSenderId = creds.arkesel.senderId || process.env.ARKESEL_SENDER_ID || 'EduSync';
  } catch (e) {
    arkeselApiKey = process.env.ARKESEL_API_KEY || null;
    arkeselSenderId = process.env.ARKESEL_SENDER_ID || 'EduSync';
  }

  if (!arkeselApiKey) {
    throw new Error('Arkesel API key not configured.');
  }
  if (!payload.recipients || payload.recipients.length === 0) {
    return { successCount: 0, errorCount: 0, firstErrorMessage: null };
  }

  let successCount = 0;
  let errorCount = 0;
  let firstErrorMessage: string | null = null;
  const attempts: Array<Record<string, any>> = [];

  for (const r of payload.recipients) {
    const formatted = formatPhoneNumberToE164(r.phoneNumber);
    if (!formatted) {
      errorCount++;
      if (!firstErrorMessage) firstErrorMessage = `Invalid phone number: ${r.phoneNumber}`;
      continue;
    }
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'api-key': arkeselApiKey,
      };

      // Prepare diagnostic metadata (do not include secret values)
      const requestHeaderNames = Object.keys(headers);
      try {
        console.log('[sendSmsServer] sending headers:', requestHeaderNames);
        console.log('[sendSmsServer] hasApiKey:', !!arkeselApiKey, 'senderId:', arkeselSenderId);
      } catch (logErr) {
        console.warn('[sendSmsServer] header debug failed', logErr);
      }

      const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sender: arkeselSenderId, message: payload.message.substring(0, 1600), recipients: [formatted] }),
      });

      // Collect response header names (non-sensitive)
      const responseHeaderNames: string[] = [];
      try {
        res.headers.forEach((_, k) => responseHeaderNames.push(k));
      } catch (hdrErr) {
        // older fetch impl may not support iterator; ignore
      }

      // Attempt to parse response body safely
      let data: any = null;
      let bodyText = '';
      try {
        bodyText = await res.text();
        try { data = JSON.parse(bodyText); } catch { data = bodyText; }
      } catch (parseErr: any) {
        bodyText = String(parseErr || String(parseErr?.message || parseErr));
      }

      const bodyPreview = typeof bodyText === 'string' ? bodyText.slice(0, 1000) : JSON.stringify(bodyText).slice(0, 1000);

      // Push attempt details for caller debugging (no api key values)
      attempts.push({ to: formatted, status: res.status, ok: res.ok, requestHeaderNames, responseHeaderNames, bodyPreview });

      // Debug logging for failures
      if (!res.ok || (data && data?.status && data.status !== 'success')) {
        try {
          console.warn('[sendSmsServer] Arkesel non-success response', { status: res.status, bodyPreview, responseHeaderNames });
        } catch (logErr) {
          console.warn('[sendSmsServer] Arkesel non-success response (could not stringify body)', logErr);
        }
      }

      if (res.ok && data && (data.status === 'success' || data?.success === true)) {
        successCount++;
      } else {
        // If the provider rejected header auth, try the query-string style endpoint as a fallback
        // using the API key in the query string (the provider docs include this pattern).
        // We must NOT leak the API key in logs or responses; redact it when returning diagnostics.
        try {
          const queryMsg = payload.message.substring(0, 1600);
          const queryUrl = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${encodeURIComponent(
            arkeselApiKey as string
          )}&to=${encodeURIComponent(formatted)}&from=${encodeURIComponent(arkeselSenderId || '')}&sms=${encodeURIComponent(queryMsg)}`;

          const fallbackRes = await fetch(queryUrl, { method: 'GET' });
          let fallbackText = '';
          try { fallbackText = await fallbackRes.text(); } catch (e) { fallbackText = String(e); }
          const fallbackPreview = fallbackText.slice(0, 1000);
          const sanitizedUrl = queryUrl.replace(encodeURIComponent(arkeselApiKey as string), '<REDACTED>');
          const fallbackStatus = fallbackRes.status;

          // Collect fallback attempt (do not include the real api key)
          attempts.push({ to: formatted, method: 'query', sanitizedUrl, status: fallbackStatus, ok: fallbackRes.ok, bodyPreview: fallbackPreview });

          if (fallbackRes.ok) {
            successCount++;
          } else {
            errorCount++;
            if (!firstErrorMessage) firstErrorMessage = `Arkesel ${fallbackStatus}: ${fallbackPreview.slice(0, 200)}`;
          }
        } catch (fallbackErr: any) {
          errorCount++;
          const fe = String(fallbackErr?.message || fallbackErr);
          attempts.push({ to: formatted, method: 'query', status: null, ok: false, bodyPreview: fe });
          if (!firstErrorMessage) firstErrorMessage = `Fallback error: ${fe}`;
        }
      }
    } catch (e: any) {
      errorCount++;
      const errText = e?.message || String(e);
      attempts.push({ to: r.phoneNumber, status: null, ok: false, error: errText });
      if (!firstErrorMessage) firstErrorMessage = `Network error: ${errText}`;
    }
  }

  return { successCount, errorCount, firstErrorMessage, attempts };
}
