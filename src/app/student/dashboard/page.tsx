
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays, AlertCircle, UserCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { ANNOUNCEMENTS_KEY } from "@/lib/constants"; // CURRENTLY_LOGGED_IN_STUDENT_ID and REGISTERED_STUDENTS_KEY no longer used here
import { formatDistanceToNow } from "date-fns";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, type DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: "All" | "Students" | "Teachers";
  author: string;
  createdAt: string; // ISO string date
}

// This should match the structure in Firestore for a student document
interface StudentProfile {
  studentId: string; // 10-digit application ID
  authUid: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
  // any other fields stored in the student's Firestore document
}

export default function StudentDashboardPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!isMounted.current) return;
      if (user) {
        setFirebaseUser(user);
        // Fetch student profile from Firestore using user.uid
        const fetchStudentProfile = async () => {
          setIsLoadingStudentProfile(true);
          setError(null);
          try {
            const studentsRef = collection(db, "students");
            const q = query(studentsRef, where("authUid", "==", user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // Assuming one student profile per authUid
              const studentDoc = querySnapshot.docs[0];
              if (isMounted.current) {
                setStudentProfile({ id: studentDoc.id, ...studentDoc.data() } as StudentProfile);
              }
            } else {
              if (isMounted.current) {
                setError("Student profile not found in database for your account. Please contact administration.");
                console.warn("StudentDashboard: No student profile found for authUid:", user.uid);
              }
            }
          } catch (e: any) {
            console.error("StudentDashboard: Error fetching student profile:", e);
            if (isMounted.current) setError(`Failed to load student profile: ${e.message}`);
          } finally {
            if (isMounted.current) setIsLoadingStudentProfile(false);
          }
        };
        fetchStudentProfile();
      } else {
        // No user logged in via Firebase Auth
        if (isMounted.current) {
          setFirebaseUser(null);
          setStudentProfile(null);
          setError("You are not logged in. Please login to access the dashboard.");
          setIsLoadingStudentProfile(false);
        }
        router.push("/auth/student/login");
      }
    });

    // Load announcements (still from localStorage for now)
    if (typeof window !== 'undefined') {
      setIsLoadingAnnouncements(true);
      const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      const allAnnouncementsData: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
      const relevantAnnouncements = allAnnouncementsData.filter(
        ann => ann.target === "All" || ann.target === "Students"
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (isMounted.current) {
        setAnnouncements(relevantAnnouncements);
        setIsLoadingAnnouncements(false);
      }
    }
    
    return () => {
      isMounted.current = false;
      unsubscribeAuth();
    };
  }, [router]);

  const quickAccess = [
    { title: "View Results", href: "/student/results", icon: BookCheck, color: "text-blue-500" },
    { title: "Track Progress", href: "/student/progress", icon: BarChart2, color: "text-green-500" },
    { title: "School News", href: "/student/news", icon: Bell, color: "text-yellow-500" },
    { title: "My Timetable", href: "/student/timetable", icon: CalendarDays, color: "text-purple-500" },
  ];

  if (isLoadingStudentProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

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
  
  if (!firebaseUser || !studentProfile) {
     return ( // Should be caught by error state or loading state, but as a fallback
      <Card>
        <CardHeader><CardTitle>Loading or Not Authenticated</CardTitle></CardHeader>
        <CardContent><p>Please wait or log in.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">
        {studentProfile ? `Welcome, ${studentProfile.fullName}!` : "Student Dashboard"}
      </h2>
      <CardDescription>
        Your Student ID: {studentProfile.studentId} | Class: {studentProfile.gradeLevel}
      </CardDescription>
      
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
              Latest updates and notifications (Announcements from LocalStorage).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (
              <p className="text-muted-foreground">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No new announcements.</p>
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

    