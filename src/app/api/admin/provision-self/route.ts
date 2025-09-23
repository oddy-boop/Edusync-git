import { NextResponse } from 'next/server';
import { createAuthClient, createClient as createSvcClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const auth = createAuthClient();

    // Prefer getSession() which often contains the decoded user payload even when
    // getUser() returns an RPC-style error like "Session from session_id claim in JWT does not exist".
    const { data: { session }, error: sessionErr } = await auth.auth.getSession();
    let user = session?.user ?? null;

    // If getSession didn't return a user, fall back to getUser().
    if (!user) {
      const { data: { user: u }, error: userErr } = await auth.auth.getUser();
      if (userErr) {
        // Provide a helpful error explaining likely causes.
        return NextResponse.json({ success: false, message: userErr.message || 'Unable to resolve user' }, { status: 401 });
      }
      user = u ?? null;
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const schoolId = (user.user_metadata as any)?.school_id ?? null;
    if (!schoolId) {
      return NextResponse.json({ success: false, message: 'No school_id found in user metadata. Cannot provision role automatically.' }, { status: 400 });
    }

    const svc = createSvcClient();

    // Check if a role already exists
    const { data: existing } = await svc.from('user_roles').select('id').eq('user_id', user.id).maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, message: 'Role already exists' });
    }

    const { error: insertErr } = await svc.from('user_roles').insert({ user_id: user.id, role: 'admin', school_id: schoolId });
    if (insertErr) {
      console.error('provision-self insert error', insertErr);
      return NextResponse.json({ success: false, message: insertErr.message || 'Failed to create role' }, { status: 500 });
    }

    // Also ensure the admins table contains a row for this user
    try {
      const { data: existingAdmin } = await svc.from('admins').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (!existingAdmin) {
        const adminInsertPayload: any = {
          school_id: schoolId,
          auth_user_id: user.id,
          name: (user.user_metadata as any)?.full_name ?? user.email ?? 'Admin',
          email: user.email ?? null,
          phone: null
        };
        const { error: adminInsertErr } = await svc.from('admins').insert(adminInsertPayload);
        if (adminInsertErr) console.warn('provision-self: failed to insert admins row', adminInsertErr);
      }
    } catch (e) {
      console.warn('provision-self: admin table insert check failed', e);
    }

    return NextResponse.json({ success: true, message: 'Provisioned admin role for current user' });
  } catch (err: any) {
    console.error('provision-self exception', err);
    return NextResponse.json({ success: false, message: err?.message || 'Unknown error' }, { status: 500 });
  }
}
