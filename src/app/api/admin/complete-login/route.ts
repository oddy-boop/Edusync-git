import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, schoolId } = body || {};

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Missing userId or schoolId' }, { status: 400 });
    }

    const supabase = createClient();

    // Verify the user actually has a role for the requested school
    const { data: roleRow, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (roleErr) {
      console.error('complete-login: error querying user_roles', { roleErr, userId, schoolId });
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 500 });
    }

    if (!roleRow) {
      return NextResponse.json({ error: 'User is not assigned to the requested school' }, { status: 403 });
    }

    // Persist the selected school into the user's auth metadata so subsequent
    // server/client calls can read an authoritative school_id from user metadata.
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { school_id: Number(schoolId) },
    });

    if (updateErr) {
      console.error('complete-login: failed to update user metadata', { updateErr, userId, schoolId });
      return NextResponse.json({ error: 'Failed to persist selected school' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('complete-login route failure', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
