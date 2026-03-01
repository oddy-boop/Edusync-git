'use server';

import { createClient, createAuthClient } from "@/lib/supabase/server";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

interface NotificationCounts {
  pendingApplications: number;
  recentBehaviorIncidents: number;
  upcomingBirthdays: number;
  pendingApprovals: number;
  lowAttendance: number;
  overduePayments: number;
  unreadEmails: number;
}

export async function getNotificationCountsAction(): Promise<ActionResponse> {
  const supabase = createAuthClient();

  try {
    // Get current user and their school
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Not authenticated" };
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      return { success: false, message: "User role not found" };
    }

    const schoolId = userRole.school_id;

    const counts: NotificationCounts = {
      pendingApplications: 0,
      recentBehaviorIncidents: 0,
      upcomingBirthdays: 0,
      pendingApprovals: 0,
      lowAttendance: 0,
      overduePayments: 0,
      unreadEmails: 0
    };

    // Get pending admission applications
    const { count: applicationsCount } = await supabase
      .from('admission_applications')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending');
    
    counts.pendingApplications = applicationsCount || 0;

    // Get recent behavior incidents (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: incidentsCount } = await supabase
      .from('behavior_incidents')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    counts.recentBehaviorIncidents = incidentsCount || 0;

    // Get upcoming birthdays (next 3 days)
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get students and teachers with birthdays
    const { data: students } = await supabase
      .from('students')
      .select('date_of_birth')
      .eq('school_id', schoolId)
      .not('date_of_birth', 'is', null);

    const { data: teachers } = await supabase
      .from('teachers')
      .select('date_of_birth')
      .eq('school_id', schoolId)
      .not('date_of_birth', 'is', null);

    let birthdayCount = 0;
    
    // Count student birthdays
    if (students) {
      students.forEach(student => {
        if (student.date_of_birth) {
          const birthDate = new Date(student.date_of_birth);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          
          if (thisYearBirthday < now) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          
          const daysDiff = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 3) {
            birthdayCount++;
          }
        }
      });
    }

    // Count teacher birthdays
    if (teachers) {
      teachers.forEach(teacher => {
        if (teacher.date_of_birth) {
          const birthDate = new Date(teacher.date_of_birth);
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          
          if (thisYearBirthday < now) {
            thisYearBirthday.setFullYear(currentYear + 1);
          }
          
          const daysDiff = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 3) {
            birthdayCount++;
          }
        }
      });
    }

    counts.upcomingBirthdays = birthdayCount;

    // Get students with low attendance (less than 75% in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: lowAttendanceCount } = await supabase
      .from('student_attendance')
      .select('student_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'absent')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
    
    // This is a simplified count - in a real scenario you'd calculate percentage
    counts.lowAttendance = Math.min(lowAttendanceCount || 0, 10); // Cap at 10 for display

    // Get overdue payments (payments due more than 30 days ago)
    const { count: overdueCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .lt('last_payment_date', thirtyDaysAgo.toISOString());
    
    counts.overduePayments = overdueCount || 0;

    // Get pending result approvals from the new student_results table
    const { count: pendingResultsCount } = await supabase
      .from('student_results')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('approval_status', 'pending');
    
    counts.pendingApprovals = pendingResultsCount || 0;

    // Get unread emails count
    const { count: unreadEmailsCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'unread')
      .eq('email_type', 'incoming');
    
    counts.unreadEmails = unreadEmailsCount || 0;

    return { 
      success: true, 
      message: "Notification counts fetched successfully", 
      data: counts 
    };

  } catch (e: any) {
    console.error('Error fetching notification counts:', e);
    return { 
      success: false, 
      message: e.message,
      data: {
        pendingApplications: 0,
        recentBehaviorIncidents: 0,
        upcomingBirthdays: 0,
        pendingApprovals: 0,
        lowAttendance: 0,
        overduePayments: 0,
        unreadEmails: 0
      }
    };
  }
}
