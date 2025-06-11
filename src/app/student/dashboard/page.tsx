
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { ANNOUNCEMENTS_KEY, CURRENTLY_LOGGED_IN_STUDENT_ID, REGISTERED_STUDENTS_KEY } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: "All" | "Students" | "Teachers";
  author: string;
  createdAt: string; // ISO string date
}

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
}

export default function StudentDashboardPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [student, setStudent] = useState<RegisteredStudent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedInStudentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);

      if (!loggedInStudentId) {
        setError("No student logged in. Please login.");
        setIsLoadingAnnouncements(false);
        return;
      }

      const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      const currentStudent = allStudents.find(s => s.studentId === loggedInStudentId);

      if (!currentStudent) {
        setError("Logged in student profile not found. Please contact administration.");
        setIsLoadingAnnouncements(false);
        return;
      }
      setStudent(currentStudent);

      const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      const allAnnouncementsData: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
      
      const relevantAnnouncements = allAnnouncementsData.filter(
        ann => ann.target === "All" || ann.target === "Students"
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAnnouncements(relevantAnnouncements);
      setIsLoadingAnnouncements(false);
    }
  }, []);

  const quickAccess = [
    { title: "View Results", href: "/student/results", icon: BookCheck, color: "text-blue-500" },
    { title: "Track Progress", href: "/student/progress", icon: BarChart2, color: "text-green-500" },
    { title: "School News", href: "/student/news", icon: Bell, color: "text-yellow-500" },
    { title: "My Timetable", href: "/student/timetable", icon: CalendarDays, color: "text-purple-500" },
  ];

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-6 w-6" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          {error.includes("Please login") && (
            <Button asChild className="mt-4">
              <Link href="/auth/student/login">Go to Login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">
        {student ? `Welcome, ${student.fullName}!` : "Student Dashboard"}
      </h2>
      
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
      
      <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-6 w-6 text-primary" /> Recent Announcements
            </CardTitle>
            <CardDescription>
              Latest updates and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (
              <p className="text-muted-foreground">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No new announcements.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.slice(0, 5).map(ann => ( // Display up to 5 recent ones
                  <Card key={ann.id} className="bg-secondary/30">
                    <CardHeader className="pb-2 pt-3 px-4">
                       <CardTitle className="text-base">{ann.title}</CardTitle>
                       <CardDescription className="text-xs">
                            By: {ann.author} | {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{ann.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {announcements.length > 5 && (
                <div className="mt-4 text-center">
                    <Button variant="link" size="sm" asChild>
                        <Link href="/student/news">View All Announcements</Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Recent Grades" icon={BookCheck} description="Your latest grades and assignment feedback will appear here." />
        <PlaceholderContent title="Upcoming Deadlines" icon={CalendarDays} description="Important dates for assignments, exams, and school events."/>
      </div>
    </div>
  );
}

