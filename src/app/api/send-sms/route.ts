import { NextResponse } from 'next/server';
import { sendSmsServer } from '@/lib/sms.server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Temporary debug: log minimal request metadata (do not log secrets)
    try {
      const recipientCount = Array.isArray(body?.recipients) ? body.recipients.length : 0;
      console.log(`[send-sms route] incoming request: schoolId=${body?.schoolId ?? 'null'}, recipients=${recipientCount}`);
    } catch (logErr) {
      console.log('[send-sms route] incoming request: could not read metadata', logErr);
    }

  const result = await sendSmsServer(body);
    // Log result summary for debugging
    try {
      console.log('[send-sms route] sendSmsServer result:', { successCount: result?.successCount, errorCount: result?.errorCount, firstErrorMessage: result?.firstErrorMessage });
    } catch (logErr) {
      console.log('[send-sms route] result logging failed', logErr);
    }

    // Include per-recipient attempts for debugging in the response body (no API keys returned)
    return NextResponse.json({ ok: true, result, attempts: result?.attempts ?? [] });
  } catch (e: any) {
    console.error('send-sms route error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
