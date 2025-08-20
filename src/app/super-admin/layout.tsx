
"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

const superAdminNavItems: NavItem[] = [
  { href: "/super-admin/dashboard", label: "Platform Dashboard", iconName: "LayoutDashboard" },
  { href: "/super-admin/schools", label: "Manage Schools", iconName: "School" },
  { href: "/super-admin/register-admin", label: "Register Super Admin", iconName: "UserCog" },
  { href: "/super-admin/register-branch-admin", label: "Register Branch Admin", iconName: "UserPlus" },
  { href: "/super-admin/expenditures", label: "Branch Expenditures", iconName: "TrendingUp" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const { role } = useAuth();
  const userRoleTitle = 'Super Admin';
  const settingsPath = "/admin/profile"; // Super admin can use the standard profile page

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
