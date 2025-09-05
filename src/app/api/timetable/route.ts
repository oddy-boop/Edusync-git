import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacher_id: clientTeacherId, day_of_week, periods, entry_id } = body || {};

    if (!day_of_week || !periods) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = createAuthClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user ?? null;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Find teacher row for this authenticated user
    const { data: teacherRow, error: teacherErr } = await supabase
      .from('teachers')
      .select('id, auth_user_id, school_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (teacherErr) return NextResponse.json({ error: 'Failed to fetch teacher profile', details: String(teacherErr) }, { status: 500 });
    if (!teacherRow) return NextResponse.json({ error: 'Teacher profile not found for authenticated user' }, { status: 403 });

    const teacherId = teacherRow.id;

    // Build flat rows to insert: one row per (period, className, subject)
    if (!Array.isArray(periods) || periods.length === 0) {
      return NextResponse.json({ error: 'Invalid periods array' }, { status: 400 });
    }

    const rowsToInsert: any[] = [];
    for (const p of periods) {
      const { startTime, endTime, subjects, classNames } = p as any;
      const periodLabel = `${startTime || ''}-${endTime || ''}`;
      if (!Array.isArray(classNames) || classNames.length === 0) {
        return NextResponse.json({ error: 'Each period must include at least one className' }, { status: 400 });
      }
      if (!Array.isArray(subjects) || subjects.length === 0) {
        return NextResponse.json({ error: 'Each period must include at least one subject' }, { status: 400 });
      }
      for (const className of classNames) {
        for (const subject of subjects) {
          rowsToInsert.push({
            teacher_id: teacherId,
            day_of_week,
            class_id: className,
            subject,
            period: periodLabel,
            school_id: teacherRow.school_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Replace any existing rows for this teacher and day with the new schedule.
    // IMPORTANT: detect deployed table columns before deleting existing rows so we
    // don't remove data and then fail to insert because of an unexpected schema.
    try {
      const detectColumn = async (col: string) => {
        try {
          const { error } = await supabase.from('timetable_entries').select(col).limit(1);
          if (error) {
            const m = String(error.message || JSON.stringify(error)).toLowerCase();
            if (m.includes(`column \"${col}\"`) || m.includes(`column "${col}"`) || m.includes('column not found')) {
              return false;
            }
          }
          return true;
        } catch (e) {
          return false;
        }
      };

      const hasSubject = await detectColumn('subject');
      const hasClassId = await detectColumn('class_id');
      const hasPeriodsColumn = await detectColumn('periods');

      console.log('Timetable API: column detection =>', { hasSubject, hasClassId, hasPeriodsColumn });

      // Choose an insertion strategy based on detected columns. Do NOT delete existing
      // rows until we're about to insert using a chosen strategy.
      const tryFlatInsert = async () => {
        return await supabase.from('timetable_entries').insert(rowsToInsert);
      };

      const tryPeriodsInsert = async () => {
        const periodsRow: any = {
          teacher_id: teacherId,
          day_of_week,
          periods,
          school_id: teacherRow.school_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return await supabase.from('timetable_entries').insert([periodsRow]);
      };

      // Strategy decision tree
      let insertErr: any = null;
      if (hasSubject || hasClassId) {
        // Table expects flat rows with subject/class_id
        const flat = await tryFlatInsert();
        if (flat.error) {
          // If table also has a periods column, we can attempt periods fallback.
          if (hasPeriodsColumn) {
            console.warn('Timetable API: flat insert failed; attempting periods fallback', flat.error);
            const fallback = await tryPeriodsInsert();
            if (fallback.error) {
              console.error('Timetable API: periods fallback failed', fallback.error);
              return NextResponse.json({ error: 'Insert failed (both strategies)', details: fallback.error }, { status: 500 });
            }
          } else {
            console.error('Timetable API: flat insert failed', flat.error);
            return NextResponse.json({ error: 'Insert failed', details: flat.error }, { status: 500 });
          }
        }
      } else if (hasPeriodsColumn) {
        // Table likely stores periods as JSON
        const per = await tryPeriodsInsert();
        if (per.error) {
          console.error('Timetable API: periods insert failed', per.error);
          return NextResponse.json({ error: 'Insert failed (periods)', details: per.error }, { status: 500 });
        }
      } else {
        // Unknown schema: try flat then periods
        const flat = await tryFlatInsert();
        if (flat.error) {
          console.warn('Timetable API: flat insert failed on unknown schema; attempting periods fallback', flat.error);
          const fallback = await tryPeriodsInsert();
          if (fallback.error) {
            console.error('Timetable API: periods fallback failed on unknown schema', fallback.error);
            return NextResponse.json({ error: 'Insert failed (both strategies)', details: fallback.error }, { status: 500 });
          }
        }
      }

      // If we reach here the chosen insert succeeded; remove existing rows (it's safe
      // because we either inserted in a different shape or the insert replaced data).
      const { error: delErr } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('day_of_week', day_of_week);
      if (delErr) {
        console.error('Timetable API: delete failed', delErr);
        return NextResponse.json({ error: 'Failed to remove existing entries', details: delErr }, { status: 500 });
      }

      // Re-insert to ensure the DB only contains the new schedule for the day.
      // For the case where we already inserted a periods-row above, we will re-insert
      // the same shape now as the authoritative write.
      if (hasSubject || hasClassId) {
        const { error: finalInsertErr } = await supabase.from('timetable_entries').insert(rowsToInsert);
        if (finalInsertErr) {
          console.error('Timetable API: final flat insert failed', finalInsertErr);
          return NextResponse.json({ error: 'Insert failed', details: finalInsertErr }, { status: 500 });
        }
      } else {
        const periodsRow: any = {
          teacher_id: teacherId,
          day_of_week,
          periods,
          school_id: teacherRow.school_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: finalInsertErr } = await supabase.from('timetable_entries').insert([periodsRow]);
        if (finalInsertErr) {
          console.error('Timetable API: final periods insert failed', finalInsertErr);
          return NextResponse.json({ error: 'Insert failed (periods)', details: finalInsertErr }, { status: 500 });
        }
      }
    } catch (e: any) {
      console.error('Timetable API: unexpected', e);
      return NextResponse.json({ error: 'Unexpected', details: String(e) }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 });
  }
}
