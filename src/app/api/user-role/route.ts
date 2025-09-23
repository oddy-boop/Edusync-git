import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body || {};
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const supabase = createServerSupabase();

    // Look up role and school_id for the given user
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error('user-role route: error querying user_roles', { roleError, userId });
      return NextResponse.json({ error: 'Failed to lookup user role' }, { status: 500 });
    }

    let schoolName = null;
    if (roleData?.school_id) {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('name')
        .eq('id', roleData.school_id)
        .maybeSingle();

      if (schoolError) {
        console.error('user-role route: error querying schools', { schoolError, schoolId: roleData.school_id });
      }
      if (schoolData?.name) schoolName = schoolData.name;
    }

    return NextResponse.json({ roleData: roleData ?? null, schoolName });
  } catch (err: any) {
    console.error('user-role route error', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
