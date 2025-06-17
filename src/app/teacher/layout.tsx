
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { NavItem } from "@/components/layout/DashboardLayout";
// Icons are now handled by string names in NavItem and resolved in DashboardLayout
// import { LayoutDashboard, ClipboardList, Edit, BookOpen, Brain, UserCheck, CalendarDays } from "lucide-react";

const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
  { href: "/teacher/attendance", label: "Mark Attendance", iconName: "UserCheck" },
  { href: "/teacher/attendance-overview", label: "Attendance Overview", iconName: "ListChecks" },
  { href: "/teacher/behavior", label: "Behavior Tracking", iconName: "ClipboardList" },
  { href: "/teacher/assignments", label: "Assignment Management", iconName: "Edit" },
  { href: "/teacher/results", label: "Manage Results", iconName: "ResultsIcon" }, 
  { href: "/teacher/lesson-planner", label: "AI Lesson Planner", iconName: "Brain" },
  { href: "/teacher/timetable", label: "Timetable", iconName: "CalendarDays" },
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

