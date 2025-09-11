'use server';

import { createAuthClient } from "@/lib/supabase/server";

export interface PlatformPricing {
  id: string;
  grade_level: string;
  pricing_type: 'per_term' | 'per_year';
  platform_fee: number;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  student_id: string;
  school_id: string;
  platform_payment_reference: string | null;
  school_payment_reference: string | null;
  platform_amount: number;
  school_amount: number;
  total_amount: number;
  platform_status: 'pending' | 'initialized' | 'success' | 'failed' | 'refunded';
  school_status: 'pending' | 'initialized' | 'success' | 'failed' | 'refunded';
  overall_status: 'pending' | 'initialized' | 'completed' | 'failed' | 'partial_refund';
  payment_method: string | null;
  term: string;
  academic_year: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

type ActionResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};

/**
 * Get all platform pricing configurations
 */
export async function getPlatformPricing(academicYear?: string): Promise<ActionResponse<PlatformPricing[]>> {
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

    let query = supabase
      .from('platform_pricing')
      .select('*')
      .eq('is_active', true)
      .order('grade_level', { ascending: true });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching platform pricing:', error);
      return { success: false, message: 'Failed to fetch platform pricing', error: error.message };
    }

    return { success: true, message: 'Platform pricing fetched successfully', data: data || [] };
  } catch (error: any) {
    console.error('Error in getPlatformPricing:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}

/**
 * Set or update platform pricing for a grade level
 */
export async function setPlatformPricing(pricingData: {
  grade_level: string;
  pricing_type: 'per_term' | 'per_year';
  platform_fee: number;
  academic_year: string;
}): Promise<ActionResponse<PlatformPricing>> {
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

    // Validate input
    if (!pricingData.grade_level || !pricingData.academic_year) {
      return { success: false, message: 'Grade level and academic year are required' };
    }

    if (pricingData.platform_fee < 0) {
      return { success: false, message: 'Platform fee cannot be negative' };
    }

    // Upsert platform pricing
    const { data, error } = await supabase
      .from('platform_pricing')
      .upsert({
        ...pricingData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'grade_level,academic_year,pricing_type'
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting platform pricing:', error);
      return { success: false, message: 'Failed to update platform pricing', error: error.message };
    }

    // The database trigger will automatically update all affected school_fees records

    return { 
      success: true, 
      message: `Platform pricing updated for ${pricingData.grade_level}`, 
      data 
    };
  } catch (error: any) {
    console.error('Error in setPlatformPricing:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}

/**
 * Get platform pricing for a specific grade level and academic year
 */
export async function getPlatformPricingByGrade(
  gradeLevel: string, 
  academicYear: string, 
  pricingType: 'per_term' | 'per_year' = 'per_term'
): Promise<ActionResponse<PlatformPricing | null>> {
  try {
    const supabase = createAuthClient();

    const { data, error } = await supabase
      .from('platform_pricing')
      .select('*')
      .eq('grade_level', gradeLevel)
      .eq('academic_year', academicYear)
      .eq('pricing_type', pricingType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching platform pricing by grade:', error);
      return { success: false, message: 'Failed to fetch platform pricing', error: error.message };
    }

    return { 
      success: true, 
      message: 'Platform pricing fetched successfully', 
      data 
    };
  } catch (error: any) {
    console.error('Error in getPlatformPricingByGrade:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}

/**
 * Deactivate platform pricing (soft delete)
 */
export async function deactivatePlatformPricing(pricingId: string): Promise<ActionResponse> {
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

    const { error } = await supabase
      .from('platform_pricing')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', pricingId);

    if (error) {
      console.error('Error deactivating platform pricing:', error);
      return { success: false, message: 'Failed to deactivate platform pricing', error: error.message };
    }

    return { success: true, message: 'Platform pricing deactivated successfully' };
  } catch (error: any) {
    console.error('Error in deactivatePlatformPricing:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}

/**
 * Get revenue statistics for super admin dashboard
 */
export async function getPlatformRevenueStats(
  startDate?: string, 
  endDate?: string
): Promise<ActionResponse<{
  totalRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  activeSchools: number;
  studentCount: number;
  revenueByMonth: Array<{ month: string; revenue: number; transactions: number }>;
}>> {
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

    // Get total platform revenue from completed transactions
    const { data: totalRevenueData } = await supabase
      .from('payment_transactions')
      .select('platform_amount')
      .eq('overall_status', 'completed');

    const totalRevenue = totalRevenueData?.reduce((sum, transaction) => 
      sum + (transaction.platform_amount || 0), 0) || 0;

    // Get current month revenue
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: monthlyRevenueData } = await supabase
      .from('payment_transactions')
      .select('platform_amount')
      .eq('overall_status', 'completed')
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${currentMonth}-32`);

    const monthlyRevenue = monthlyRevenueData?.reduce((sum, transaction) => 
      sum + (transaction.platform_amount || 0), 0) || 0;

    // Get total completed transactions
    const { count: totalTransactions } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('overall_status', 'completed');

    // Get active schools count
    const { count: activeSchools } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    // Get total student count
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    // Get revenue by month for the last 12 months
    const { data: monthlyData } = await supabase
      .from('payment_transactions')
      .select(`
        platform_amount,
        created_at
      `)
      .eq('overall_status', 'completed')
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    // Group by month
    const revenueByMonth = monthlyData?.reduce((acc: any[], transaction) => {
      const month = transaction.created_at.slice(0, 7); // YYYY-MM
      const existing = acc.find(item => item.month === month);
      
      if (existing) {
        existing.revenue += transaction.platform_amount || 0;
        existing.transactions += 1;
      } else {
        acc.push({
          month,
          revenue: transaction.platform_amount || 0,
          transactions: 1
        });
      }
      
      return acc;
    }, []) || [];

    return {
      success: true,
      message: 'Revenue statistics fetched successfully',
      data: {
        totalRevenue,
        monthlyRevenue,
        totalTransactions: totalTransactions || 0,
        activeSchools: activeSchools || 0,
        studentCount: studentCount || 0,
        revenueByMonth
      }
    };
  } catch (error: any) {
    console.error('Error in getPlatformRevenueStats:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}

/**
 * Get payment transactions with pagination
 */
export async function getPaymentTransactions(
  page: number = 1,
  limit: number = 50,
  schoolId?: string,
  status?: string
): Promise<ActionResponse<{
  transactions: PaymentTransaction[];
  totalCount: number;
  totalPages: number;
}>> {
  try {
    const supabase = createAuthClient();
    
    // Verify user access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Authentication required' };
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole) {
      return { success: false, message: 'User role not found' };
    }

    let query = supabase
      .from('payment_transactions')
      .select(`
        *,
        students!inner(first_name, last_name, student_id),
        schools!inner(name)
      `, { count: 'exact' });

    // Apply access control
    if (userRole.role === 'super_admin') {
      // Super admin can see all transactions
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
    } else {
      // Regular users can only see their school's transactions
      query = query.eq('school_id', userRole.school_id);
    }

    if (status) {
      query = query.eq('overall_status', status);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching payment transactions:', error);
      return { success: false, message: 'Failed to fetch payment transactions', error: error.message };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      success: true,
      message: 'Payment transactions fetched successfully',
      data: {
        transactions: data || [],
        totalCount: count || 0,
        totalPages
      }
    };
  } catch (error: any) {
    console.error('Error in getPaymentTransactions:', error);
    return { success: false, message: 'An unexpected error occurred', error: error.message };
  }
}
