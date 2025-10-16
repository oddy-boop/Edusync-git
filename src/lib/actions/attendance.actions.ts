
'use server';

import { createClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getStaffAttendanceSummary(): Promise<ActionResponse> {
    console.log('🔍 getStaffAttendanceSummary called');
    const supabase = createClient();
    
    // Smart school detection: Try authenticated user's school first, then fallback to first school
    let schoolId: number;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // If user is authenticated, try to get their associated school
            const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).maybeSingle();
            if (roleData?.school_id) {
                schoolId = roleData.school_id;
            } else {
                // User has no role association, fallback to first school
                const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
                if (!schoolData) {
                    return { success: false, message: "Could not identify school. Please contact support." };
                }
                schoolId = schoolData.id;
            }
        } else {
            // No authenticated user, use first school as fallback
            const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
            if (!schoolData) {
                return { success: false, message: "Could not identify school. Please contact support." };
            }
            schoolId = schoolData.id;
        }
    } catch (authError) {
        // Authentication failed, use first school as fallback
        const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
        if (!schoolData) {
            return { success: false, message: "Could not identify school. Please contact support." };
        }
        schoolId = schoolData.id;
    }
    
    try {
        // Some deployments may not have an `is_deleted` column on teachers. Avoid filtering on it here.
    const { data: teachers, error: teachersError } = await supabase.rpc('get_my_teacher_profile');
        if (teachersError) throw teachersError;

        if (!Array.isArray(teachers) || teachers.length === 0) {
            return { success: true, message: "No teachers found", data: [] };
        }

        // map DB `name` -> UI `full_name`
        const mappedTeachers = (teachers as any[]).map(t => ({ ...t, full_name: t.name }));
        const teacherIds = mappedTeachers.map(t => t.id);
        const { data: attendanceRecords, error: attendanceError } = await supabase.from('staff_attendance').select('teacher_id, status, date').eq('school_id', schoolId).in('teacher_id', teacherIds);
        if(attendanceError) throw attendanceError;
        
        const summary = mappedTeachers.map(teacher => {
            const records = attendanceRecords.filter(r => r.teacher_id === teacher.id);
            const todayRecord = records.find(r => new Date(r.date).toDateString() === new Date().toDateString());
            
            return {
                teacher_id: teacher.id,
                full_name: teacher.full_name,
                total_present: records.filter(r => r.status === 'Present').length,
                total_absent: records.filter(r => r.status === 'Absent').length,
                total_on_leave: records.filter(r => r.status === 'On Leave').length,
                total_out_of_range: records.filter(r => r.status === 'Out of Range').length,
                today_status: todayRecord ? todayRecord.status : null,
            };
        });

        return { success: true, message: "Summary fetched", data: summary };
    } catch (error: any) {
        console.error("❌ Error fetching staff attendance summary:", error);
        console.log('🔍 Error details:', { error: error.message, stack: error.stack });
        return { success: false, message: error.message };
    }
}

interface ManualAttendancePayload {
    teacherId: string;
    date: string;
    status: 'Present' | 'Absent' | 'On Leave' | 'Out of Range';
    notes?: string;
}

export async function manuallySetStaffAttendance(payload: ManualAttendancePayload): Promise<ActionResponse> {
    const supabase = createClient();
    
    // Smart school detection: Try authenticated user's school first, then fallback to first school
    let schoolId: number;
    let userId: string | null = null;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
            // If user is authenticated, try to get their associated school
            const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).maybeSingle();
            if (roleData?.school_id) {
                schoolId = roleData.school_id;
            } else {
                // User has no role association, fallback to first school
                const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
                if (!schoolData) {
                    return { success: false, message: "Could not identify school. Please contact support." };
                }
                schoolId = schoolData.id;
            }
        } else {
            // No authenticated user, use first school as fallback
            const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
            if (!schoolData) {
                return { success: false, message: "Could not identify school. Please contact support." };
            }
            schoolId = schoolData.id;
        }
    } catch (authError) {
        // Authentication failed, use first school as fallback
        const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
        if (!schoolData) {
            return { success: false, message: "Could not identify school. Please contact support." };
        }
        schoolId = schoolData.id;
    }

    const { teacherId, date, status, notes } = payload;

    try {
        const attendanceData: any = {
            school_id: schoolId,
            teacher_id: teacherId,
            date: date,
            status: status,
            notes: notes
        };
        
        // Only add marked_by_admin_id if we have an authenticated user
        if (userId) {
            attendanceData.marked_by_admin_id = userId;
        }
        
        const { error } = await supabase.from('staff_attendance').upsert(attendanceData, { onConflict: 'school_id,teacher_id,date' });

        if(error) throw error;

        return { success: true, message: "Attendance status updated." };
    } catch (error: any) {
        console.error("Error manually setting attendance:", error);
        return { success: false, message: error.message };
    }
}
