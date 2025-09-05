import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.ADMIN_DEBUG !== 'true') {
      return new Response('Not Found', { status: 404 });
    }
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
    return NextResponse.json({ hasServiceKey, supabaseUrl });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
