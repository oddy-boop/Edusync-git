'use client';

import { useNotifications } from '@/lib/notification-context';

interface NotificationBadgeProps {
  type: 'applications' | 'behavior' | 'birthdays' | 'attendance' | 'payments' | 'announcements' | 'results' | 'assignments' | 'fees' | 'grading' | 'emails';
  className?: string;
}

export default function NotificationBadge({ type, className = '' }: NotificationBadgeProps) {
  const { adminCounts, teacherCounts, studentCounts, isLoading } = useNotifications();

  if (isLoading) {
    return null;
  }

  const getCount = () => {
    if (adminCounts) {
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
        case 'results':
          return adminCounts.pendingApprovals;
        case 'emails':
          return adminCounts.unreadEmails;
        default:
          return 0;
      }
    } else if (teacherCounts) {
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
    } else if (studentCounts) {
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

  return (
    <div className={`relative inline-flex ${className}`}>
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
        {count > 99 ? '99+' : count}
      </span>
    </div>
  );
}
