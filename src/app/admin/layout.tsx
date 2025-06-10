
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/users", label: "User Management", iconName: "Users" },
  { href: "/admin/register-student", label: "Register Student", iconName: "UserPlus" },
  { href: "/admin/register-teacher", label: "Register Teacher", iconName: "UserPlus" },
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
