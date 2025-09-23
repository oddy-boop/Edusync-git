import { NextResponse } from 'next/server';
import { getSchoolCredentials } from '@/lib/getSchoolCredentials';

async function probe(url: string, headers: Record<string, string>) {
  try {
    const resp = await fetch(url, { method: 'GET', headers });
    const text = await resp.text();
    return { status: resp.status, ok: resp.ok, bodyPreview: text?.slice(0, 400) };
  } catch (e: any) {
    return { status: 0, ok: false, bodyPreview: e?.message || String(e) };
  }
}

export async function POST(req: Request) {
  try {
    const { schoolId } = await req.json();
    const creds = await getSchoolCredentials(schoolId ?? null);
    const ark = (creds as any)?.arkesel ?? (creds as any)?.twilio ?? {};

    const apiKey = ark?.apiKey || ark?.authKey || process.env.ARKESEL_API_KEY || null;
    if (!apiKey) return NextResponse.json({ ok: false, message: 'No Arkesel API key found for school' });

    const url = 'https://sms.arkesel.com/api/account';

    const tests: Record<string, any> = {};

    // Try Bearer Authorization
    tests['authorization'] = await probe(url, { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
    // Try apiKey header
    tests['apiKey'] = await probe(url, { apiKey: apiKey, 'Content-Type': 'application/json' });
    // Try x-api-key header
    tests['x-api-key'] = await probe(url, { 'x-api-key': apiKey, 'Content-Type': 'application/json' });

    return NextResponse.json({ ok: true, tests });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
