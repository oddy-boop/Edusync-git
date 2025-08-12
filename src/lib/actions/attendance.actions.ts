
'use server';

import pool from "@/lib/db";
import { getSession } from "@/lib/session";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getStaffAttendanceSummary(): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated or school not identified." };
    }
    const schoolId = session.schoolId;
    const client = await pool.connect();
    try {
        const { rows: teachers } = await client.query('SELECT id, full_name FROM teachers WHERE school_id = $1 AND is_deleted = false', [schoolId]);
        if (teachers.length === 0) {
            return { success: true, message: "No teachers found", data: [] };
        }

        const teacherIds = teachers.map(t => t.id);
        const { rows: attendanceRecords } = await client.query('SELECT teacher_id, status FROM staff_attendance WHERE school_id = $1 AND teacher_id = ANY($2::uuid[])', [schoolId, teacherIds]);
        
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
    } finally {
        client.release();
    }
}

interface ManualAttendancePayload {
    teacherId: string;
    date: string;
    status: 'Present' | 'Absent' | 'On Leave' | 'Out of Range';
    notes?: string;
}

export async function manuallySetStaffAttendance(payload: ManualAttendancePayload): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId || !session.schoolId) {
        return { success: false, message: "Not authenticated or required IDs missing." };
    }
    const { teacherId, date, status, notes } = payload;
    const client = await pool.connect();

    try {
        await client.query(
            `INSERT INTO staff_attendance (school_id, teacher_id, date, status, notes, marked_by_admin_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (school_id, teacher_id, date)
             DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, marked_by_admin_id = EXCLUDED.marked_by_admin_id`,
            [session.schoolId, teacherId, date, status, notes, session.userId]
        );
        return { success: true, message: "Attendance status updated." };
    } catch (error: any) {
        console.error("Error manually setting attendance:", error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
}
