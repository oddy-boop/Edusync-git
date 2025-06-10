import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, ClipboardList, Edit, BookOpen, Brain, UserCheck, CalendarDays } from "lucide-react";

const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/attendance", label: "Attendance", icon: UserCheck },
  { href: "/teacher/behavior", label: "Behavior Tracking", icon: ClipboardList },
  { href: "/teacher/assignments", label: "Assignments", icon: Edit },
  { href: "/teacher/lesson-planner", label: "AI Lesson Planner", icon: Brain },
  { href: "/teacher/timetable", label: "Timetable", icon: CalendarDays },
  // Add more teacher-specific links here
];

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout navItems={teacherNavItems} userRole="Teacher">
      {children}
    </DashboardLayout>
  );
}
