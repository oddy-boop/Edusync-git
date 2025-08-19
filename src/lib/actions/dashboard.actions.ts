
'use server';

import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth, endOfMonth } from 'date-fns';

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getDashboardStatsAction(): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    const schoolId = roleData.school_id;

    try {
        const { count: student_count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_deleted', false);
        const { count: teacher_count } = await supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_deleted', false);

        // For simplicity, this calculates fees collected in the current calendar month.
        // A more complex implementation could use academic term dates from settings.
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd");
        const end = format(endOfMonth(now), "yyyy-MM-dd");

        const { data: feeData, error: feeError } = await supabase.from('fee_payments')
            .select('amount_paid')
            .eq('school_id', schoolId)
            .gte('payment_date', start)
            .lte('payment_date', end);

        if(feeError) throw feeError;

        const term_fees_collected = (feeData || []).reduce((sum, p) => sum + p.amount_paid, 0);

        const stats = {
            student_count: student_count ?? 0,
            teacher_count: teacher_count ?? 0,
            term_fees_collected: term_fees_collected,
        };

        return { success: true, message: "Dashboard stats fetched.", data: stats };

    } catch (e: any) {
        console.error("Error fetching dashboard stats:", e.message);
        return { success: false, message: e.message };
    }
}
