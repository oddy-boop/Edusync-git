
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
import { Button } from "@/components/ui/button";
import { CalendarCheck2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface StudentProfile {
  student_id_display: string; 
  full_name: string;
  grade_level: string;
  school_id: number;
}

interface AttendanceEntryFromSupabase {
  id: string; 
  student_id_display: string;
  student_name: string;
  class_id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  status: "present" | "absent" | "late"; 
  notes: string | null;
  marked_by_teacher_name: string;
  created_at: string; 
}


export default function StudentAttendancePage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntryFromSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    
  async function loadData() {
    if (authLoading) return; // wait for AuthProvider to resolve
    if (!isMounted.current || !user) {
      setError("Student not authenticated. Please log in.");
      setIsLoading(false);
      return;
    }

        try {
            const { data: profile, error: profileError } = await supabase.from('students').select('student_id_display, full_name, grade_level, school_id').eq('auth_user_id', user.id).single();
            if(profileError) throw profileError;
            if(!profile) throw new Error("Student profile not found.");

            setStudentProfile(profile as StudentProfile);

            const { data: settingsData } = await supabase.from('schools').select('current_academic_year').eq('id', profile.school_id).maybeSingle();
            const rawYear = settingsData?.current_academic_year;
            const acadRegex = /^(\d{4})-(\d{4})$/;
            let startYear: number;
            let endYear: number;
            if (typeof rawYear === 'string' && acadRegex.test(rawYear)) {
              const m = rawYear.match(acadRegex)!;
              startYear = parseInt(m[1], 10);
              endYear = parseInt(m[2], 10);
            } else {
              const now = new Date().getFullYear();
              startYear = now;
              endYear = now + 1;
            }
            if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
              const now = new Date().getFullYear();
              startYear = now;
              endYear = now + 1;
            }
            const academicYearStartDate = `${startYear}-08-01`;
            const academicYearEndDate = `${endYear}-07-31`;

            const { data: attendance, error: fetchError } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('student_id_display', profile.student_id_display)
                .gte('date', academicYearStartDate)
                .lte('date', academicYearEndDate)
                .order('date', { ascending: false });
            
            if(fetchError) throw fetchError;
            setAttendanceHistory(attendance as AttendanceEntryFromSupabase[]);
        } catch(e:any) {
            setError(e.message);
        } finally {
            if(isMounted.current) setIsLoading(false);
        }
    }

    loadData();

    return () => { isMounted.current = false; };
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your attendance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Please log in") && (
             <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!studentProfile) {
     return ( 
      <Card>
        <CardHeader><CardTitle>Student Not Found</CardTitle></CardHeader>
        <CardContent><p>Please log in with your account.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <CalendarCheck2 className="mr-3 h-8 w-8" /> My Attendance Record
        </h2>
         <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
            <p><strong>Student:</strong> {studentProfile.full_name} ({studentProfile.student_id_display})</p>
            <p><strong>Class:</strong> {studentProfile.grade_level}</p>
        </div>
      </div>
      <CardDescription>
        View your daily attendance history as recorded by your teachers for the current academic year.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records found for you in the current academic year.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Marked By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date + "T00:00:00"), "PPP")}</TableCell>
                      <TableCell>{entry.class_id}</TableCell>
                      <TableCell>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            entry.status === "present" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                            entry.status === "absent" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                            entry.status === "late" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        )}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{entry.notes || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{entry.marked_by_teacher_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
