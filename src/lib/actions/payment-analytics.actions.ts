'use server';

import { createAuthClient } from '@/lib/supabase/server';

export interface PaymentStats {
  school_id: number;
  school_name: string;
  total_payments: number;
  monthly_revenue: number;
  outstanding_fees: number;
  payment_rate: number; // percentage of fees collected
  recent_payments: number; // payments in last 30 days
  total_students: number;
  paid_students: number;
}

export interface MonthlyRevenue {
  month: string;
  school_name: string;
  revenue: number;
  school_id: number;
}

export interface PlatformRevenue {
  total_platform_revenue: number;
  total_school_revenue: number;
  monthly_platform_revenue: number;
  monthly_school_revenue: number;
  active_schools: number;
  total_transactions: number;
}

export async function getPaymentAnalytics(): Promise<{
  success: boolean;
  data?: {
    schoolPayments: PaymentStats[];
    monthlyRevenue: MonthlyRevenue[];
    platformRevenue: PlatformRevenue;
  };
  message?: string;
}> {
  try {
    const supabase = createAuthClient();

    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Authentication required' };
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'super_admin') {
      return { success: false, message: 'Super admin access required' };
    }

    // Get current date for monthly calculations
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get schools basic info
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name');

    if (schoolsError) throw schoolsError;

    // Get student counts per school
    const studentCountsQuery = await supabase
      .from('students')
      .select('school_id');
    
    const studentCounts: Record<number, number> = {};
    if (studentCountsQuery.data) {
      studentCountsQuery.data.forEach(student => {
        studentCounts[student.school_id] = (studentCounts[student.school_id] || 0) + 1;
      });
    }

    // Get fee payments
    const { data: feePayments } = await supabase
      .from('fee_payments')
      .select('school_id, amount, created_at, student_id_display');

    // Get platform revenue from payment transactions if available
    const { data: platformTransactions } = await supabase
      .from('payment_transactions')
      .select('platform_amount, school_amount, total_amount, created_at, school_id')
      .eq('overall_status', 'completed');

    // Calculate school payment stats
    const schoolPayments: PaymentStats[] = (schools || []).map(school => {
      const payments = (feePayments || []).filter(p => p.school_id === school.id);
      const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const monthlyPayments = payments
        .filter(p => new Date(p.created_at) >= firstDayOfMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const recentPayments = payments
        .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
        .length;
      
      // Get unique students who have paid
      const uniquePaidStudents = new Set(payments.map(p => p.student_id_display));
      const paidStudents = uniquePaidStudents.size;
      const totalStudents = studentCounts[school.id] || 0;
      const paymentRate = totalStudents > 0 ? (paidStudents / totalStudents) * 100 : 0;

      return {
        school_id: school.id,
        school_name: school.name,
        total_payments: totalPayments,
        monthly_revenue: monthlyPayments,
        outstanding_fees: 0, // Would need fee structure to calculate
        payment_rate: Math.round(paymentRate * 100) / 100,
        recent_payments: recentPayments,
        total_students: totalStudents,
        paid_students: paidStudents
      };
    });

    // Calculate monthly revenue trends (last 6 months)
    const monthlyRevenue: MonthlyRevenue[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      schoolPayments.forEach(school => {
        const schoolRevenue = (feePayments || [])
          .filter(p => p.school_id === school.school_id)
          .filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate >= date && paymentDate < nextMonth;
          })
          .reduce((sum: number, p) => sum + (p.amount || 0), 0);

        if (schoolRevenue > 0) {
          monthlyRevenue.push({
            month: monthName,
            school_name: school.school_name,
            revenue: schoolRevenue,
            school_id: school.school_id
          });
        }
      });
    }

    // Calculate platform revenue
    const platformRevenue: PlatformRevenue = {
      total_platform_revenue: (platformTransactions || []).reduce((sum, t) => sum + (t.platform_amount || 0), 0),
      total_school_revenue: (platformTransactions || []).reduce((sum, t) => sum + (t.school_amount || 0), 0),
      monthly_platform_revenue: (platformTransactions || [])
        .filter(t => new Date(t.created_at) >= firstDayOfMonth)
        .reduce((sum, t) => sum + (t.platform_amount || 0), 0),
      monthly_school_revenue: (platformTransactions || [])
        .filter(t => new Date(t.created_at) >= firstDayOfMonth)
        .reduce((sum, t) => sum + (t.school_amount || 0), 0),
      active_schools: schoolPayments.filter(s => s.total_payments > 0).length,
      total_transactions: (platformTransactions || []).length
    };

    return {
      success: true,
      data: {
        schoolPayments,
        monthlyRevenue,
        platformRevenue
      }
    };

  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return { 
      success: false, 
      message: 'Failed to fetch payment analytics' 
    };
  }
}
