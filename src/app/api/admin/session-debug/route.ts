import { NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAuthClient();
    const { data: { session }, error: sessErr } = await supabase.auth.getSession();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    return NextResponse.json({ session, user, sessErr: sessErr?.message ?? null, userErr: userErr?.message ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
