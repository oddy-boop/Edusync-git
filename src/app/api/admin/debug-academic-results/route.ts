import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const secret = request.headers.get('x-backfill-secret') || '';
  if (!process.env.BACKFILL_SECRET || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  try {
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacher_id');
    const studentId = url.searchParams.get('student_id');
    const schoolId = url.searchParams.get('school_id');
    const limit = parseInt(url.searchParams.get('limit') || '200', 10);

    let q = supabase.from('academic_results').select('*').order('created_at', { ascending: false }).limit(limit);
    if (teacherId) q = q.eq('teacher_id', teacherId as any);
    if (studentId) q = q.eq('student_id_display', studentId as any);
    if (schoolId) q = q.eq('school_id', schoolId as any);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, count: (data || []).length, rows: data });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
