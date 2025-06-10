
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
// Icons are now handled by string names in NavItem and resolved in DashboardLayout
// import { LayoutDashboard, BookCheck, BarChart2, DollarSign, CalendarCheck2 } from "lucide-react";

const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/student/results", label: "Results", iconName: "BookCheck" },
  { href: "/student/progress", label: "Progress", iconName: "BarChart2" },
  { href: "/student/fees", label: "My Fees", iconName: "DollarSign" },
  { href: "/student/attendance", label: "My Attendance", iconName: "CalendarCheck2" },
  // Add more student-specific links here
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
