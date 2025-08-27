import { NextResponse } from 'next/server';
import { validateSchoolCredentials } from '@/lib/actions/credentials.actions';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schoolId = body?.schoolId ?? null;
    const result = await validateSchoolCredentials(schoolId);
    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
