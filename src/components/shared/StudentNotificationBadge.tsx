'use client';

import { useNotifications } from '@/lib/notification-context';

interface StudentNotificationBadgeProps {
  type: 'announcements' | 'results' | 'assignments' | 'fees';
  className?: string;
}

export default function StudentNotificationBadge({ type, className = '' }: StudentNotificationBadgeProps) {
  const { studentCounts, isLoading } = useNotifications();

  if (isLoading || !studentCounts) {
    return null;
  }

  const getCount = () => {
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
  };

  const count = getCount();

  if (count === 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full ${className}`}
      title={`${count} notification${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

