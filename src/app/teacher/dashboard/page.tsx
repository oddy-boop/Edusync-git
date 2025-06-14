
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, BookUser, Users, UserCheck as UserCheckIcon, Brain, Bell, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { formatDistanceToNow } from "date-fns";
import { REGISTERED_TEACHERS_KEY, REGISTERED_STUDENTS_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

// LocalStorage teacher profile structure
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role: string;
}

// LocalStorage student data structure
interface RegisteredStudent {
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
}

interface TeacherAnnouncement {
  id: string; // UUID
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string; // ISO string date
}

export default function TeacherDashboardPage() {
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;

    const loadDashboardData = async () => {
      if (!isMounted.current || typeof window === 'undefined') return;
      
      setIsLoading(true);
      setError(null);

      const teacherUid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);

      if (teacherUid) {
        try {
          // Fetch teacher profile from localStorage
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          const profileData = allTeachers.find(t => t.uid === teacherUid);

          if (profileData) {
            if (isMounted.current) setTeacherProfile(profileData);

            if (profileData.assignedClasses && profileData.assignedClasses.length > 0) {
              const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
              const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
              let studentsForTeacher: Record<string, RegisteredStudent[]> = {};
              
              for (const className of profileData.assignedClasses) {
                studentsForTeacher[className] = allStudents.filter(s => s.gradeLevel === className);
              }
              if (isMounted.current) setStudentsByClass(studentsForTeacher);
            } else {
               if (isMounted.current) setStudentsByClass({});
            }
          } else {
            if (isMounted.current) setError("Your teacher profile could not be found in local records. Please contact an administrator.");
          }

          // Fetch announcements from Supabase
          if (isMounted.current) setIsLoadingAnnouncements(true);
          setAnnouncementsError(null);
          const { data: announcementData, error: fetchAnnError } = await supabase
            .from('school_announcements')
            .select('id, title, message, target_audience, author_name, created_at')
            .or('target_audience.eq.All,target_audience.eq.Teachers')
            .order('created_at', { ascending: false });

          if (fetchAnnError) throw fetchAnnError;
          if (isMounted.current) setAnnouncements(announcementData as TeacherAnnouncement[] || []);
          
        } catch (e: any) { 
          console.error("Error fetching data for teacher dashboard:", e);
          if (e.message.includes("announcements")) {
            if (isMounted.current) setAnnouncementsError(`Failed to load announcements: ${e.message}`);
          } else {
            if (isMounted.current) setError(prev => prev ? `${prev} Failed to load dashboard data.` : "Failed to load dashboard data.");
          }
        } finally {
            if (isMounted.current) setIsLoadingAnnouncements(false);
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated. Please login.");
          router.push("/auth/teacher/login");
        }
      }
      if (isMounted.current) setIsLoading(false);
    };

    loadDashboardData();

    return () => {
      isMounted.current = false;
    };
  }, [router, supabase]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error && (!teacherProfile || error.includes("profile could not be found"))) { 
    return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Profile Issue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p> 
          {error.includes("Not authenticated") && (
            <Button asChild className="mt-4">
              <Link href="/auth/teacher/login">Go to Login</Link>
            </Button>
          )}
           {error.includes("profile could not be found") && !error.includes("Not authenticated") && (
            <p className="mt-2 text-sm text-muted-foreground">
              Please ensure your registration was completed by an administrator and data is available in local storage.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!teacherProfile && !isLoading) {
     return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
             <AlertCircle className="mr-2 h-5 w-5" /> Profile Not Loaded
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load your teacher profile from local storage. This might be due to a network issue, data not being available, or an unexpected error.</p>
          <p className="mt-2">Please try logging in again or contact support if the problem continues.</p>
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
        Welcome, {teacherProfile?.fullName}!
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
              Overview of students in your assigned classes, loaded from local browser storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(!teacherProfile?.assignedClasses || teacherProfile.assignedClasses.length === 0) && (
              <p className="text-muted-foreground">You are not currently assigned to any classes according to your profile.</p>
            )}
            {teacherProfile?.assignedClasses && teacherProfile.assignedClasses.map((className) => (
              <div key={className}>
                <h3 className="text-xl font-semibold text-primary mb-2">{className}</h3>
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
                          <TableRow key={student.studentId}>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell className="font-mono text-xs hidden sm:table-cell">{student.studentId}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.guardianName}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.guardianContact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No students found for {className} in local storage, or data is still loading.</p>
                )}
              </div>
            ))}
             {Object.keys(studentsByClass).length > 0 && 
              Object.values(studentsByClass).every(list => list.length === 0) && 
              teacherProfile?.assignedClasses && teacherProfile.assignedClasses.length > 0 && (
                <p className="text-muted-foreground text-center py-4">No students currently registered in your assigned classes in local storage.</p>
            )}
             {Object.keys(studentsByClass).length === 0 && 
              teacherProfile?.assignedClasses && teacherProfile.assignedClasses.length > 0 && 
              !isLoading && ( 
              <p className="text-muted-foreground text-center py-4">Loading student data or no students found for your classes in local storage...</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-6 w-6 text-primary" /> School Announcements
            </CardTitle>
            <CardDescription>
              Latest updates from the administration (from Supabase).
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
                        {/* Link to a dedicated announcements page will need to be created later */}
                        <span className="cursor-not-allowed opacity-50">View All Announcements (Future Page)</span>
                        {/* <Link href="/teacher/announcements">View All Announcements</Link> */}
                    </Button>
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
