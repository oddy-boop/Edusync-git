import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Bell, MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TeacherDashboardPage() {
  const quickAccess = [
    { title: "Mark Attendance", href: "/teacher/attendance", icon: CalendarDays, color: "text-blue-500" },
    { title: "Create Assignment", href: "/teacher/assignments", icon: BookOpen, color: "text-green-500" },
    { title: "Log Behavior", href: "/teacher/behavior", icon: MessageSquare, color: "text-yellow-500" },
    { title: "Lesson Plan Ideas", href: "/teacher/lesson-planner", icon: Bell, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Teacher Dashboard</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickAccess.map((item) => (
          <Card key={item.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="p-0 h-auto text-primary">
                <Link href={item.href}>
                  Go to {item.title.toLowerCase()}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Upcoming Classes" icon={CalendarDays} description="View your schedule for today and upcoming classes. Links to join virtual classes (if applicable) will appear here."/>
        <PlaceholderContent title="Recent Notifications" icon={Bell} description="Important announcements and alerts relevant to your classes and students will be displayed here."/>
      </div>
       <PlaceholderContent title="Pending Gradings" icon={BookOpen} description="A list of assignments awaiting grading will appear here with quick links to grade them."/>
    </div>
  );
}
