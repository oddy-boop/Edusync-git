import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, Users, DollarSign, Settings } from "lucide-react";

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/fees", label: "Fee Structure", icon: DollarSign },
  { href: "/admin/users", label: "User Management", icon: Users },
  // Add more admin-specific links here
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout navItems={adminNavItems} userRole="Admin">
      {children}
    </DashboardLayout>
  );
}
