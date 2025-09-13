import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authSupabase = createAuthClient();
    
    // Verify user is authenticated and has admin role
    const { data: { user }, error: userError } = await authSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or super_admin role
    const { data: roleData } = await authSupabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const schoolId = roleData.role === 'super_admin' 
      ? (searchParams.get('schoolId') ? parseInt(searchParams.get('schoolId')!) : undefined)
      : roleData.school_id; // Regular admins can only see their school's logs

    const options = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      action_filter: searchParams.get('action_filter') || undefined,
      table_filter: searchParams.get('table_filter') || undefined,
      user_filter: searchParams.get('user_filter') || undefined,
    };

    const result = await getAuditLogs(schoolId, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to fetch audit logs' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
    });

  } catch (error: any) {
    console.error('Audit logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
