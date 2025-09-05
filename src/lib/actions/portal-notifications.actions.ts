'use server';

import { createClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

interface TeacherNotificationCounts {
  newAnnouncements: number;
  upcomingClasses: number;
  pendingGrading: number;
  lowClassAttendance: number;
}

interface StudentNotificationCounts {
  newAnnouncements: number;
  newResults: number;
  upcomingAssignments: number;
  feeReminders: number;
}

export async function getTeacherNotificationCountsAction(): Promise<ActionResponse> {
  const supabase = createClient();

  try {
    const counts: TeacherNotificationCounts = {
      newAnnouncements: 0,
      upcomingClasses: 0,
      pendingGrading: 0,
      lowClassAttendance: 0
    };

    // Get recent announcements for teachers (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: announcementsCount } = await supabase
      .from('school_announcements')
      .select('*', { count: 'exact', head: true })
      .in('target_audience', ['All', 'Teachers'])
      .gte('created_at', sevenDaysAgo.toISOString());
    
    counts.newAnnouncements = announcementsCount || 0;

    // Get pending results that need grading (simplified)
    const { count: pendingGrading } = await supabase
      .from('student_results')
      .select('*', { count: 'exact', head: true })
      .is('grade', null); // Results without grades
    
    counts.pendingGrading = Math.min(pendingGrading || 0, 99); // Cap at 99 for display

    // Get classes with low attendance (simplified)
    const { count: lowAttendance } = await supabase
      .from('student_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'absent')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
    
    counts.lowClassAttendance = Math.min(lowAttendance || 0, 10); // Cap at 10

    return { 
      success: true, 
      message: "Teacher notification counts fetched successfully", 
      data: counts 
    };

  } catch (e: any) {
    console.error('Error fetching teacher notification counts:', e);
    return { 
      success: false, 
      message: e.message,
      data: {
        newAnnouncements: 0,
        upcomingClasses: 0,
        pendingGrading: 0,
        lowClassAttendance: 0
      }
    };
  }
}

export async function getStudentNotificationCountsAction(): Promise<ActionResponse> {
  const supabase = createClient();

  try {
    const counts: StudentNotificationCounts = {
      newAnnouncements: 0,
      newResults: 0,
      upcomingAssignments: 0,
      feeReminders: 0
    };

    // Get recent announcements for students (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: announcementsCount } = await supabase
      .from('school_announcements')
      .select('*', { count: 'exact', head: true })
      .in('target_audience', ['All', 'Students'])
      .gte('created_at', sevenDaysAgo.toISOString());
    
    counts.newAnnouncements = announcementsCount || 0;

    // Get new results (last 7 days)
    const { count: resultsCount } = await supabase
      .from('student_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    counts.newResults = resultsCount || 0;

    // Get upcoming assignments (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { count: assignmentsCount } = await supabase
      .from('student_assignments')
      .select('*', { count: 'exact', head: true })
      .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0])
      .eq('submission_status', 'pending');
    
    counts.upcomingAssignments = assignmentsCount || 0;

    // Check for fee reminders (students with outstanding balances)
    const { count: feeReminders } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gt('outstanding_balance', 0);
    
    counts.feeReminders = feeReminders || 0;

    return { 
      success: true, 
      message: "Student notification counts fetched successfully", 
      data: counts 
    };

  } catch (e: any) {
    console.error('Error fetching student notification counts:', e);
    return { 
      success: false, 
      message: e.message,
      data: {
        newAnnouncements: 0,
        newResults: 0,
        upcomingAssignments: 0,
        feeReminders: 0
      }
    };
  }
}
