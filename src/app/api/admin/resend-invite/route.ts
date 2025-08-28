import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient, createAuthClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toLowerCase();
    if (!email) return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });

  // Use a session-aware client to detect the caller's session
  const authSupabase = createAuthClient();
  const supabase = createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized. Please sign in as an admin.' }, { status: 401 });

  const { data: adminRole, error: roleError } = await supabase.from('user_roles').select('role, school_id').eq('user_id', user.id).single();
    if (roleError) {
      console.warn('Could not verify admin role for resend-invite:', roleError);
      return NextResponse.json({ success: false, message: 'Unable to verify permissions.' }, { status: 403 });
    }
    if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: 'Forbidden: insufficient permissions.' }, { status: 403 });
    }

    const hdrs = headers();
    const siteUrl = (await hdrs).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/auth/update-password` });
    if (inviteError) {
      console.error('resend-invite error:', inviteError);
      return NextResponse.json({ success: false, message: inviteError.message || 'Error sending invite.' }, { status: 500 });
    }

    console.info('resend-invite success:', { email, userId: inviteData?.user?.id });

    return NextResponse.json({ success: true, message: `Invitation sent to ${email}.`, inviteMeta: { userId: inviteData?.user?.id ?? null, email: inviteData?.user?.email ?? email } });
  } catch (err: any) {
    console.error('resend-invite exception:', err);
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
