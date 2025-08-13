
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
        const { data: teachers, error: teachersError } = await supabase.from('teachers').select('id, full_name').eq('school_id', schoolId).eq('is_deleted', false);
        if(teachersError) throw teachersError;
        
        if (teachers.length === 0) {
            return { success: true, message: "No teachers found", data: [] };
        }

        const teacherIds = teachers.map(t => t.id);
        const { data: attendanceRecords, error: attendanceError } = await supabase.from('staff_attendance').select('teacher_id, status, date').eq('school_id', schoolId).in('teacher_id', teacherIds);
        if(attendanceError) throw attendanceError;
        
        const summary = teachers.map(teacher => {
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
