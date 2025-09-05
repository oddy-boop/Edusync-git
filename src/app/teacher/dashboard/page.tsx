
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, BookUser, Users, UserCheck as UserCheckIcon, Brain, Bell, Loader2, AlertCircle, Download, Cake } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, parseISO, isToday } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";

// Teacher profile structure (matches data from 'teachers' table)
interface TeacherProfile {
  id: string; // PK of 'teachers' table
  auth_user_id: string; // FK to auth.users.id
  full_name: string;
  email: string;
  subjects_taught: string;
  contact_number: string;
  assigned_classes: string[];
  date_of_birth?: string; // Added for birthday check
}

// Student data structure from 'students' table
interface StudentFromSupabase {
  student_id_display: string;
  full_name: string;
  date_of_birth: string; 
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string;
}

interface TeacherAnnouncement {
  id: string; 
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string; 
}

export default function TeacherDashboardPage() {
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentFromSupabase[]>>({});
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBirthday, setIsBirthday] = useState(false); // New state for birthday
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const { setHasNewAnnouncement, isLoading: isAuthLoading, user } = useAuth();

  const loadDashboardData = useCallback(async () => {
    if (!isMounted.current || !supabaseRef.current || !user) {
        if(!user && !isAuthLoading && isMounted.current) {
            setError("Not authenticated. Please login.");
        }
        return;
    }
    
    setError(null);

    // Mark notifications as "seen" when dashboard is loaded/reloaded
    if (typeof window !== 'undefined') {
        localStorage.setItem('teacher_last_checked_announcement', new Date().toISOString());
        setHasNewAnnouncement(false);
    }
    
      try {
        // Fetch teacher profile from 'teachers' table using auth_user_id
        const { data: profileData, error: profileError } = await supabaseRef.current
          .from('teachers')
          .select('id, auth_user_id, full_name, email, subjects_taught, contact_number, assigned_classes, date_of_birth')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Supabase returned an error fetching teacher profile', profileError);
          throw profileError;
        }

        if (profileData) {
          if (isMounted.current) {
            const currentProfile = profileData as TeacherProfile;
            setTeacherProfile(currentProfile);
            if (currentProfile.date_of_birth) {
                const dob = parseISO(currentProfile.date_of_birth);
                const today = new Date();
                if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
                    setIsBirthday(true);
                }
            }
          }

          if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
            const { data: allAssignedStudents, error: studentsError } = await supabaseRef.current
              .from('students')
              .select('student_id_display, full_name, date_of_birth, grade_level, guardian_name, guardian_contact, contact_email')
              .in('grade_level', profileData.assigned_classes);

            if (studentsError) throw studentsError;

            let studentsForTeacher: Record<string, StudentFromSupabase[]> = {};
            for (const className of profileData.assigned_classes) {
              studentsForTeacher[className] = (allAssignedStudents || []).filter(s => s.grade_level === className);
            }
            if (isMounted.current) setStudentsByClass(studentsForTeacher);
          } else {
             if (isMounted.current) setStudentsByClass({});
          }
        } else {
          if (isMounted.current) setError("Your teacher profile could not be found. Please contact an administrator.");
        }

        if (isMounted.current) setIsLoadingAnnouncements(true);
        setAnnouncementsError(null);
        const { data: announcementData, error: fetchAnnError } = await supabaseRef.current
          .from('school_announcements')
          .select('id, title, message, target_audience, author_name, created_at')
          .or('target_audience.eq.All,target_audience.eq.Teachers')
          .order('created_at', { ascending: false });

        if (fetchAnnError) throw fetchAnnError;
        if (isMounted.current) setAnnouncements(announcementData as TeacherAnnouncement[] || []);
        
      } catch (e: any) { 
        console.error("Error fetching data for teacher dashboard:", e);
        const errorMessage = e.message || "An unknown error occurred";
        if (errorMessage.includes("announcements")) {
          if (isMounted.current) setAnnouncementsError(`Failed to load announcements: ${errorMessage}`);
        } else {
          if (isMounted.current) setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
        }
      } finally {
          if (isMounted.current) setIsLoadingAnnouncements(false);
      }
  }, [user, setHasNewAnnouncement]);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = createClient();
    if (!isAuthLoading) {
      loadDashboardData();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isAuthLoading, loadDashboardData]);
  
  const handleDownloadStudentList = (className: string) => {
    const students = studentsByClass[className];
    if (!students || students.length === 0) {
      alert("No students to download.");
      return;
    }
    
    // Create CSV content
    const headers = ["Student Name", "Student ID", "Guardian Name", "Guardian Contact"];
    const csvRows = [
      headers.join(','),
      ...students.map(student =>
        `"${student.full_name.replace(/"/g, '""')}","${student.student_id_display}","${student.guardian_name.replace(/"/g, '""')}","${student.guardian_contact}"`
      )
    ];
    const csvContent = csvRows.join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${className}_student_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) { 
    return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Profile Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p> 
          <Button asChild className="mt-4">
              <Link href="/auth/teacher/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!teacherProfile && !isAuthLoading) {
     return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
             <AlertCircle className="mr-2 h-5 w-5" /> Profile Not Loaded
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load your teacher profile. This might be due to a network issue or an incomplete registration.</p>
          <p className="mt-2">Please try logging in again or contact your school administrator if the problem continues.</p>
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary">
          Welcome, {teacherProfile?.full_name}!
        </h2>
        <div>
          <Button className="flex items-center" asChild>
            <Link href="/teacher/attendance">
              <span className="flex items-center">
                <UserCheckIcon className="mr-2 h-4 w-4" />
                Mark Attendance
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {isBirthday && (
          <Card className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-amber-300 dark:border-amber-700 shadow-lg">
              <CardContent className="p-4 flex items-center gap-4">
                  <Cake className="h-10 w-10 text-amber-500"/>
                  <div>
                      <CardTitle className="text-lg font-bold text-amber-800 dark:text-amber-200">Happy Birthday!</CardTitle>
                      <p className="text-sm text-amber-700 dark:text-amber-300">We wish you all the best on your special day!</p>
                  </div>
              </CardContent>
          </Card>
      )}

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
      
      <div className="grid gap-6 lg:grid-cols-1">
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
            {(!teacherProfile?.assigned_classes || teacherProfile.assigned_classes.length === 0) && (
              <p className="text-muted-foreground">You are not currently assigned to any classes according to your profile.</p>
            )}
            {teacherProfile?.assigned_classes && teacherProfile.assigned_classes.map((className) => (
              <div key={className}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold text-primary">{className}</h3>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadStudentList(className)} disabled={!studentsByClass[className] || studentsByClass[className].length === 0}>
                        <Download className="mr-2 h-4 w-4"/>
                        Download List
                    </Button>
                </div>
                {studentsByClass[className] && studentsByClass[className].length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                          <TableHead className="hidden md:table-cell">Guardian Name</TableHead>
                          <TableHead className="hidden md:table-cell">Guardian Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsByClass[className].map((student) => (
                          <TableRow key={student.student_id_display}>
                            <TableCell>{student.full_name}</TableCell>
                            <TableCell className="font-mono text-sm hidden sm:table-cell">{student.student_id_display}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.guardian_name}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.guardian_contact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No students found for {className}, or data is still loading.</p>
                )}
              </div>
            ))}
             {Object.keys(studentsByClass).length > 0 && 
              Object.values(studentsByClass).every(list => list.length === 0) && 
              teacherProfile?.assigned_classes && teacherProfile.assigned_classes.length > 0 && (
                <p className="text-muted-foreground text-center py-4">No students currently registered in your assigned classes.</p>
            )}
             {Object.keys(studentsByClass).length === 0 && 
              teacherProfile?.assigned_classes && teacherProfile.assigned_classes.length > 0 && 
              !isAuthLoading && ( 
              <p className="text-muted-foreground text-center py-4">Loading student data or no students found for your classes...</p>
            )}
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
            {isLoadingAnnouncements ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <p className="text-muted-foreground">Loading announcements...</p>
              </div>
            ) : announcementsError ? (
                 <p className="text-destructive text-center py-4">{announcementsError}</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No new announcements found.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.slice(0, 5).map(ann => (
                  <Card key={ann.id} className="bg-secondary/30">
                    <CardHeader className="pb-2 pt-3 px-4">
                       <CardTitle className="text-base">{ann.title}</CardTitle>
                       <CardDescription className="text-xs">
                            By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
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
                        <Link href="/teacher/news">View All Announcements</Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
