import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This route performs a one-time backfill of student names in `public.students`
// using the reference to `auth.users` user_metadata.full_name. It uses the
// service-role Supabase key so it must be protected. Provide a secret via the
// `x-backfill-secret` header that matches process.env.BACKFILL_SECRET.

export async function POST(request: Request) {
  const secret = request.headers.get('x-backfill-secret') || '';
  if (!process.env.BACKFILL_SECRET || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient(); // service-role client

  try {
    // Find candidate students where name looks like an id or is empty/null
    const { data: students, error: studentsErr } = await supabase
      .from('students')
      .select('id, auth_user_id, student_id_display, name')
      .or(`name.is.null,name.eq.student_id_display`)
      .limit(1000);

    if (studentsErr) throw studentsErr;

    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const s of (students || []) as any[]) {
      if (!s?.auth_user_id) { skipped++; continue; }

      try {
        const { data: userRow, error: userErr } = await supabase
          .from('auth.users')
          .select('user_metadata')
          .eq('id', s.auth_user_id)
          .maybeSingle();

        if (userErr) { errors.push({ studentId: s.id, error: String(userErr) }); skipped++; continue; }

        const metadata = (userRow as any)?.user_metadata || {};
        const fullName = metadata?.full_name || metadata?.fullName || metadata?.name || null;

        if (fullName && String(fullName).trim() !== '' && String(fullName).trim() !== s.student_id_display) {
          const { error: updErr } = await supabase
            .from('students')
            .update({ name: String(fullName).trim() })
            .eq('id', s.id);
          if (updErr) { errors.push({ studentId: s.id, error: String(updErr) }); }
          else updated++;
        } else {
          skipped++;
        }
      } catch (innerErr) {
        errors.push({ studentId: s.id, error: String(innerErr) });
      }
    }

    return NextResponse.json({ ok: true, updated, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
