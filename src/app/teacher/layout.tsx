
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", iconName: "LayoutDashboard", notificationId: "hasNewAnnouncement" },
  { href: "/teacher/register", label: "Register", iconName: "BookCheck" },
  { href: "/teacher/attendance", label: "My Attendance", iconName: "UserCheck" },
  { href: "/teacher/attendance-overview", label: "Class Attendance", iconName: "ListChecks", notificationId: "hasLowAttendance" },
  { href: "/teacher/behavior", label: "Behavior Tracking", iconName: "ClipboardList" },
  { href: "/teacher/assignments", label: "Assignment Management", iconName: "Edit" },
  { href: "/teacher/results", label: "Manage Results", iconName: "ResultsIcon", notificationId: "hasPendingGrading" }, 
  { href: "/teacher/lesson-planner", label: "AI Lesson Planner", iconName: "Brain" },
  { href: "/teacher/timetable", label: "Timetable", iconName: "CalendarDays" },
];

import { ReactNode } from 'react';

export default function TeacherDashboardLayout({
  children,
}: { children: ReactNode }) {
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const auth = useAuth();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const authContextValue = {
    ...auth,
    hasNewAnnouncement,
    setHasNewAnnouncement,
    hasNewResultsForApproval: false,
    setHasNewResultsForApproval: () => {},
    hasNewResult: false,
    setHasNewResult: () => {},
    hasNewBehaviorLog: false,
    setHasNewBehaviorLog: () => {},
    hasNewApplication: false,
    setHasNewApplication: () => {},
  };

  if (auth.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if ((!auth.user || auth.role !== 'teacher') && !isHomePage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-lg font-medium">Not authenticated. Please login.</p>
        <Link href="/auth/teacher/login">
          <Button>Go to Teacher Login</Button>
        </Link>
      </div>
    );
  }
  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={teacherNavItems} userRole="Teacher">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
