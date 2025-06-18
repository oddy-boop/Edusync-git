
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
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants"; 
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

// Student data structure from Supabase 'students' table
interface RegisteredStudentFromSupabase {
  student_id_display: string; 
  full_name: string;
  grade_level: string;
}

// Structure of an attendance entry from Supabase 'attendance_records' table
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
  const [loggedInStudent, setLoggedInStudent] = useState<RegisteredStudentFromSupabase | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntryFromSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast(); 
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();
    
    async function fetchStudentDataAndAttendance() {
      if (!isMounted.current || typeof window === 'undefined' || !supabaseRef.current) return;
      setIsLoading(true);
      setError(null);

      let studentIdDisplay: string | null = null;
      studentIdDisplay = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      
      if (!studentIdDisplay) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view attendance.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch student profile from Supabase 'students' table
        const { data: studentData, error: studentError } = await supabaseRef.current
            .from("students")
            .select("student_id_display, full_name, grade_level")
            .eq("student_id_display", studentIdDisplay)
            .single();

        if (studentError && studentError.code !== 'PGRST116') throw studentError; // PGRST116 = no rows, handle as not found
        if (!studentData) {
          if (isMounted.current) {
            setError("Student profile not found in Supabase records. Please contact administration.");
            setIsLoading(false);
          }
          return;
        }
        if (isMounted.current) setLoggedInStudent(studentData as RegisteredStudentFromSupabase);

        // Fetch attendance records for this student from Supabase 'attendance_records' table
        const { data: fetchedAttendance, error: attendanceError } = await supabaseRef.current
          .from('attendance_records')
          .select('*')
          .eq('student_id_display', studentIdDisplay)
          .order('date', { ascending: false });
        
        if (attendanceError) throw attendanceError;
        
        if (isMounted.current) setAttendanceHistory(fetchedAttendance as AttendanceEntryFromSupabase[] || []);

      } catch (e: any) {
        console.error("Error fetching student data or attendance from Supabase:", e);
        if (isMounted.current) setError(`Failed to load data from Supabase: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchStudentDataAndAttendance();

    return () => {
      isMounted.current = false;
    };
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your attendance records from Supabase...</p>
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
  
  if (!loggedInStudent) { // Should be caught by error, but as a fallback
     return ( 
      <Card>
        <CardHeader><CardTitle>Student Not Found</CardTitle></CardHeader>
        <CardContent><p>Please log in with your Student ID.</p>
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
         {loggedInStudent && (
            <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
                <p><strong>Student:</strong> {loggedInStudent.full_name} ({loggedInStudent.student_id_display})</p>
                <p><strong>Class:</strong> {loggedInStudent.grade_level}</p>
            </div>
        )}
      </div>
      <CardDescription>
        View your daily attendance history as recorded by your teachers, fetched from Supabase.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Attendance History (Supabase)</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records found for you in Supabase yet.
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
    
