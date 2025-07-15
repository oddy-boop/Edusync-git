import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";

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
  { href: "/admin/approve-results", label: "Approve Results", iconName: "CheckCircle" },
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
