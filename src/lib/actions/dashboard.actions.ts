
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

    try {
    // Get counts (head:true returns count). Some deployments may not have an `is_deleted` column — avoid filtering on it.
    const studentCountResult = await supabase.from('students').select('*', { count: 'exact', head: true });
    const teacherCountResult = await supabase.from('teachers').select('*', { count: 'exact', head: true });

    const student_count = (studentCountResult && (studentCountResult as any).count) ? (studentCountResult as any).count : 0;
    const teacher_count = (teacherCountResult && (teacherCountResult as any).count) ? (teacherCountResult as any).count : 0;

        // For simplicity, this calculates fees collected in the current calendar month.
        // A more complex implementation could use academic term dates from settings.
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd");
        const end = format(endOfMonth(now), "yyyy-MM-dd");

        const { data: feeData, error: feeError } = await supabase.from('fee_payments')
            .select('amount, amount_paid')
            .gte('payment_date', start)
            .lte('payment_date', end);

        if (feeError) throw feeError;

        const term_fees_collected = (feeData || []).reduce((sum: number, p: any) => {
            const amt = Number(p?.amount ?? p?.amount_paid ?? 0);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);

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
