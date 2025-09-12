import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Fetch all active schools
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, domain, logo_url')
      .order('name');

    if (error) {
      console.error('Error fetching schools:', error);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // Transform the data - in this system, each school IS a branch
    const transformedSchools = schools?.map(school => ({
      id: school.id.toString(),
      name: school.name,
      domain: school.domain,
      logo_url: school.logo_url
    })) || [];

    return NextResponse.json(transformedSchools);
  } catch (error) {
    console.error('Error in schools API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
