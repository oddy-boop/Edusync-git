
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';

const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/student/assignments", label: "My Assignments", iconName: "BookUp" },
  { href: "/student/results", label: "Results", iconName: "BookCheck", notificationId: "hasNewResult" },
  { href: "/student/news", label: "School News", iconName: "Bell", notificationId: "hasNewAnnouncement" },
  { href: "/student/progress", label: "Progress", iconName: "BarChart2" },
  { href: "/student/fees", label: "My Fees", iconName: "DollarSign" },
  { href: "/student/attendance", label: "My Attendance", iconName: "CalendarCheck2" },
];

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [hasNewResult, setHasNewResult] = useState(false);
  
  const authContextValue = {
    ...useAuth(),
    hasNewAnnouncement,
    setHasNewAnnouncement,
    hasNewResult,
    setHasNewResult,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={studentNavItems} userRole="Student">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
