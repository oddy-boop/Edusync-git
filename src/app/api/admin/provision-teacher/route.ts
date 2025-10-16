import { NextResponse } from 'next/server';
import { createClient, createAuthClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authUserId = String(body?.auth_user_id || '').trim();
    const fullName = body?.name ?? null;
    const email = body?.email ? String(body.email).toLowerCase() : null;
    const requestedSchoolId = body?.school_id ?? null;

    if (!authUserId) {
      return NextResponse.json({ success: false, message: 'auth_user_id is required' }, { status: 400 });
    }

    // session-aware client to identify caller
    const authSupabase = createAuthClient();
    const supabase = createClient();

    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) {
      console.warn('provision-teacher role lookup failed', roleError);
      return NextResponse.json({ success: false, message: 'Unable to verify caller role' }, { status: 403 });
    }

    if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // check if teacher already exists
    const { data: existingTeacher, error: existingError } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (existingError) {
      console.error('provision-teacher existing lookup error', existingError);
      return NextResponse.json({ success: false, message: 'Database error checking existing teacher' }, { status: 500 });
    }

    if (existingTeacher) {
      return NextResponse.json({ success: false, message: 'Teacher profile already exists' }, { status: 409 });
    }

    // choose school - admin provisions for their school unless super_admin specified a school_id
    const school_id = adminRole.role === 'super_admin' ? (requestedSchoolId ?? null) : adminRole.school_id;

    const insertPayload: any = {
      auth_user_id: authUserId,
      full_name: fullName ?? null,
      email: email ?? null,
      school_id: school_id ?? null,
    };

  const { error: insertError } = await supabase.rpc('get_my_teacher_profile');
    if (insertError) {
      console.error('provision-teacher insert error', insertError);
      return NextResponse.json({ success: false, message: insertError.message || 'Failed to create teacher profile' }, { status: 500 });
    }

    // ensure user_roles contains teacher role for this user
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleInsertError } = await supabase.from('user_roles').insert({
        user_id: authUserId,
        role: 'teacher',
        school_id: school_id ?? null,
      });
      if (roleInsertError) console.warn('provision-teacher role insert warning', roleInsertError);
    }

    return NextResponse.json({ success: true, message: 'Teacher profile created' });
  } catch (err: any) {
    console.error('provision-teacher exception', err);
    return NextResponse.json({ success: false, message: err?.message || String(err) }, { status: 500 });
  }
}
