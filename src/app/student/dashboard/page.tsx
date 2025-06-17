
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCheck, BarChart2, Bell, CalendarDays, AlertCircle, UserCircle as UserCircleIcon, Loader2, ClipboardCheck, UserCheck as UserCheckLucide, UserX, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, DAYS_OF_WEEK } from "@/lib/constants";
import { formatDistanceToNow, format } from "date-fns";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string;
}

interface StudentProfileFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  contact_email?: string;
}

interface AcademicResultFromSupabase {
  id: string;
  term: string;
  year: string;
  overall_grade?: string | null;
  overall_remarks?: string | null;
  published_at?: string | null;
  created_at: string;
}

interface TimetablePeriodFromSupabase {
  startTime: string;
  endTime: string;
  subjects: string[];
  classNames: string[];
}
interface TimetableEntryFromSupabase {
  id: string;
  teacher_id: string;
  day_of_week: string;
  periods: TimetablePeriodFromSupabase[];
  teachers: { full_name: string } | null; // Updated for join
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

interface AttendanceEntryFromSupabase {
  student_id_display: string;
  status: "present" | "absent" | "late";
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

  const [studentProfile, setStudentProfile] = useState<StudentProfileFromSupabase | null>(null);
  const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(true);

  const [recentResults, setRecentResults] = useState<AcademicResultFromSupabase[]>([]);
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
    let studentIdFromStorage: string | null = null;

    if (typeof window !== 'undefined') {
      studentIdFromStorage = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
    }

    if (!studentIdFromStorage) {
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
      if (!isMounted.current) return;
      setIsLoadingStudentProfile(true);
      setError(null);
      try {
        const { data: profileData, error: studentError } = await supabase
          .from('students')
          .select('student_id_display, full_name, grade_level, contact_email')
          .eq('student_id_display', currentStudentId)
          .single();

        if (studentError && studentError.code !== 'PGRST116') throw studentError;

        if (profileData) {
          if (isMounted.current) {
            setStudentProfile(profileData as StudentProfileFromSupabase);
            // Fetch related data only if profile is successfully loaded
            fetchRecentResultsFromSupabase(profileData.student_id_display);
            fetchStudentTimetableFromSupabase(profileData.grade_level);
            fetchAnnouncementsForStudent();
            fetchAttendanceSummaryForStudentFromSupabase(profileData.student_id_display);
          }
        } else {
          if (isMounted.current) {
            setError("Student profile not found. Please contact administration.");
            setIsLoadingResults(false); // Ensure other loaders are also stopped
            setIsLoadingTimetable(false);
            setIsLoadingAnnouncements(false);
            setIsLoadingAttendanceSummary(false);
          }
        }
      } catch (e: any) {
        console.error("StudentDashboard: Error fetching student profile:", e);
        if (isMounted.current) setError(`Failed to load student profile: ${e.message}`);
        // Ensure other loaders are stopped on error
        setIsLoadingResults(false);
        setIsLoadingTimetable(false);
        setIsLoadingAnnouncements(false);
        setIsLoadingAttendanceSummary(false);
      } finally {
        if (isMounted.current) setIsLoadingStudentProfile(false);
      }
    };

    fetchStudentProfileAndRelatedData(studentIdFromStorage);

    return () => {
      isMounted.current = false;
    };
  }, [router, supabase]); // Added supabase to dependency array

  const fetchAnnouncementsForStudent = async () => {
    if (!isMounted.current || !supabase) return; // Check for supabase client
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
      console.error("Error fetching announcements:", e);
      if (isMounted.current) setAnnouncementsError(`Failed to load announcements: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingAnnouncements(false);
    }
  };

  const fetchRecentResultsFromSupabase = async (studentId: string) => {
    if (!isMounted.current || !supabase) return;
    setIsLoadingResults(true);
    setResultsError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('academic_results')
        .select('id, term, year, overall_grade, overall_remarks, published_at, created_at')
        .eq('student_id_display', studentId)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (fetchError) throw fetchError;
      if (isMounted.current) setRecentResults(data as AcademicResultFromSupabase[] || []);
    } catch (e: any) {
      let errorToLog: any = e;
      let userMessage = "An unexpected error occurred while fetching recent results.";

      if (e && typeof e === 'object') {
        if (e.message && typeof e.message === 'string' && e.message.trim() !== "") {
          userMessage = e.message;
        } else if (Object.keys(e).length === 0) {
          errorToLog = "StudentDashboard: Caught an empty error object fetching results. This could be due to RLS policies or the 'academic_results' table being inaccessible or empty with restrictive RLS. Ensure the student has SELECT permissions.";
          userMessage = "Could not fetch recent results. This might be due to access permissions (RLS), no results being available, or a network issue. Please check console for details.";
        } else {
          try {
            const stringifiedError = JSON.stringify(e);
            errorToLog = `StudentDashboard: Non-standard error object: ${stringifiedError}`;
            userMessage = `A non-standard error occurred fetching results: ${stringifiedError.substring(0, 100)}${stringifiedError.length > 100 ? '...' : ''}`;
          } catch (stringifyError) {
            errorToLog = "StudentDashboard: A non-standard, unstringifiable error object was received.";
            userMessage = "A non-standard, unstringifiable error occurred fetching results. Check console.";
          }
        }
      } else if (typeof e === 'string' && e.trim() !== "") {
        userMessage = e;
      }
      
      console.error(errorToLog);
      if (e?.stack) {
        console.error("Stack trace:", e.stack);
      }

      if (isMounted.current) setResultsError(`Failed to load recent results: ${userMessage}.`);
    } finally {
      if (isMounted.current) setIsLoadingResults(false);
    }
  };

  const fetchStudentTimetableFromSupabase = async (studentGradeLevel: string) => {
    if (!isMounted.current || !supabase) return;
    setIsLoadingTimetable(true);
    setTimetableError(null);
    try {
      const { data: allTimetableEntries, error: fetchError } = await supabase
        .from('timetable_entries')
        .select('id, teacher_id, day_of_week, periods, teachers ( full_name )'); 

      if (fetchError) throw fetchError;

      const relevantTimetable: StudentTimetable = {};
      (allTimetableEntries || []).forEach((entry: TimetableEntryFromSupabase) => { // Type entry
        const studentPeriodsForDay: StudentTimetablePeriod[] = [];
        const teacherName = entry.teachers?.full_name || "N/A";

        (entry.periods as TimetablePeriodFromSupabase[]).forEach((period: TimetablePeriodFromSupabase) => {
          if (period.classNames && period.classNames.includes(studentGradeLevel)) {
            studentPeriodsForDay.push({
              startTime: period.startTime,
              endTime: period.endTime,
              subjects: period.subjects || [],
              teacherName: teacherName,
            });
          }
        });

        if (studentPeriodsForDay.length > 0) {
          if (!relevantTimetable[entry.day_of_week]) {
            relevantTimetable[entry.day_of_week] = [];
          }
          relevantTimetable[entry.day_of_week].push(...studentPeriodsForDay);
          relevantTimetable[entry.day_of_week].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
      });
      if (isMounted.current) setStudentTimetable(relevantTimetable);
    } catch (e: any) {
      let errorToLog: any = e;
      let userMessage = "An unexpected error occurred while fetching the timetable.";

      if (e && typeof e === 'object') {
        if (e.message && typeof e.message === 'string' && e.message.trim() !== "") {
          userMessage = e.message;
        } else if (Object.keys(e).length === 0) {
          errorToLog = "StudentDashboard: Caught an empty error object fetching timetable. This could be due to RLS policies on 'timetable_entries' or 'teachers', or one of the tables being inaccessible or empty with restrictive RLS. Ensure the student has SELECT permissions on these tables/views.";
          userMessage = "Could not fetch timetable. This might be due to access permissions (RLS), no timetable being available for your class, or a network issue. Please check console for details.";
        } else {
          try {
            const stringifiedError = JSON.stringify(e);
            errorToLog = `StudentDashboard: Non-standard error object fetching timetable: ${stringifiedError}`;
            userMessage = `A non-standard error occurred fetching timetable: ${stringifiedError.substring(0, 100)}${stringifiedError.length > 100 ? '...' : ''}`;
          } catch (stringifyError) {
            errorToLog = "StudentDashboard: A non-standard, unstringifiable error object was received fetching timetable.";
            userMessage = "A non-standard, unstringifiable error occurred fetching timetable. Check console.";
          }
        }
      } else if (typeof e === 'string' && e.trim() !== "") {
        userMessage = e;
      }
      
      console.error(errorToLog);
      if (e?.stack) {
        console.error("Stack trace for timetable error:", e.stack);
      }
      if (isMounted.current) setTimetableError(`Failed to load timetable: ${userMessage}.`);
    } finally {
      if (isMounted.current) setIsLoadingTimetable(false);
    }
  };

  const fetchAttendanceSummaryForStudentFromSupabase = async (studentIdDisplay: string) => {
    if (!isMounted.current || !supabase) return;
    setIsLoadingAttendanceSummary(true);
    setAttendanceSummaryError(null);
    try {
      const { data: attendanceData, error: fetchError } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id_display', studentIdDisplay);

      if (fetchError) throw fetchError;

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      (attendanceData as AttendanceEntryFromSupabase[] || []).forEach(entry => {
        if (entry.status === "present") presentCount++;
        else if (entry.status === "absent") absentCount++;
        else if (entry.status === "late") lateCount++;
      });

      if (isMounted.current) {
        setAttendanceSummary({ present: presentCount, absent: absentCount, late: lateCount });
      }
    } catch (e: any) {
      console.error("StudentDashboard: Error fetching attendance summary:", e);
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

  if (error) { // This error is primarily for student profile loading / auth
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

  if (!studentProfile) { // Fallback if profile is null after loading and no primary error
     return (
      <Card>
        <CardHeader><CardTitle>Profile Not Loaded</CardTitle></CardHeader>
        <CardContent>
          <p>Your student profile could not be loaded. Please ensure you are logged in correctly or contact administration.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">
        {`Welcome, ${studentProfile.full_name}!`}
      </h2>
      <CardDescription>
        Your Student ID: {studentProfile.student_id_display} | Class: {studentProfile.grade_level}
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
                Overview of your attendance record from Supabase.
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
                Summary of your latest overall academic results from Supabase.
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
                        {(item.published_at || item.created_at) && (
                            <CardDescription className="text-xs">
                                Published: {format(new Date(item.published_at || item.created_at), "PPP")}
                            </CardDescription>
                        )}
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-1">
                        {item.overall_grade && (
                            <p className="text-sm">
                                <strong>Overall Grade:</strong> <span className="font-medium text-primary">{item.overall_grade}</span>
                            </p>
                        )}
                        {item.overall_remarks && (
                            <p className="text-sm text-muted-foreground">
                            <strong>Remarks:</strong> <span className="italic line-clamp-2">{item.overall_remarks}</span>
                            </p>
                        )}
                        {!item.overall_grade && !item.overall_remarks && (
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
              Latest updates and notifications from Supabase.
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
                Your weekly class schedule from Supabase.
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

    