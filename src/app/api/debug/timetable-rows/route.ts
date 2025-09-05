import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DEV-only endpoint: returns timetable_entries rows using the service-role key.
// Remove this file after debugging.
export async function GET() {
  try {
    const supabase = createClient(); // service-role client
    const { data, error } = await supabase
      .from('timetable_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Debug timetable-rows: supabase error', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ count: Array.isArray(data) ? data.length : 0, rows: data });
  } catch (err: any) {
    console.error('Debug timetable-rows: unexpected', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
