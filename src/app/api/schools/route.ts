import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthClient();
    
    // Get all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, domain, logo_url, created_at')
      .order('created_at', { ascending: true });

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // Get schools that have admins (include super_admin as administrator too)
    const { data: schoolsWithAdmins, error: adminsError } = await supabase
      .from('user_roles')
      .select('school_id')
      .in('role', ['admin', 'super_admin']);

    if (adminsError) {
      console.error('Error fetching admin roles:', adminsError);
      return NextResponse.json({ error: 'Failed to fetch admin roles' }, { status: 500 });
    }

    // Create a set of school IDs that have admins (normalize to strings)
    const schoolsWithAdminsSet = new Set(schoolsWithAdmins.map(role => String(role.school_id)));

    // Add the has_admin flag to each school (compare as strings)
    const schoolsWithAdminStatus = schools?.map(school => ({
      id: school.id,
      name: school.name,
      domain: school.domain,
      logo_url: school.logo_url,
      has_admin: schoolsWithAdminsSet.has(String(school.id))
    })) || [];

    return NextResponse.json(schoolsWithAdminStatus);
  } catch (error) {
    console.error('Error in schools API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
