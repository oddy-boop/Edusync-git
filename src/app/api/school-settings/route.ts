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
        
        // If the specific school doesn't exist (PGRST116), try to return any available school
        if (error.code === 'PGRST116') {
          console.log(`School with ID ${schoolId} not found, falling back to any available school`);
          
          // Try to get any school as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('schools')
            .select('*')
            .limit(1)
            .maybeSingle();
            
          if (fallbackError) {
            console.error('Error fetching fallback school:', fallbackError);
            return NextResponse.json({ error: 'No schools found in database' }, { status: 404 });
          }
          
          if (!fallbackData) {
            return NextResponse.json({ error: 'No schools found in database' }, { status: 404 });
          }
          
          return NextResponse.json(fallbackData);
        }
        
        return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
      }
      
      return NextResponse.json(data);
    }
    
    // Default: return the first available school (fallback for public pages)
    // Try to order by updated_at first, fallback to id if updated_at doesn't exist
    let query = supabase.from('schools').select('*');
    
    try {
      // Try ordering by updated_at (preferred)
      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code === '42703') {
        // Column doesn't exist, try ordering by id instead
        const fallbackResult = await supabase
          .from('schools')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();
          
        if (fallbackResult.error) {
          console.error('Error fetching default school settings:', fallbackResult.error);
          return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
        }
        
        return NextResponse.json(fallbackResult.data);
      }
      
      if (error) {
        console.error('Error fetching default school settings:', error);
        return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
      }
      
      return NextResponse.json(data);
    } catch (queryError) {
      // Fallback to simple query without ordering
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('schools')
        .select('*')
        .limit(1)
        .single();
        
      if (fallbackError) {
        console.error('Error fetching fallback school settings:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch school settings' }, { status: 500 });
      }
      
      return NextResponse.json(fallbackData);
    }
  } catch (error) {
    console.error('Error in school settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
