
'use server';

import { createClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getStaffAttendanceSummary(): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    const schoolId = roleData.school_id;
    
    try {
        // Some deployments may not have an `is_deleted` column on teachers. Avoid filtering on it here.
        const { data: teachers, error: teachersError } = await supabase.from('teachers').select('id, name').eq('school_id', schoolId);
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
        console.error("Error fetching staff attendance summary:", error);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    const { teacherId, date, status, notes } = payload;

    try {
        const { error } = await supabase.from('staff_attendance').upsert({
            school_id: roleData.school_id,
            teacher_id: teacherId,
            date: date,
            status: status,
            notes: notes,
            marked_by_admin_id: user.id
        }, { onConflict: 'school_id,teacher_id,date' });

        if(error) throw error;

        return { success: true, message: "Attendance status updated." };
    } catch (error: any) {
        console.error("Error manually setting attendance:", error);
        return { success: false, message: error.message };
    }
}
