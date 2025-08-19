
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

// A specific set of navigation items for the Super Admin
const superAdminNavItems: NavItem[] = [
  { href: "/super-admin/dashboard", label: "Platform Dashboard", iconName: "LayoutDashboard" },
  { href: "/super-admin/schools", label: "Manage Schools", iconName: "School" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/admin/register-accountant", label: "Register Accountant", iconName: "UserPlus", requiredRole: 'super_admin' },
  { href: "/super-admin/register-admin", label: "Register Branch Admin", iconName: "UserCog", requiredRole: 'super_admin' },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { role } = useAuth();
  const userRoleTitle = 'Super Admin';
  const settingsPath = "/admin/settings"; // Super admin still uses the same settings page

  // A super admin only sees their own nav items
  const visibleNavItems = superAdminNavItems;

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
