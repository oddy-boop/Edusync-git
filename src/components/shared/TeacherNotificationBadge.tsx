'use client';

import { useNotifications } from '@/lib/notification-context';

interface TeacherNotificationBadgeProps {
  type: 'announcements' | 'grading' | 'attendance';
  className?: string;
}

export default function TeacherNotificationBadge({ type, className = '' }: TeacherNotificationBadgeProps) {
  const { teacherCounts, isLoading } = useNotifications();

  if (isLoading || !teacherCounts) {
    return null;
  }

  const getCount = () => {
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
  };

  const count = getCount();

  if (count === 0) {
    return null;
  }

  return (
    <span 
      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-500 rounded-full ${className}`}
      title={`${count} notification${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
