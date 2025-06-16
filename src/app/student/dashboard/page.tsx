
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays, AlertCircle, UserCircle as UserCircleIcon, Loader2, ClipboardCheck, UserCheck as UserCheckLucide, UserX, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, DAYS_OF_WEEK, REGISTERED_STUDENTS_KEY, ACADEMIC_RESULTS_KEY, TIMETABLE_ENTRIES_KEY, REGISTERED_TEACHERS_KEY, ATTENDANCE_ENTRIES_KEY } from "@/lib/constants";
import { formatDistanceToNow, format } from "date-fns";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

interface StudentAnnouncement {
  id: string; // UUID
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string; // ISO string date
}

// LocalStorage student profile structure
interface StudentProfile {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  contactEmail?: string;
}

// LocalStorage structure for academic results
interface AcademicResultEntry {
  id: string;
  studentId: string;
  classId: string;
  studentName: string;
  term: string;
  year: string;
  subjectResults: Array<{ subjectName: string; score?: string; grade: string; remarks?: string; }>;
  overallAverage?: string;
  overallGrade?: string;
  overallRemarks?: string;
  teacherId: string;
  teacherName: string;
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
  publishedAt?: string; // ISO Date String
}

interface RecentResultSummaryItem {
  id: string;
  term: string;
  year: string;
  overallGrade?: string;
  overallRemarks?: string;
  publishedAt?: string; // or createdAt
}

// LocalStorage structure for timetable entries
interface TimetableEntryPeriod {
  startTime: string;
  endTime: string;
  subjects: string[];
  classNames: string[];
}
interface TimetableEntry {
  id: string; // teacherId_dayOfWeek
  teacherId: string;
  dayOfWeek: string;
  periods: TimetableEntryPeriod[];
  createdAt: string;
  updatedAt?: string;
}

interface TeacherProfileForTimetable {
  uid: string;
  fullName: string;
}

interface StudentTimetablePeriod {
  startTime: string;
  endTime: string;
  subjects: string[];
  teacherName: string;
}

interface StudentTimetable {
  [day: string]: StudentTimetablePeriod[];
}

interface AttendanceEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  status: "present" | "absent" | "late" | "unmarked";
  notes: string;
  markedByTeacherName: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
}

export default function StudentDashboardPage() {
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(true);
  
  const [recentResults, setRecentResults] = useState<RecentResultSummaryItem[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const [studentTimetable, setStudentTimetable] = useState<StudentTimetable>({});
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(true);
  const [timetableError, setTimetableError] = useState<string | null>(null);

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({ present: 0, absent: 0, late: 0 });
  const [isLoadingAttendanceSummary, setIsLoadingAttendanceSummary] = useState(true);
  const [attendanceSummaryError, setAttendanceSummaryError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isMounted = useRef(true);
  const supabase = getSupabase();

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
        setIsLoadingResults(false); 
        setIsLoadingTimetable(false);
        setIsLoadingAnnouncements(false);
        setIsLoadingAttendanceSummary(false);
      }
      router.push("/auth/student/login");
      return;
    }

    const fetchStudentProfileAndRelatedData = async (currentStudentId: string) => {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoadingStudentProfile(true);
      setError(null);
      try {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: StudentProfile[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const profileData = allStudents.find(s => s.studentId === currentStudentId);

        if (profileData) {
          if (isMounted.current) {
            setStudentProfile(profileData);
            fetchRecentResultsFromLocalStorage(profileData.studentId);
            fetchStudentTimetableFromLocalStorage(profileData.gradeLevel);
            fetchAnnouncementsForStudent();
            fetchAttendanceSummaryForStudent(profileData.studentId);
          }
        } else {
          if (isMounted.current) {
            setError("Student profile not found in local records. Please contact administration.");
            setIsLoadingResults(false); 
            setIsLoadingTimetable(false);
            setIsLoadingAnnouncements(false);
            setIsLoadingAttendanceSummary(false);
          }
        }
      } catch (e: any) {
        console.error("StudentDashboard: Error fetching student profile from localStorage:", e);
        if (isMounted.current) setError(`Failed to load student profile: ${e.message}`);
        setIsLoadingResults(false); 
        setIsLoadingTimetable(false);
        setIsLoadingAnnouncements(false);
        setIsLoadingAttendanceSummary(false);
      } finally {
        if (isMounted.current) setIsLoadingStudentProfile(false);
      }
    };
    
    fetchStudentProfileAndRelatedData(studentId);
    
    return () => {
      isMounted.current = false;
    };
  }, [router, supabase]);

  const fetchAnnouncementsForStudent = async () => {
      if (!isMounted.current) return;
      setIsLoadingAnnouncements(true);
      setAnnouncementsError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('school_announcements')
          .select('id, title, message, target_audience, author_name, created_at')
          .or('target_audience.eq.All,target_audience.eq.Students')
          .order('created_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        if (isMounted.current) setAnnouncements(data as StudentAnnouncement[] || []);

      } catch (e: any) {
        console.error("Error fetching announcements from Supabase for student:", e);
        if (isMounted.current) setAnnouncementsError(`Failed to load announcements: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoadingAnnouncements(false);
      }
  };


  const fetchRecentResultsFromLocalStorage = async (studentId: string) => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setIsLoadingResults(true);
    setResultsError(null);
    try {
      const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
      const allResults: AcademicResultEntry[] = resultsRaw ? JSON.parse(resultsRaw) : [];
      
      const studentResults = allResults
        .filter(r => r.studentId === studentId)
        .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
        .slice(0, 3);

      const fetchedSummaries: RecentResultSummaryItem[] = studentResults.map(r => ({
        id: r.id,
        term: r.term,
        year: r.year,
        overallGrade: r.overallGrade,
        overallRemarks: r.overallRemarks,
        publishedAt: r.publishedAt || r.createdAt,
      }));
      
      if (isMounted.current) setRecentResults(fetchedSummaries);
    } catch (e: any) {
      console.error("StudentDashboard: Error fetching recent results from localStorage:", e);
      if (isMounted.current) setResultsError(`Failed to load recent results: ${e.message}.`);
    } finally {
      if (isMounted.current) setIsLoadingResults(false);
    }
  };

  const fetchStudentTimetableFromLocalStorage = async (studentGradeLevel: string) => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setIsLoadingTimetable(true);
    setTimetableError(null);
    try {
      const timetableEntriesRaw = localStorage.getItem(TIMETABLE_ENTRIES_KEY);
      const allTimetableEntries: TimetableEntry[] = timetableEntriesRaw ? JSON.parse(timetableEntriesRaw) : [];
      
      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY); // Assuming this key exists and is populated
      const allTeachers: TeacherProfileForTimetable[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const teacherMap = new Map(allTeachers.map(t => [t.uid, t.fullName]));

      const relevantTimetable: StudentTimetable = {};

      allTimetableEntries.forEach((entry) => {
        const studentPeriodsForDay: StudentTimetablePeriod[] = [];
        entry.periods.forEach((period: TimetableEntryPeriod) => {
          if (period.classNames && period.classNames.includes(studentGradeLevel)) {
            studentPeriodsForDay.push({
              startTime: period.startTime,
              endTime: period.endTime,
              subjects: period.subjects || [],
              teacherName: teacherMap.get(entry.teacherId) || "N/A",
            });
          }
        });

        if (studentPeriodsForDay.length > 0) {
          if (!relevantTimetable[entry.dayOfWeek]) {
            relevantTimetable[entry.dayOfWeek] = [];
          }
          relevantTimetable[entry.dayOfWeek].push(...studentPeriodsForDay);
          relevantTimetable[entry.dayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
      });
      if (isMounted.current) setStudentTimetable(relevantTimetable);
    } catch (e: any) {
      console.error("StudentDashboard: Error fetching timetable from localStorage:", e);
      if (isMounted.current) setTimetableError(`Failed to load timetable: ${e.message}.`);
    } finally {
      if (isMounted.current) setIsLoadingTimetable(false);
    }
  };

  const fetchAttendanceSummaryForStudent = async (studentId: string) => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setIsLoadingAttendanceSummary(true);
    setAttendanceSummaryError(null);
    try {
      const attendanceEntriesRaw = localStorage.getItem(ATTENDANCE_ENTRIES_KEY);
      const allEntries: AttendanceEntry[] = attendanceEntriesRaw ? JSON.parse(attendanceEntriesRaw) : [];
      
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      allEntries.forEach(entry => {
        if (entry.studentId === studentId) {
          if (entry.status === "present") presentCount++;
          else if (entry.status === "absent") absentCount++;
          else if (entry.status === "late") lateCount++;
        }
      });
      
      if (isMounted.current) {
        setAttendanceSummary({ present: presentCount, absent: absentCount, late: lateCount });
      }
    } catch (e: any) {
      console.error("StudentDashboard: Error fetching attendance summary from localStorage:", e);
      if (isMounted.current) setAttendanceSummaryError(`Failed to load attendance summary: ${e.message}.`);
    } finally {
      if (isMounted.current) setIsLoadingAttendanceSummary(false);
    }
  };

  const quickAccess = [
    { title: "View Results", href: "/student/results", icon: BookCheck, color: "text-blue-500" },
    { title: "Track Progress", href: "/student/progress", icon: BarChart2, color: "text-green-500" },
    { title: "School News", href: "/student/news", icon: Bell, color: "text-yellow-500" },
    { title: "My Attendance", href: "/student/attendance", icon: UserCheckLucide, color: "text-indigo-500" },
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

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center">
                <UserCheckLucide className="mr-2 h-6 w-6 text-primary" /> My Attendance Summary
            </CardTitle>
            <CardDescription>
                Overview of your attendance record from LocalStorage.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingAttendanceSummary ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading attendance summary...</span>
                </div>
            ) : attendanceSummaryError ? (
                <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 " /> {attendanceSummaryError}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-green-100 dark:bg-green-900/30">
                        <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center"><UserCheckLucide className="mr-2 h-4 w-4"/>Days Present</CardTitle></CardHeader>
                        <CardContent className="px-4 pb-3"><p className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceSummary.present}</p></CardContent>
                    </Card>
                    <Card className="bg-red-100 dark:bg-red-900/30">
                        <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center"><UserX className="mr-2 h-4 w-4"/>Days Absent</CardTitle></CardHeader>
                        <CardContent className="px-4 pb-3"><p className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceSummary.absent}</p></CardContent>
                    </Card>
                    <Card className="bg-yellow-100 dark:bg-yellow-900/30">
                        <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center"><Clock className="mr-2 h-4 w-4"/>Days Late</CardTitle></CardHeader>
                        <CardContent className="px-4 pb-3"><p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{attendanceSummary.late}</p></CardContent>
                    </Card>
                </div>
            )}
             <div className="mt-4 text-center">
                <Button variant="link" size="sm" asChild>
                    <Link href="/student/attendance">View Detailed Attendance Log</Link>
                </Button>
            </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center">
                <ClipboardCheck className="mr-2 h-6 w-6 text-primary" /> Recent Results Summary
                </CardTitle>
                <CardDescription>
                Summary of your latest overall academic results (from LocalStorage).
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingResults ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading recent results...</span>
                    </div>
                ) : resultsError ? (
                    <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 " /> {resultsError}
                    </div>
                ) : recentResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent results summary found.</p>
                ) : (
                <div className="space-y-4">
                    {recentResults.map((item) => (
                    <Card key={item.id} className="bg-secondary/30">
                        <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-md font-semibold">{item.term} - {item.year}</CardTitle>
                        {item.publishedAt && (
                            <CardDescription className="text-xs">
                                Published: {format(new Date(item.publishedAt), "PPP")}
                            </CardDescription>
                        )}
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-1">
                        {item.overallGrade && (
                            <p className="text-sm">
                                <strong>Overall Grade:</strong> <span className="font-medium text-primary">{item.overallGrade}</span>
                            </p>
                        )}
                        {item.overallRemarks && (
                            <p className="text-sm text-muted-foreground">
                            <strong>Remarks:</strong> <span className="italic line-clamp-2">{item.overallRemarks}</span>
                            </p>
                        )}
                        {!item.overallGrade && !item.overallRemarks && (
                            <p className="text-sm text-muted-foreground italic">No overall grade or remarks provided yet.</p>
                        )}
                        </CardContent>
                    </Card>
                    ))}
                </div>
                )}
                {recentResults.length > 0 && (
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
              Latest updates and notifications (from Supabase).
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
              <p className="text-muted-foreground text-center py-4">No new announcements.</p>
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
                <CalendarDays className="mr-2 h-6 w-6 text-primary" /> My Timetable
            </CardTitle>
            <CardDescription>
                Your weekly class schedule (from LocalStorage).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTimetable ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    Loading timetable...
                </div>
            ) : timetableError ? (
                <div className="text-destructive text-center py-6">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    {timetableError}
                </div>
            ) : Object.keys(studentTimetable).length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                    Your timetable is not available yet or no classes scheduled for you. Please check back later.
                </p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                    {DAYS_OF_WEEK.map((day) => (
                        studentTimetable[day] && studentTimetable[day].length > 0 && (
                        <Card key={day} className="bg-background shadow-md">
                            <CardHeader className="bg-secondary/30 py-3 px-4 rounded-t-md">
                            <CardTitle className="text-lg font-semibold text-primary">{day}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                            {studentTimetable[day].map((period, index) => (
                                <div key={index} className="p-3 bg-primary/5 rounded-md border border-primary/10">
                                <p className="font-semibold text-primary">
                                    {period.startTime} - {period.endTime}
                                </p>
                                <p className="text-sm text-foreground">
                                    Subject: {period.subjects.join(', ')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Teacher: {period.teacherName}
                                </p>
                                </div>
                            ))}
                            </CardContent>
                        </Card>
                        )
                    ))}
                </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
    
