
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { AuthContext, useAuth } from "@/lib/auth-context";
import { useState } from 'react';

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users" }, 
  { href: "/admin/users", label: "User Management", iconName: "Users" },
  { href: "/admin/behavior-logs", label: "Behavior Logs", iconName: "ShieldAlert" },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus" },
  { href: "/admin/register-admin", label: "Register Admin", iconName: "UserPlus" },
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle", notificationId: "hasNewResultsForApproval" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasNewResultsForApproval, setHasNewResultsForApproval] = useState(false);
  
  const authContextValue = {
    ...useAuth(), // Inherit other values if needed
    hasNewResultsForApproval,
    setHasNewResultsForApproval,
  };
  
  return (
    <AuthContext.Provider value={authContextValue}>
      <DashboardLayout navItems={adminNavItems} userRole="Admin">
        {children}
      </DashboardLayout>
    </AuthContext.Provider>
  );
}
