
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard", requiredRole: 'admin' },
  { href: "/admin/schools", label: "Schools", iconName: "School", requiredRole: 'super_admin' },
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication", requiredRole: 'admin' },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList", requiredRole: 'admin' },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign", requiredRole: 'admin' },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck", requiredRole: 'admin' },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users", requiredRole: 'admin' }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp", requiredRole: 'admin' },
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

const accountantNavItems: NavItem[] = [
    { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp" },
    { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
    { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
    { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users" }, 
    { href: "/admin/staff-attendance", label: "Staff Attendance", iconName: "UserCheck" },
    { href: "/admin/qr-attendance", label: "QR Attendance", iconName: "QrCode" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
  const [hasNewBehaviorLog, setHasNewBehaviorLog] = useState(false);
  const [hasNewApplication, setHasNewApplication] = useState(false);
  
  const authContextValue = useAuth();

  const authState = {
    ...authContextValue,
    hasNewResultsForApproval,
    setHasNewResultsForApproval,
    hasNewBehaviorLog,
    setHasNewBehaviorLog,
    hasNewApplication,
    setHasNewApplication,
  };
  
  const isAccountant = authContextValue.role === 'accountant';

  const userRoleForLayout = isAccountant ? "Accountant" : "Admin";

  const settingsPath = isAccountant ? "/admin/profile" : "/admin/settings";

  return (
    <AuthContext.Provider value={authState}>
      <DashboardLayout 
        navItems={isAccountant ? accountantNavItems : adminNavItems} 
        userRole={userRoleForLayout}
        settingsPath={settingsPath}
      >
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
