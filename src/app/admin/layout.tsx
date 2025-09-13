
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const allNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard", notificationId: "hasUpcomingBirthdays" },
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication" },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users", notificationId: "hasOverduePayments" }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp" },
  { href: "/admin/users", label: "User Management", iconName: "Users" },
  { href: "/admin/staff-attendance", label: "Staff Attendance", iconName: "UserCheck", notificationId: "hasLowAttendance" },
  { href: "/admin/qr-attendance", label: "QR Attendance", iconName: "QrCode" },
  { href: "/admin/behavior-logs", label: "Behavior Logs", iconName: "ShieldAlert", notificationId: "hasNewBehaviorLog" },
  { href: "/admin/emails", label: "Emails", iconName: "Mail", notificationId: "hasNewEmails" },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus" },
  { href: "/admin/register-accountant", label: "Register Accountant", iconName: "UserPlus" },
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle", notificationId: "hasNewResultsForApproval" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth finished loading and there's no user at all, force redirect to admin login
    // If a user exists but role is missing, we avoid a hard redirect so admins can see
    // a diagnostic message and use the session-debug endpoint.
    if (!isLoading && !role && !authContextUserExists()) {
      router.replace('/auth/admin/login');
    }
  }, [isLoading, role, router]);

  function authContextUserExists() {
    // runtime-check for presence of a logged-in user without depending on types
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAuth: _ } = require('@/lib/auth-context');
    } catch (e) {
      // ignore
    }
    // The `useAuth()` hook is available in this scope earlier; instead of re-calling it,
    // check the global auth via the window (best-effort). Return true if we detect a session cookie.
    if (typeof document !== 'undefined') {
      return document.cookie.split(';').some((c) => c.toLowerCase().includes('sb-') || c.toLowerCase().includes('supabase') || c.toLowerCase().includes('auth-token'));
    }
    return false;
  }
  
  const userRoleTitle = role === 'accountant' ? 'Accountant' : 'Admin';
  
  const settingsPath = role === 'accountant' ? "/admin/profile" : "/admin/settings";

  // Filter nav items based on role. Accountants should only see a limited set.
  const visibleNavItems =
    role === "accountant"
      ? allNavItems.filter((item) =>
          [
            "/admin/fees",
            "/admin/record-payment",
            "/admin/users",
            "/admin/expenditures",
            "/admin/emails",
          ].includes(item.href)
        )
      : allNavItems;

  return (
      <DashboardLayout 
        navItems={visibleNavItems} 
        userRole={userRoleTitle}
        settingsPath={settingsPath}
      >
        {children}
      </DashboardLayout>
  );
}
