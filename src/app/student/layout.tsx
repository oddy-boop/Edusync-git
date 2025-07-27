
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";

const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/student/assignments", label: "My Assignments", iconName: "BookUp" },
  { href: "/student/results", label: "Results", iconName: "BookCheck" },
  { href: "/student/progress", label: "Progress", iconName: "BarChart2" },
  { href: "/student/fees", label: "My Fees", iconName: "DollarSign" },
  { href: "/student/attendance", label: "My Attendance", iconName: "CalendarCheck2" },
];

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout navItems={studentNavItems} userRole="Student">
      {children}
    </DashboardLayout>
  );
}
