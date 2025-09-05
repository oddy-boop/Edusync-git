// Utility to normalize timetable rows from the DB into the frontend-friendly
// shape: one entry per day with a `periods` array. Handles both shapes:
// - flat rows (subject, class_id, period)
// - packed rows with `periods` jsonb
export function normalizeTimetableRows(rows: any[]): any[] {
  if (!rows || rows.length === 0) return [];

  // If rows already contain a `periods` array, assume they are the expected shape.
  const first = rows[0];
  if (first && Array.isArray(first.periods)) {
    return rows;
  }

  // Otherwise treat rows as flat rows: group by day_of_week, then by period label.
  const byDay = new Map<string, Map<string, any>>();

  for (const r of rows) {
    const day = r.day_of_week || 'Unknown';
    const periodLabel = r.period || '';
    const teacherId = r.teacher_id || null;

    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;

    if (!dayMap.has(periodLabel)) {
      // Derive start/end times if the period label looks like "HH:MM-HH:MM"
      let startTime = '';
      let endTime = '';
      if (typeof periodLabel === 'string' && periodLabel.includes('-')) {
        const parts = periodLabel.split('-');
        startTime = parts[0] || '';
        endTime = parts[1] || '';
      }
      dayMap.set(periodLabel, { startTime, endTime, subjects: [], classNames: [], _teacherId: teacherId });
    }

    const slot = dayMap.get(periodLabel)!;
    if (r.subject) {
      if (!slot.subjects.includes(r.subject)) slot.subjects.push(r.subject);
    }
    const className = r.class_id || r.className || r.class || null;
    if (className) {
      if (!slot.classNames.includes(className)) slot.classNames.push(className);
    }
  }

  // Build normalized entries
  const entries: any[] = [];
  for (const [day, dayMap] of byDay.entries()) {
    const periods = Array.from(dayMap.values()).map((p: any) => ({ startTime: p.startTime, endTime: p.endTime, subjects: p.subjects, classNames: p.classNames }));
    // Try to recover a teacher_id from one of the period placeholders
    const teacherId = Array.from(dayMap.values()).find((v: any) => v._teacherId)?.['_teacherId'] || null;
    entries.push({ id: `${teacherId || 'unknown'}-${day}`, teacher_id: teacherId, day_of_week: day, periods, created_at: null, updated_at: null });
  }

  return entries;
}
