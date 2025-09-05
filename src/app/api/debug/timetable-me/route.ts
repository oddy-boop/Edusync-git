import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

// DEV-only endpoint: run the timetable_entries select as the current authenticated
// user (propagates cookies). Useful to confirm whether RLS permits the browser
// session to read the teacher's rows.
export async function GET(request: Request) {
  try {
    const supabase = createAuthClient();
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    const user = userResp?.user ?? null;
    if (userErr) {
      console.error('Debug timetable-me: getUser error', userErr);
      return NextResponse.json({ error: 'Failed to get user', details: userErr }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: 'Not authenticated in this request (no session cookie)' }, { status: 401 });

    // Find teacher row for this auth user
    const { data: teacherRow, error: teacherErr } = await supabase
      .from('teachers')
      .select('id, auth_user_id, school_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (teacherErr) {
      console.error('Debug timetable-me: teacher lookup failed', teacherErr);
      return NextResponse.json({ error: 'Failed to lookup teacher row', details: teacherErr }, { status: 500 });
    }
    if (!teacherRow) return NextResponse.json({ error: 'No teacher profile found for this authenticated user' }, { status: 404 });

    // Now attempt to SELECT timetable rows scoped to this teacher
    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('teacher_id', teacherRow.id)
      .limit(500);

    if (error) {
      console.error('Debug timetable-me: select error', error);
      return NextResponse.json({ error: 'Select failed under authenticated session', details: error }, { status: 500 });
    }

    return NextResponse.json({ teacherId: teacherRow.id, count: Array.isArray(data) ? data.length : 0, rows: data });
  } catch (err: any) {
    console.error('Debug timetable-me: unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
