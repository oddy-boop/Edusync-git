import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudentDashboardPage() {
  const quickAccess = [
    { title: "View Results", href: "/student/results", icon: BookCheck, color: "text-blue-500" },
    { title: "Track Progress", href: "/student/progress", icon: BarChart2, color: "text-green-500" },
    { title: "School News", href: "/student/news", icon: Bell, color: "text-yellow-500" },
    { title: "My Timetable", href: "/student/timetable", icon: CalendarDays, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Student Dashboard</h2>
      
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
        <PlaceholderContent title="Recent Grades" icon={BookCheck} description="Your latest grades and assignment feedback will appear here." />
        <PlaceholderContent title="Upcoming Deadlines" icon={CalendarDays} description="Important dates for assignments, exams, and school events."/>
      </div>
       <PlaceholderContent title="Notifications" icon={Bell} description="Messages from teachers and school announcements will be displayed here."/>
    </div>
  );
}
