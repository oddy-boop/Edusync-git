
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const allNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/admin/schools", label: "Schools", iconName: "School", requiredRole: 'super_admin' },
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication" },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users" }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp", requiredRole: 'admin' }, // Accessible by admin and super_admin
  { href: "/admin/users", label: "User Management", iconName: "Users" },
  { href: "/admin/staff-attendance", label: "Staff Attendance", iconName: "UserCheck" },
  { href: "/admin/qr-attendance", label: "QR Attendance", iconName: "QrCode" },
  { href: "/admin/behavior-logs", label: "Behavior Logs", iconName: "ShieldAlert", notificationId: "hasNewBehaviorLog" },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus" },
  { href: "/admin/register-accountant", label: "Register Accountant", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/admin/register-admin", label: "Register Admin", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle", notificationId: "hasNewResultsForApproval" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { role } = useAuth();
  
  const userRoleForLayout = role || 'admin';

  const visibleNavItems = allNavItems.filter(item => {
    // If the user is a super_admin, show everything.
    if (userRoleForLayout === 'super_admin') {
      return true;
    }
    // If an item has no specific role requirement, show it to all admin-level users.
    if (!item.requiredRole) {
      return true;
    }
    // For other roles (admin, accountant), show the item only if their role matches the required role.
    return item.requiredRole === userRoleForLayout;
  });
  
  const settingsPath = userRoleForLayout === 'accountant' ? "/admin/profile" : "/admin/settings";

  return (
      <DashboardLayout 
        navItems={visibleNavItems} 
        userRole={userRoleForLayout.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        settingsPath={settingsPath}
      >
        {children}
      </DashboardLayout>
  );
}
