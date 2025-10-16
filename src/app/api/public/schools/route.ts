import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('schools')
      .select('id, name, domain, logo_url')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching schools (service role):', error);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Unexpected error in /api/public/schools:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
