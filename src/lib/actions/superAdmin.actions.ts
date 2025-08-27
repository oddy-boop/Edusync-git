"use server";

import { createClient } from '@/lib/supabase/server';

type StatsRow = {
  id: number;
  name: string;
  student_count: number;
  teacher_count: number;
};

export async function getSuperAdminStats(): Promise<{ success: boolean; data?: StatsRow[]; message?: string; debug?: any }> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleRow || roleRow.role !== 'super_admin') {
      return { success: false, message: 'Forbidden' };
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

    return { success: true, data: results, debug: { userId: user.id, role: roleRow.role } };
  } catch (error: any) {
    console.error('getSuperAdminStats error:', error);
    return { success: false, message: error?.message || 'Server error' };
  }
}
