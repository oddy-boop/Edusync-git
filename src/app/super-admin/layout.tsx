"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

const superAdminNavItems: NavItem[] = [
  {
    href: "/super-admin/dashboard",
    label: "Platform Dashboard",
    iconName: "LayoutDashboard",
  },
  { href: "/super-admin/schools", label: "Manage Schools", iconName: "School" },
  {
    href: "/super-admin/register-admin",
    label: "Register Super Admin",
    iconName: "UserCog",
  },
  {
    href: "/super-admin/register-branch-admin",
    label: "Register Branch Admin",
    iconName: "UserPlus",
  },
  {
    href: "/super-admin/expenditures",
    label: "Branch Expenditures",
    iconName: "TrendingUp",
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && role !== "super_admin") {
      router.replace("/auth/super-admin");
    }
  }, [isLoading, role, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const userRoleTitle = "Super Admin";
  const settingsPath = "/super-admin/profile"; // Super admin uses a super-admin profile page

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
