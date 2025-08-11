
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard", requiredRole: 'admin' },
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication", requiredRole: 'admin' },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList", requiredRole: 'admin' },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign", requiredRole: 'accountant' },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck", requiredRole: 'accountant' },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users", requiredRole: 'accountant' }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp", requiredRole: 'accountant' },
  { href: "/admin/users", label: "User Management", iconName: "Users", requiredRole: 'admin' },
  { href: "/admin/staff-attendance", label: "Staff Attendance", iconName: "UserCheck", requiredRole: 'admin' },
  { href: "/admin/qr-attendance", label: "QR Attendance", iconName: "QrCode", requiredRole: 'admin' },
  { href: "/admin/behavior-logs", label: "Behavior Logs", iconName: "ShieldAlert", notificationId: "hasNewBehaviorLog", requiredRole: 'admin' },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus", requiredRole: 'admin' },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus", requiredRole: 'admin' },
  { href: "/admin/register-accountant", label: "Register Accountant", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/admin/register-admin", label: "Register Admin", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle", notificationId: "hasNewResultsForApproval", requiredRole: 'admin' },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
  const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
  const [hasNewApplication, setHasNewApplication] = useState(false);
  
  const authContextValue = {
    ...useAuth(), // Inherit other values if needed
    hasNewResultsForApproval,
    setHasNewResultsForApproval,
    hasNewBehaviorLog,
    setHasNewBehaviorLog,
    hasNewApplication,
    setHasNewApplication,
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={adminNavItems} userRole="Admin">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
