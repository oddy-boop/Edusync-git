import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const url = new URL(request.url);
    const schoolId = url.searchParams.get('schoolId');
    
    // If a specific school ID is provided, fetch that school's settings
    if (schoolId) {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', parseInt(schoolId))
        .single();
        
      if (error) {
        console.error('Error fetching school settings by ID:', error);
        return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
      }
      
      return NextResponse.json(data);
    }
    
    // Default: return the first available school (fallback for public pages)
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      console.error('Error fetching default school settings:', error);
      return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in school settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
