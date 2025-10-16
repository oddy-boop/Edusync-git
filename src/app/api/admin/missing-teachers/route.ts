import { NextResponse } from 'next/server';
import { createClient, createAuthClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
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
      console.warn('missing-teachers role lookup failed', roleError);
      return NextResponse.json({ success: false, message: 'Unable to verify caller role' }, { status: 403 });
    }

    if (!adminRole || (adminRole.role !== 'admin' && adminRole.role !== 'super_admin')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Fetch auth users and left join teachers via SQL to find missing rows. Use service role client.
    const schoolFilter = adminRole.role === 'super_admin' ? '' : `WHERE u.raw_user_meta_data->>'school_id' = '${adminRole.school_id}' OR t.school_id = '${adminRole.school_id}'`;

    const sql = `
      SELECT u.id, u.email, u.raw_user_meta_data, t.id as teacher_id, t.school_id as teacher_school
      FROM auth.users u
      LEFT JOIN teachers t ON t.auth_user_id = u.id
      ${schoolFilter}
      ORDER BY u.email
      LIMIT 500
    `;

    const { data, error } = await supabase.rpc('sql', { query: sql } as any).match(() => ({ data: null, error: { message: 'rpc-sql-not-available' } }));

    // Fallback: if rpc('sql') is not configured, fall back to two-step query using JS
    if (!data) {
      // get users
      const { data: users, error: usersError } = await supabase.from('auth.users').select('id, email, raw_user_meta_data').limit(500);
      if (usersError) {
        console.error('missing-teachers users lookup failed', usersError);
        return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
      }
  const { data: teachers, error: teachersError } = await supabase.rpc('get_my_teacher_profile');
      if (teachersError) {
        console.error('missing-teachers teachers lookup failed', teachersError);
        return NextResponse.json({ success: false, message: 'Failed to fetch teachers' }, { status: 500 });
      }

      const teacherMap = new Map(teachers.map((t: any) => [t.auth_user_id, t]));
      const missing = (users as any[])
        .filter((u: any) => !teacherMap.has(u.id))
        .slice(0, 200)
        .map((u: any) => ({ id: u.id, email: u.email, meta: u.raw_user_meta_data }));

      return NextResponse.json({ success: true, missing });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('missing-teachers exception', err);
    return NextResponse.json({ success: false, message: err?.message || String(err) }, { status: 500 });
  }
}
