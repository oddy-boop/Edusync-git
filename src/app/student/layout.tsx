
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
  
  const auth = useAuth();

  const authContextValue = {
    ...auth, // Pass down the real authentication state
    hasNewAnnouncement,
    setHasNewAnnouncement,
    hasNewResult,
    setHasNewResult,
    hasNewResultsForApproval: false,
    setHasNewResultsForApproval: () => {},
    hasNewBehaviorLog: false,
    setHasNewBehaviorLog: () => {},
    hasNewApplication: false,
    setHasNewApplication: () => {},
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={studentNavItems} userRole="Student">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
