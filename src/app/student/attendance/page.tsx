
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
import { CalendarCheck2, Loader2, AlertCircle, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, REGISTERED_STUDENTS_KEY, ATTENDANCE_ENTRIES_KEY } from "@/lib/constants"; 
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Student data structure from localStorage
interface RegisteredStudent {
  studentId: string; 
  fullName: string;
  gradeLevel: string;
}

// Structure of an attendance entry document from localStorage
interface AttendanceEntry {
  id: string; // studentId_YYYY-MM-DD
  studentId: string; 
  studentName: string;
  className: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  status: "present" | "absent" | "late"; // "unmarked" status is not expected here for student view
  notes: string;
  markedByTeacherName: string;
  // markedByTeacherId and lastUpdatedAt might also be present from localStorage
}

export default function StudentAttendancePage() {
  const [loggedInStudent, setLoggedInStudent] = useState<RegisteredStudent | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast(); 

  useEffect(() => {
    isMounted.current = true;
    
    async function fetchStudentDataAndAttendance() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      setError(null);

      let studentId: string | null = null;
      studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      
      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view attendance.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch student profile from localStorage
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const studentData = allStudents.find(s => s.studentId === studentId);

        if (!studentData) {
          if (isMounted.current) {
            setError("Student profile not found in local records. Please contact administration.");
            setIsLoading(false);
          }
          return;
        }
        if (isMounted.current) setLoggedInStudent(studentData);

        // Fetch attendance records for this student from localStorage
        const attendanceEntriesRaw = localStorage.getItem(ATTENDANCE_ENTRIES_KEY);
        const allAttendanceEntries: AttendanceEntry[] = attendanceEntriesRaw ? JSON.parse(attendanceEntriesRaw) : [];
        
        const history = allAttendanceEntries
          .filter(entry => entry.studentId === studentId && entry.status !== "unmarked") // Filter for current student and exclude 'unmarked'
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
        
        if (isMounted.current) setAttendanceHistory(history);

      } catch (e: any) {
        console.error("Error fetching student data or attendance from localStorage:", e);
        if (isMounted.current) setError(`Failed to load data from localStorage: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchStudentDataAndAttendance();

    return () => {
      isMounted.current = false;
    };
  }, [toast]); // Added toast to dependency array, though not directly used in fetch

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
  
  if (!loggedInStudent) {
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
                <p><strong>Student:</strong> {loggedInStudent.fullName} ({loggedInStudent.studentId})</p>
                <p><strong>Class:</strong> {loggedInStudent.gradeLevel}</p>
            </div>
        )}
      </div>
      <CardDescription>
        View your daily attendance history as recorded by your teachers.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records found for you yet. Records will appear here once your teacher takes attendance.
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
                      <TableCell>{format(new Date(entry.date), "PPP")}</TableCell>
                      <TableCell>{entry.className}</TableCell>
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
                      <TableCell className="text-muted-foreground text-xs">{entry.markedByTeacherName}</TableCell>
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
    
