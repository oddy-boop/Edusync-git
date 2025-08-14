
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/admin/schools", label: "Schools", iconName: "School", requiredRole: 'super_admin' },
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication" },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users" }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp", requiredRole: 'accountant' },
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
  
  // Use the actual role from the auth context. Fallback to 'admin' is for initial loading states.
  const userRoleForLayout = role || 'admin';

  const visibleNavItems = adminNavItems.filter(item => {
    // Super admin sees everything except accountant-specific items
    if (userRoleForLayout === 'super_admin') {
      return item.requiredRole !== 'accountant';
    }
    // Accountant sees only accountant-specific items
    if (userRoleForLayout === 'accountant') {
        return item.requiredRole === 'accountant';
    }
    // Regular admin sees items for 'admin' or items with no required role
    if (userRoleForLayout === 'admin') {
        return !item.requiredRole || item.requiredRole === 'admin';
    }
    // Default case (should not be hit if logged in)
    return !item.requiredRole;
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
