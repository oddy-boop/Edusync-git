
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
import { User, BookUser, Users, UserCheck as UserCheckIcon, Brain, Bell, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore"; // Added collection and getDocs
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { formatDistanceToNow } from "date-fns";
import { ANNOUNCEMENTS_KEY } from "@/lib/constants";
import { useRouter } from "next/navigation";

// Firestore teacher profile
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role: string;
}

// Student data structure from Firestore
interface RegisteredStudent {
  studentId: string; // Document ID from Firestore
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const unsubscribeAuthState = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;

      if (user) {
        if (isMounted.current) setCurrentUser(user);
        try {
          const teacherDocRef = doc(db, "teachers", user.uid);
          const teacherDocSnap = await getDoc(teacherDocRef);

          if (teacherDocSnap.exists()) {
            const profileData = teacherDocSnap.data() as TeacherProfile;
            if (isMounted.current) setTeacherProfile(profileData);

            // Fetch students from Firestore
            let allStudents: RegisteredStudent[] = [];
            try {
              const studentsCollectionRef = collection(db, "students");
              const studentSnapshots = await getDocs(studentsCollectionRef);
              allStudents = studentSnapshots.docs.map(docSnap => ({
                studentId: docSnap.id,
                ...(docSnap.data() as Omit<RegisteredStudent, 'studentId'>)
              }));
            } catch (studentError) {
              console.error("Error fetching students from Firestore:", studentError);
              if (isMounted.current) setError(prev => prev ? `${prev} Failed to load student data.` : "Failed to load student data.");
            }
            
            const filteredStudents: Record<string, RegisteredStudent[]> = {};
            if (profileData.assignedClasses && Array.isArray(profileData.assignedClasses)) {
              profileData.assignedClasses.forEach(className => {
                filteredStudents[className] = allStudents.filter(student => student.gradeLevel === className);
              });
            }
            if (isMounted.current) setStudentsByClass(filteredStudents);

          } else {
            if (isMounted.current) setError("Teacher profile not found in database.");
            console.error("Teacher profile not found for UID:", user.uid);
          }

          // Load announcements from localStorage (to be migrated)
          const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
          const allAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
          const relevantAnnouncements = allAnnouncements.filter(
            ann => ann.target === "All" || ann.target === "Teachers"
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (isMounted.current) setAnnouncements(relevantAnnouncements);

        } catch (e) {
          console.error("Error fetching teacher profile, students or announcements:", e);
          if (isMounted.current) setError(prev => prev ? `${prev} Failed to load dashboard data.` : "Failed to load dashboard data.");
        }
      } else {
        if (isMounted.current) {
          setCurrentUser(null);
          setTeacherProfile(null);
          setError("Not authenticated. Please login.");
        }
        router.push("/auth/teacher/login");
      }
      if (isMounted.current) setIsLoading(false);
    });

    return () => {
      isMounted.current = false;
      unsubscribeAuthState();
    };
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !teacherProfile && !isLoading) { // Prioritize showing login if not authenticated, then other errors
    return (
       <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Access Denied or Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          {error.includes("Not authenticated") && (
            <Button asChild className="mt-4">
              <Link href="/auth/teacher/login">Go to Login</Link>
            </Button>
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
          <p>Could not load teacher profile. This might be due to a missing profile in the database or a connection issue.</p>
          <p className="mt-2">If you are a new teacher, your profile might still be pending setup. Otherwise, please try logging in again or contact support.</p>
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
        Welcome, {teacherProfile?.fullName || currentUser?.email}!
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
              Overview of students in your assigned classes, loaded from Firestore.
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
                          <TableHead>Student ID</TableHead>
                          <TableHead>Guardian Name</TableHead>
                          <TableHead>Guardian Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsByClass[className].map((student) => (
                          <TableRow key={student.studentId}>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                            <TableCell>{student.guardianName}</TableCell>
                            <TableCell>{student.guardianContact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No students found for {className} in Firestore, or data is still loading.</p>
                )}
              </div>
            ))}
             {Object.keys(studentsByClass).length > 0 && 
              Object.values(studentsByClass).every(list => list.length === 0) && 
              teacherProfile?.assignedClasses && teacherProfile.assignedClasses.length > 0 && (
                <p className="text-muted-foreground text-center py-4">No students currently registered in your assigned classes in Firestore.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-6 w-6 text-primary" /> School Announcements
            </CardTitle>
            <CardDescription>
              Latest updates from the administration. (Announcements currently from LocalStorage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No new announcements found.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.slice(0, 5).map(ann => (
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

    