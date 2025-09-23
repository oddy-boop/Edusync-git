import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, schoolId } = body || {};

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Missing userId or schoolId' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .single();

    if (error) {
      console.error('admin-verify: error querying user_roles', { error, userId, schoolId });
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ allowed: false, role: null });
    }

    const allowed = ['admin', 'accountant'].includes(data.role);
    return NextResponse.json({ allowed, role: data.role });
  } catch (err: any) {
    console.error('admin-verify route failure', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
