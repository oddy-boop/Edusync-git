'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getNotificationCountsAction } from '@/lib/actions/notifications.actions';
import { getTeacherNotificationCountsAction, getStudentNotificationCountsAction } from '@/lib/actions/portal-notifications.actions';
import { useAuth } from '@/lib/auth-context';

interface AdminNotificationCounts {
  pendingApplications: number;
  recentBehaviorIncidents: number;
  upcomingBirthdays: number;
  pendingApprovals: number;
  lowAttendance: number;
  overduePayments: number;
  unreadEmails: number;
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

interface NotificationContextType {
  adminCounts: AdminNotificationCounts | null;
  teacherCounts: TeacherNotificationCounts | null;
  studentCounts: StudentNotificationCounts | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  adminCounts: null,
  teacherCounts: null,
  studentCounts: null,
  isLoading: true,
  refresh: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [adminCounts, setAdminCounts] = useState<AdminNotificationCounts | null>(null);
  const [teacherCounts, setTeacherCounts] = useState<TeacherNotificationCounts | null>(null);
  const [studentCounts, setStudentCounts] = useState<StudentNotificationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { role } = useAuth();

  const fetchCounts = useCallback(async () => {
    if (!role) return;

    try {
      setIsLoading(true);
      
      if (role === 'admin' || role === 'accountant' || role === 'super_admin') {
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
  }, [role]);

  useEffect(() => {
    if (role) {
      fetchCounts();
      
      // Refresh counts every 5 minutes
      const interval = setInterval(fetchCounts, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [role, fetchCounts]);

  const value = {
    adminCounts,
    teacherCounts,
    studentCounts,
    isLoading,
    refresh: fetchCounts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
