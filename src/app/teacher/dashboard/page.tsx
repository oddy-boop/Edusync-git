
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
import { User, BookUser, Users } from "lucide-react";
import { CURRENTLY_LOGGED_IN_TEACHER_EMAIL, REGISTERED_TEACHERS_KEY, REGISTERED_STUDENTS_KEY } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";


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

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<RegisteredTeacher | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loggedInTeacherEmail = localStorage.getItem(CURRENTLY_LOGGED_IN_TEACHER_EMAIL);
    if (!loggedInTeacherEmail) {
      // Handle case where teacher email is not found, e.g., redirect to login
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
      currentTeacher.assignedClasses.forEach(className => {
        filteredStudents[className] = allStudents.filter(student => student.gradeLevel === className);
      });
      setStudentsByClass(filteredStudents);
    } else {
      console.error("Logged in teacher not found in storage.");
    }
    setIsLoading(false);
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
    { title: "Mark Attendance", href: "/teacher/attendance", icon: UserCheck, color: "text-blue-500" },
    { title: "Create Assignment", href: "/teacher/assignments", icon: BookUser, color: "text-green-500" },
    { title: "Log Behavior", href: "/teacher/behavior", icon: Users, color: "text-yellow-500" }, // Placeholder icon
    { title: "Lesson Plan Ideas", href: "/teacher/lesson-planner", icon: Users, color: "text-purple-500" }, // Placeholder icon
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
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" /> My Classes and Students
          </CardTitle>
          <CardDescription>
            Overview of students in your assigned classes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {teacher.assignedClasses.length === 0 && (
            <p className="text-muted-foreground">You are not currently assigned to any classes.</p>
          )}
          {teacher.assignedClasses.map((className) => (
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
        <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Upcoming Classes" icon={Users} description="View your schedule for today and upcoming classes. Links to join virtual classes (if applicable) will appear here."/>
        <PlaceholderContent title="Recent Notifications" icon={Users} description="Important announcements and alerts relevant to your classes and students will be displayed here."/>
      </div>
       <PlaceholderContent title="Pending Gradings" icon={BookUser} description="A list of assignments awaiting grading will appear here with quick links to grade them."/>
    </div>
  );
}
