'use client';

import { useEffect, useState } from 'react';
import { getNotificationCountsAction } from '@/lib/actions/notifications.actions';
import { getTeacherNotificationCountsAction, getStudentNotificationCountsAction } from '@/lib/actions/portal-notifications.actions';
import { useAuth } from '@/lib/auth-context';

interface NotificationBadgeProps {
  type: 'applications' | 'behavior' | 'birthdays' | 'attendance' | 'payments' | 'announcements' | 'results' | 'assignments' | 'fees' | 'grading';
  className?: string;
}

interface AdminNotificationCounts {
  pendingApplications: number;
  recentBehaviorIncidents: number;
  upcomingBirthdays: number;
  pendingApprovals: number;
  lowAttendance: number;
  overduePayments: number;
}

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

export default function NotificationBadge({ type, className = '' }: NotificationBadgeProps) {
  const [adminCounts, setAdminCounts] = useState<AdminNotificationCounts | null>(null);
  const [teacherCounts, setTeacherCounts] = useState<TeacherNotificationCounts | null>(null);
  const [studentCounts, setStudentCounts] = useState<StudentNotificationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { role } = useAuth();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (role === 'admin' || role === 'accountant') {
          const result = await getNotificationCountsAction();
          if (result.success) {
            setAdminCounts(result.data);
          }
        } else if (role === 'teacher') {
          const result = await getTeacherNotificationCountsAction();
          if (result.success) {
            setTeacherCounts(result.data);
          }
        } else if (role === 'student') {
          const result = await getStudentNotificationCountsAction();
          if (result.success) {
            setStudentCounts(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (role) {
      fetchCounts();
      
      // Refresh counts every 5 minutes
      const interval = setInterval(fetchCounts, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [role]);

  if (isLoading || !role) {
    return null;
  }

  const getCount = () => {
    if (role === 'admin' || role === 'accountant') {
      if (!adminCounts) return 0;
      switch (type) {
        case 'applications':
          return adminCounts.pendingApplications;
        case 'behavior':
          return adminCounts.recentBehaviorIncidents;
        case 'birthdays':
          return adminCounts.upcomingBirthdays;
        case 'attendance':
          return adminCounts.lowAttendance;
        case 'payments':
          return adminCounts.overduePayments;
        default:
          return 0;
      }
    } else if (role === 'teacher') {
      if (!teacherCounts) return 0;
      switch (type) {
        case 'announcements':
          return teacherCounts.newAnnouncements;
        case 'grading':
          return teacherCounts.pendingGrading;
        case 'attendance':
          return teacherCounts.lowClassAttendance;
        default:
          return 0;
      }
    } else if (role === 'student') {
      if (!studentCounts) return 0;
      switch (type) {
        case 'announcements':
          return studentCounts.newAnnouncements;
        case 'results':
          return studentCounts.newResults;
        case 'assignments':
          return studentCounts.upcomingAssignments;
        case 'fees':
          return studentCounts.feeReminders;
        default:
          return 0;
      }
    }
    return 0;
  };

  const count = getCount();

  if (count === 0) {
    return null;
  }

  // Different colors for different roles
  const getBadgeColor = () => {
    switch (role) {
      case 'admin':
      case 'accountant':
        return 'bg-blue-500';
      case 'teacher':
        return 'bg-green-500';
      case 'student':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <span 
      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white ${getBadgeColor()} rounded-full ${className}`}
      title={`${count} notification${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
