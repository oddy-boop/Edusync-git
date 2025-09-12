
'use server';

import { createClient, createAuthClient } from "@/lib/supabase/server";
import { format, startOfMonth, endOfMonth } from 'date-fns';

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getDashboardStatsAction(): Promise<ActionResponse> {
    const supabase = createAuthClient();

    try {
        // Get current user's school information from user_roles table
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, message: "User not authenticated." };
        }

        // Get admin's or accountant's school information from user_roles table
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role, school_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (roleError) throw roleError;
        
        if (!roleData || !['admin', 'accountant', 'super_admin'].includes(roleData.role)) {
            return { success: false, message: "Admin or accountant profile not found." };
        }
        
        const schoolId = roleData.school_id;

        // Get school's current academic year
        const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('current_academic_year')
            .eq('id', schoolId)
            .maybeSingle();

        if (schoolError) throw schoolError;

        const currentAcademicYear = schoolData?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        
        // Parse academic year (e.g., "2024-2025") to get date range
        let startYear: number, endYear: number;
        
        try {
            const yearParts = currentAcademicYear.split('-');
            if (yearParts.length !== 2) {
                throw new Error('Invalid academic year format');
            }
            
            startYear = parseInt(yearParts[0], 10);
            endYear = parseInt(yearParts[1], 10);
            
            // Validate the parsed years
            if (isNaN(startYear) || isNaN(endYear) || startYear < 2000 || endYear < 2000 || endYear <= startYear) {
                throw new Error('Invalid academic year values');
            }
        } catch (error) {
            // Fallback to current year if parsing fails
            const currentYear = new Date().getFullYear();
            startYear = currentYear;
            endYear = currentYear + 1;
            console.warn(`Invalid academic year format: ${currentAcademicYear}, using fallback: ${startYear}-${endYear}`);
        }
        
        // Academic year typically runs from September to August
        const academicYearStart = `${startYear}-09-01`;
        const academicYearEnd = `${endYear}-08-31`;

        // Get counts with school filtering
        const studentCountResult = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);
            
        const teacherCountResult = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId);

        const student_count = (studentCountResult && (studentCountResult as any).count) ? (studentCountResult as any).count : 0;
        const teacher_count = (teacherCountResult && (teacherCountResult as any).count) ? (teacherCountResult as any).count : 0;

        // Get fees collected during current academic year (using created_at as payment date)
        const { data: feeData, error: feeError } = await supabase
            .from('fee_payments')
            .select('amount')
            .eq('school_id', schoolId)
            .gte('created_at', academicYearStart)
            .lte('created_at', academicYearEnd);

        if (feeError) throw feeError;

        const term_fees_collected = (feeData || []).reduce((sum: number, p: any) => {
            const amt = Number(p?.amount ?? 0);
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
