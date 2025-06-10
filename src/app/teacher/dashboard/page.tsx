
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, BookUser, Users, UserCheck as UserCheckIcon, Brain, Bell, MessageSquare } from "lucide-react";
import { CURRENTLY_LOGGED_IN_TEACHER_EMAIL, REGISTERED_TEACHERS_KEY, REGISTERED_STUDENTS_KEY, ANNOUNCEMENTS_KEY } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { formatDistanceToNow } from "date-fns";

interface RegisteredTeacher {
  email: string;
  fullName: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
}

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: "All" | "Students" | "Teachers";
  author: string;
  createdAt: string; // ISO string date
}

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<RegisteredTeacher | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedInTeacherEmail = localStorage.getItem(CURRENTLY_LOGGED_IN_TEACHER_EMAIL);
      if (!loggedInTeacherEmail) {
        console.error("No logged in teacher email found.");
        setIsLoading(false);
        return;
      }

      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      const allTeachers: RegisteredTeacher[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const currentTeacher = allTeachers.find(t => t.email === loggedInTeacherEmail);
      
      if (currentTeacher) {
        setTeacher(currentTeacher);
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        
        const filteredStudents: Record<string, RegisteredStudent[]> = {};
        if (currentTeacher.assignedClasses && Array.isArray(currentTeacher.assignedClasses)) {
          currentTeacher.assignedClasses.forEach(className => {
            filteredStudents[className] = allStudents.filter(student => student.gradeLevel === className);
          });
        }
        setStudentsByClass(filteredStudents);

        // Load and filter announcements
        const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
        const allAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
        const relevantAnnouncements = allAnnouncements.filter(
          ann => ann.target === "All" || ann.target === "Teachers"
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(relevantAnnouncements);

      } else {
        console.error("Logged in teacher not found in storage.");
      }
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading dashboard...</p></div>;
  }

  if (!teacher) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load teacher information. Please try logging in again.</p>
          <Button asChild className="mt-4">
            <Link href="/auth/teacher/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quickAccess = [
    { title: "Mark Attendance", href: "/teacher/attendance", icon: UserCheckIcon, color: "text-blue-500" },
    { title: "Create Assignment", href: "/teacher/assignments", icon: BookUser, color: "text-green-500" },
    { title: "Log Behavior", href: "/teacher/behavior", icon: Users, color: "text-yellow-500" }, 
    { title: "Lesson Plan Ideas", href: "/teacher/lesson-planner", icon: Brain, color: "text-purple-500" },
  ];


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-headline font-semibold text-primary">
        Welcome, {teacher.fullName}!
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
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-6 w-6 text-primary" /> My Classes and Students
            </CardTitle>
            <CardDescription>
              Overview of students in your assigned classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) && (
              <p className="text-muted-foreground">You are not currently assigned to any classes.</p>
            )}
            {teacher.assignedClasses && teacher.assignedClasses.map((className) => (
              <div key={className}>
                <h3 className="text-xl font-semibold text-primary mb-2">{className}</h3>
                {studentsByClass[className] && studentsByClass[className].length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Guardian Name</TableHead>
                          <TableHead>Guardian Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsByClass[className].map((student) => (
                          <TableRow key={student.studentId}>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>{student.guardianName}</TableCell>
                            <TableCell>{student.guardianContact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No students registered in this class yet.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-6 w-6 text-primary" /> School Announcements
            </CardTitle>
            <CardDescription>
              Latest updates from the administration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Upcoming Classes" icon={Users} description="View your schedule for today and upcoming classes. Links to join virtual classes (if applicable) will appear here."/>
        <PlaceholderContent title="Pending Gradings" icon={BookUser} description="A list of assignments awaiting grading will appear here with quick links to grade them."/>
      </div>
    </div>
  );
}
