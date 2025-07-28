
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';

const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", iconName: "LayoutDashboard", notificationId: "hasNewAnnouncement" },
  { href: "/teacher/attendance", label: "Mark Attendance", iconName: "UserCheck" },
  { href: "/teacher/attendance-overview", label: "Attendance Overview", iconName: "ListChecks" },
  { href: "/teacher/behavior", label: "Behavior Tracking", iconName: "ClipboardList" },
  { href: "/teacher/assignments", label: "Assignment Management", iconName: "Edit" },
  { href: "/teacher/results", label: "Manage Results", iconName: "ResultsIcon" }, 
  { href: "/teacher/lesson-planner", label: "AI Lesson Planner", iconName: "Brain" },
  { href: "/teacher/timetable", label: "Timetable", iconName: "CalendarDays" },
];

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  
  const authContextValue = {
    ...useAuth(), // Inherit other values if needed
    hasNewAnnouncement,
    setHasNewAnnouncement,
    // Provide dummy state for admin/student specific notifications to avoid errors
    hasNewResultsForApproval: false,
    setHasNewResultsForApproval: () => {},
    hasNewResult: false,
    setHasNewResult: () => {},
    hasNewBehaviorLog: false,
    setHasNewBehaviorLog: () => {},
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={teacherNavItems} userRole="Teacher">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
