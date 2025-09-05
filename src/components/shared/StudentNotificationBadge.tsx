'use client';

import { useEffect, useState } from 'react';
import { getStudentNotificationCountsAction } from '@/lib/actions/portal-notifications.actions';

interface StudentNotificationBadgeProps {
  type: 'announcements' | 'results' | 'assignments' | 'fees';
  className?: string;
}

interface StudentNotificationCounts {
  newAnnouncements: number;
  newResults: number;
  upcomingAssignments: number;
  feeReminders: number;
}

export default function StudentNotificationBadge({ type, className = '' }: StudentNotificationBadgeProps) {
  const [counts, setCounts] = useState<StudentNotificationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const result = await getStudentNotificationCountsAction();
        if (result.success) {
          setCounts(result.data);
        }
      } catch (error) {
        console.error('Error fetching student notification counts:', error);
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
      case 'results':
        return counts.newResults;
      case 'assignments':
        return counts.upcomingAssignments;
      case 'fees':
        return counts.feeReminders;
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
      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-purple-500 rounded-full ${className}`}
      title={`${count} notification${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
