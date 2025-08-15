
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

// All features are now accessible by both admin and super_admin
const allNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  // { href: "/admin/schools", label: "Schools", iconName: "School" }, // This line is removed
  { href: "/admin/applications", label: "Applications", iconName: "FileText", notificationId: "hasNewApplication" },
  { href: "/admin/announcements", label: "Announcements", iconName: "ClipboardList" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/record-payment", label: "Record Payment", iconName: "BookCheck" },
  { href: "/admin/student-arrears", label: "Student Arrears", iconName: "Users" }, 
  { href: "/admin/expenditures", label: "Expenditures", iconName: "TrendingUp" },
  { href: "/admin/users", label: "User Management", iconName: "Users" },
  { href: "/admin/staff-attendance", label: "Staff Attendance", iconName: "UserCheck" },
  { href: "/admin/qr-attendance", label: "QR Attendance", iconName: "QrCode" },
  { href: "/admin/behavior-logs", label: "Behavior Logs", iconName: "ShieldAlert", notificationId: "hasNewBehaviorLog" },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus" },
  { href: "/admin/register-accountant", label: "Register Accountant", iconName: "UserPlus" },
  { href: "/admin/register-admin", label: "Register Admin", iconName: "UserPlus" },
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle", notificationId: "hasNewResultsForApproval" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { role } = useAuth();
  
  // Simplified logic: If the user has any admin-level role, show all items.
  // This makes the UI consistent for 'admin' and 'super_admin'.
  const userRoleForLayout = role || 'admin';
  
  const visibleNavItems = allNavItems.filter(item => {
    // If the user's role is 'accountant', only show items for them.
    if (userRoleForLayout === 'accountant') {
        // Here you would define which items an accountant can see.
        // For now, let's assume they only see what's explicitly marked for them
        // or items without any role requirement.
        return item.requiredRole === 'accountant' || !item.requiredRole;
    }
    // Otherwise, if they are 'admin' or 'super_admin', show everything.
    return true;
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
