'use client';

import { useEffect, useState } from 'react';
import { getTeacherNotificationCountsAction } from '@/lib/actions/portal-notifications.actions';

interface TeacherNotificationBadgeProps {
  type: 'announcements' | 'grading' | 'attendance';
  className?: string;
}

interface TeacherNotificationCounts {
  newAnnouncements: number;
  upcomingClasses: number;
  pendingGrading: number;
  lowClassAttendance: number;
}

export default function TeacherNotificationBadge({ type, className = '' }: TeacherNotificationBadgeProps) {
  const [counts, setCounts] = useState<TeacherNotificationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const result = await getTeacherNotificationCountsAction();
        if (result.success) {
          setCounts(result.data);
        }
      } catch (error) {
        console.error('Error fetching teacher notification counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
    
    // Refresh counts every 5 minutes
    const interval = setInterval(fetchCounts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !counts) {
    return null;
  }

  const getCount = () => {
    switch (type) {
      case 'announcements':
        return counts.newAnnouncements;
      case 'grading':
        return counts.pendingGrading;
      case 'attendance':
        return counts.lowClassAttendance;
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
