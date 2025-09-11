import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        userError: userError?.message || null,
        user: null,
        role: null
      });
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      role: roleData?.role || null,
      roleData: roleData,
      roleError: roleError?.message || null,
      hasRole: !!roleData,
      isSuperAdmin: roleData?.role === 'super_admin'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      authenticated: false
    }, { status: 500 });
  }
}
