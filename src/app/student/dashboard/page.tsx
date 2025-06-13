
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays, AlertCircle, UserCircle, Loader2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
// PlaceholderContent removed as we are implementing the section
import { ANNOUNCEMENTS_KEY, CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { formatDistanceToNow, format } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp, type DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: "All" | "Students" | "Teachers";
  author: string;
  createdAt: string; // ISO string date
}

interface StudentProfile {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  contactEmail?: string;
}

interface GradedAssignmentItem {
  id: string;
  assignmentTitle: string;
  grade?: string;
  teacherFeedback?: string;
  gradedAt?: Date; // Firestore Timestamp will be converted to Date
}

export default function StudentDashboardPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(true);
  
  const [recentGrades, setRecentGrades] = useState<GradedAssignmentItem[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(true);
  const [gradesError, setGradesError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let studentId: string | null = null;

    if (typeof window !== 'undefined') {
      studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
    }

    if (!studentId) {
      if (isMounted.current) {
        setError("You are not logged in. Please login to access the dashboard.");
        setIsLoadingStudentProfile(false);
        setIsLoadingGrades(false); // Also stop loading grades
      }
      router.push("/auth/student/login");
      return;
    }

    const fetchStudentProfileAndGrades = async (currentStudentId: string) => {
      if (!isMounted.current) return;
      setIsLoadingStudentProfile(true);
      setError(null);
      try {
        const studentDocRef = doc(db, "students", currentStudentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (studentDocSnap.exists()) {
          const profileData = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as StudentProfile;
          if (isMounted.current) {
            setStudentProfile(profileData);
            // Now fetch grades since profile is loaded
            fetchRecentGrades(profileData.studentId);
          }
        } else {
          if (isMounted.current) {
            setError("Student profile not found in database. Please contact administration.");
            console.warn("StudentDashboard: No student profile found for studentId:", currentStudentId);
            setIsLoadingGrades(false); // Stop loading grades if profile not found
          }
        }
      } catch (e: any) {
        console.error("StudentDashboard: Error fetching student profile:", e);
        if (isMounted.current) setError(`Failed to load student profile: ${e.message}`);
        setIsLoadingGrades(false); // Stop loading grades on error
      } finally {
        if (isMounted.current) setIsLoadingStudentProfile(false);
      }
    };
    
    fetchStudentProfileAndGrades(studentId);

    // Load announcements (still from localStorage)
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
    };
  }, [router]);

  const fetchRecentGrades = async (studentId: string) => {
    if (!isMounted.current) return;
    setIsLoadingGrades(true);
    setGradesError(null);
    try {
      const submissionsQuery = query(
        collection(db, "assignmentSubmissions"),
        where("studentId", "==", studentId),
        where("graded", "==", true), // Only fetch items marked as graded
        orderBy("gradedAt", "desc"),
        limit(3) // Show top 3 recent graded items
      );
      const querySnapshot = await getDocs(submissionsQuery);
      const fetchedGrades = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          assignmentTitle: data.assignmentTitle || "Untitled Assignment",
          grade: data.grade,
          teacherFeedback: data.teacherFeedback,
          gradedAt: data.gradedAt instanceof Timestamp ? data.gradedAt.toDate() : undefined,
        } as GradedAssignmentItem;
      });
      if (isMounted.current) setRecentGrades(fetchedGrades);
    } catch (e: any) {
      console.error("StudentDashboard: Error fetching recent grades:", e);
      if (isMounted.current) setGradesError(`Failed to load recent grades: ${e.message}. Check Firestore rules for 'assignmentSubmissions'.`);
    } finally {
      if (isMounted.current) setIsLoadingGrades(false);
    }
  };

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
  
  if (!studentProfile) {
     return ( 
      <Card>
        <CardHeader><CardTitle>Loading or Not Authenticated</CardTitle></CardHeader>
        <CardContent>
          <p>Please wait or log in with your Student ID.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">
        {`Welcome, ${studentProfile.fullName}!`}
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
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center">
                <ClipboardCheck className="mr-2 h-6 w-6 text-primary" /> Recent Grades & Feedback
                </CardTitle>
                <CardDescription>
                Your latest graded assignments and feedback.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingGrades ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading recent grades...</span>
                    </div>
                ) : gradesError ? (
                    <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 " /> {gradesError}
                    </div>
                ) : recentGrades.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent grades or feedback found.</p>
                ) : (
                <div className="space-y-4">
                    {recentGrades.map((item) => (
                    <Card key={item.id} className="bg-secondary/30">
                        <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-md font-semibold">{item.assignmentTitle}</CardTitle>
                        {item.gradedAt && (
                            <CardDescription className="text-xs">
                                Graded: {format(item.gradedAt, "PPP")}
                            </CardDescription>
                        )}
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-1">
                        {item.grade && (
                            <p className="text-sm">
                                <strong>Grade:</strong> <span className="font-medium text-primary">{item.grade}</span>
                            </p>
                        )}
                        {item.teacherFeedback && (
                            <p className="text-sm text-muted-foreground">
                            <strong>Feedback:</strong> <span className="italic line-clamp-2">{item.teacherFeedback}</span>
                            </p>
                        )}
                        {!item.grade && !item.teacherFeedback && (
                            <p className="text-sm text-muted-foreground italic">No grade or feedback provided yet.</p>
                        )}
                        </CardContent>
                        {/* Optional: Link to full assignment/submission details */}
                        {/* <CardFooter className="px-4 py-2 border-t">
                            <Button variant="link" size="sm" className="p-0 h-auto text-accent">View Details</Button>
                        </CardFooter> */}
                    </Card>
                    ))}
                </div>
                )}
                {recentGrades.length > 0 && (
                    <div className="mt-4 text-center">
                        <Button variant="link" size="sm" asChild>
                            <Link href="/student/results">View All Results</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

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
      </div>

       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-6 w-6 text-primary" /> Upcoming Deadlines & Events
            </CardTitle>
            <CardDescription>
                Important dates for assignments, exams, and school events. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground text-center py-6">Upcoming deadlines and events will be displayed here.</p>
          </CardContent>
        </Card>
    </div>
  );
}
    
