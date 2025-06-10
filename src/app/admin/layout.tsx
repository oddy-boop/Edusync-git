
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
// Icons are now handled by string names in NavItem and resolved in DashboardLayout
// import { LayoutDashboard, Users, DollarSign } from "lucide-react"; 

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/admin/fees", label: "Fee Structure", iconName: "DollarSign" },
  { href: "/admin/users", label: "User Management", iconName: "Users" },
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
