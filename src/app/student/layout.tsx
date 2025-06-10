import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, BookCheck, BarChart2, DollarSign, CalendarCheck2 } from "lucide-react";

const studentNavItems: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/results", label: "Results", icon: BookCheck },
  { href: "/student/progress", label: "Progress", icon: BarChart2 },
  { href: "/student/fees", label: "My Fees", icon: DollarSign },
  { href: "/student/attendance", label: "My Attendance", icon: CalendarCheck2 },
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
