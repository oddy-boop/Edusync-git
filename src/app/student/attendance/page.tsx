
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
import { db } from "@/lib/firebase"; // auth removed
import { doc, getDoc, collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants"; 
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Student data structure from Firestore
interface RegisteredStudent {
  studentId: string; // Document ID from Firestore (10-digit ID)
  fullName: string;
  gradeLevel: string;
}

// Structure of an attendance entry document in Firestore
interface AttendanceEntry {
  id: string; // Firestore document ID (studentId_YYYY-MM-DD)
  studentId: string; // 10-digit student ID
  studentName: string;
  className: string;
  date: Timestamp; // Firestore Timestamp
  status: "present" | "absent" | "late";
  notes: string;
  markedByTeacherName: string;
}

export default function StudentAttendancePage() {
  const [loggedInStudent, setLoggedInStudent] = useState<RegisteredStudent | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast(); // toast not actively used yet, but available

  useEffect(() => {
    isMounted.current = true;
    
    async function fetchStudentDataAndAttendance() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      let studentId: string | null = null;
      if (typeof window !== 'undefined') {
        studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      }

      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view attendance.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch student profile
        const studentDocRef = doc(db, "students", studentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
          if (isMounted.current) {
            setError("Student profile not found. Please contact administration.");
            setIsLoading(false);
          }
          return;
        }
        const studentData = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as RegisteredStudent;
        if (isMounted.current) setLoggedInStudent(studentData);

        // Fetch attendance records for this student
        const attendanceQuery = query(
          collection(db, "attendanceEntries"),
          where("studentId", "==", studentId), // Query using the 10-digit studentId
          orderBy("date", "desc")
        );
        const attendanceSnapshots = await getDocs(attendanceQuery);
        const history = attendanceSnapshots.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as AttendanceEntry));
        
        if (isMounted.current) setAttendanceHistory(history);

      } catch (e: any) {
        console.error("Error fetching student data or attendance:", e);
        if (isMounted.current) setError(`Failed to load data: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchStudentDataAndAttendance();

    return () => {
      isMounted.current = false;
    };
  }, []);

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
                      <TableCell>{format(entry.date.toDate(), "PPP")}</TableCell>
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
    