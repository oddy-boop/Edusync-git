import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAuthClient();
    
    // Get the current user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    
    if (userErr || !user) {
      return NextResponse.json({ 
        error: 'No authenticated user', 
        userError: userErr?.message 
      }, { status: 401 });
    }

    // Get user roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id, schools(id, name)')
      .eq('user_id', user.id);

    // Get schools the user might be associated with
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name');

    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      roleData,
      roleError: roleError?.message,
      allSchools: schools,
      schoolsError: schoolsError?.message
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
