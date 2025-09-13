"use server";

import { createAuthClient, createClient } from '@/lib/supabase/server';

type StatsRow = {
  id: number;
  name: string;
  student_count: number;
  teacher_count: number;
};

export async function getSuperAdminStats(): Promise<{ success: boolean; data?: StatsRow[]; message?: string; debug?: any }> {
  const supabase = createAuthClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Enhanced debugging
    console.log('🔍 SuperAdmin Auth Debug:', {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
    
    if (!user) {
      console.log('❌ No user found in getSuperAdminStats');
      return { 
        success: false, 
        message: 'Unauthorized',
        debug: { userError: userError?.message, hasUser: false }
      };
    }

    // Try to get user role - but be more permissive during debugging
    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no rows

    console.log('🔍 SuperAdmin Role Debug:', {
      roleRow,
      roleError: roleError?.message,
      userRole: roleRow?.role
    });

    // For debugging purposes, let's be more permissive
    // TODO: Remove this after fixing RLS policies
    if (roleError) {
      console.warn('⚠️ Role query failed, but proceeding for debugging:', roleError.message);
      // Instead of failing, let's try to use service role client to bypass RLS
      const serviceSupabase = createClient();
      const { data: serviceRoleRow, error: serviceRoleError } = await serviceSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('🔧 Service role fallback:', { serviceRoleRow, serviceRoleError: serviceRoleError?.message });
      
      if (serviceRoleError || !serviceRoleRow || serviceRoleRow.role !== 'super_admin') {
        return { 
          success: false, 
          message: 'Forbidden',
          debug: { 
            roleError: roleError?.message,
            serviceRoleError: serviceRoleError?.message,
            hasRoleRow: !!serviceRoleRow, 
            actualRole: serviceRoleRow?.role,
            expectedRole: 'super_admin'
          }
        };
      }
    } else if (!roleRow || roleRow.role !== 'super_admin') {
      return { 
        success: false, 
        message: 'Forbidden',
        debug: { 
          hasRoleRow: !!roleRow, 
          actualRole: roleRow?.role,
          expectedRole: 'super_admin'
        }
      };
    }

    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (schoolsError) throw schoolsError;

    const promises = schools.map(async (s: any) => {
      const { count: student_count } = await supabase
        .from('students')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', s.id);

      const { count: teacher_count } = await supabase
        .from('teachers')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', s.id);

      return {
        id: s.id,
        name: s.name,
        student_count: student_count ?? 0,
        teacher_count: teacher_count ?? 0,
      } as StatsRow;
    });

    const results = await Promise.all(promises);

    return { success: true, data: results, debug: { userId: user.id, role: roleRow?.role ?? null } };
  } catch (error: any) {
    console.error('getSuperAdminStats error:', error);
    return { success: false, message: error?.message || 'Server error' };
  }
}
