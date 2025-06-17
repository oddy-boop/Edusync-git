
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, ListChecks, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfile {
  id: string; 
  auth_user_id: string;
  full_name: string;
  assigned_classes: string[];
}

interface Student {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface AttendanceRecord {
  student_id_display: string;
  status: "present" | "absent" | "late";
}

interface StudentAttendanceSummary {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  total_present: number;
  total_absent: number;
  total_late: number;
}

export default function AttendanceOverviewPage() {
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all"); // 'all' or specific class_id
  
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;
    async function fetchTeacherProfile() {
      if (!isMounted.current) return;
      setIsLoadingTeacher(true);
      const teacherAuthUid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (!teacherAuthUid) {
        setError("Teacher not authenticated. Please log in.");
        setIsLoadingTeacher(false);
        return;
      }
      try {
        const { data, error: profileError } = await supabase
          .from("teachers")
          .select("id, auth_user_id, full_name, assigned_classes")
          .eq("auth_user_id", teacherAuthUid)
          .single();
        if (profileError) throw profileError;
        if (isMounted.current) setTeacherProfile(data as TeacherProfile);
      } catch (e: any) {
        if (isMounted.current) setError(`Failed to load teacher profile: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoadingTeacher(false);
      }
    }
    fetchTeacherProfile();
    return () => { isMounted.current = false; };
  }, [supabase]);

  useEffect(() => {
    async function fetchAttendanceData() {
      if (!teacherProfile || !isMounted.current) return;
      
      setIsLoadingData(true);
      setError(null);
      setAttendanceSummary([]);
      setStudents([]);

      try {
        let studentQuery = supabase.from("students").select("student_id_display, full_name, grade_level");
        if (teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0) {
          studentQuery = studentQuery.in("grade_level", teacherProfile.assigned_classes);
        } else {
           // If teacher has no assigned classes, maybe fetch all students or show a message
           // For now, this will fetch all students if no classes assigned, which might be too much.
           // Consider adding a message if no classes are assigned and no students are fetched.
        }
        const { data: fetchedStudents, error: studentsError } = await studentQuery;
        if (studentsError) throw studentsError;
        if (!isMounted.current) return;
        setStudents(fetchedStudents || []);

        if (!fetchedStudents || fetchedStudents.length === 0) {
          setIsLoadingData(false);
          return;
        }

        const studentIds = fetchedStudents.map(s => s.student_id_display);
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from("attendance_records")
          .select("student_id_display, status")
          .in("student_id_display", studentIds);
        
        if (attendanceError) throw attendanceError;
        if (!isMounted.current) return;

        const summary: Record<string, { present: number, absent: number, late: number }> = {};
        (attendanceRecords || []).forEach(record => {
          if (!summary[record.student_id_display]) {
            summary[record.student_id_display] = { present: 0, absent: 0, late: 0 };
          }
          if (record.status === "present") summary[record.student_id_display].present++;
          else if (record.status === "absent") summary[record.student_id_display].absent++;
          else if (record.status === "late") summary[record.student_id_display].late++;
        });

        const finalSummary = (fetchedStudents || []).map(student => ({
          student_id_display: student.student_id_display,
          full_name: student.full_name,
          grade_level: student.grade_level,
          total_present: summary[student.student_id_display]?.present || 0,
          total_absent: summary[student.student_id_display]?.absent || 0,
          total_late: summary[student.student_id_display]?.late || 0,
        }));
        
        if (isMounted.current) setAttendanceSummary(finalSummary);

      } catch (e: any) {
        if (isMounted.current) setError(`Failed to load attendance data: ${e.message}`);
        toast({ title: "Error", description: `Could not load data from Supabase: ${e.message}`, variant: "destructive"});
      } finally {
        if (isMounted.current) setIsLoadingData(false);
      }
    }

    fetchAttendanceData();
  }, [teacherProfile, supabase, toast]);

  const filteredSummary = selectedClassFilter === "all" 
    ? attendanceSummary 
    : attendanceSummary.filter(s => s.grade_level === selectedClassFilter);

  if (isLoadingTeacher) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading teacher information...</p>
      </div>
    );
  }

  if (error && !teacherProfile) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Teacher not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!teacherProfile) {
     return (
      <Card><CardHeader><CardTitle>Profile Not Loaded</CardTitle></CardHeader>
        <CardContent><p>Unable to load teacher profile. Please try again or contact support.</p></CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <ListChecks className="mr-3 h-8 w-8" /> Attendance Overview
        </h2>
        {teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0 && (
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Filter by class..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All My Assigned Classes</SelectItem>
                    {teacherProfile.assigned_classes.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )}
      </div>
      <CardDescription>
        Summary of student attendance records from Supabase. 
        {teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0 
          ? " Showing students from your assigned classes." 
          : " No classes assigned in your profile; showing all students if available."}
      </CardDescription>

      {error && (
        <Card className="border-destructive bg-destructive/10 text-destructive p-4">
          <CardTitle className="flex items-center"><AlertCircle className="mr-2" /> Data Loading Error</CardTitle>
          <CardContent className="pt-2"><p>{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary/80" /> 
            Student Attendance Summary
            {selectedClassFilter !== "all" && ` for ${selectedClassFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading attendance summary from Supabase...</p>
            </div>
          ) : filteredSummary.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {students.length === 0 && (!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0) 
                ? "No students found. Please check if students are registered." 
                : students.length === 0 && teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0 
                ? "No students found in your assigned classes."
                : "No attendance records found for the selected students/class, or data is still processing."
              }
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.map((summary) => (
                    <TableRow key={summary.student_id_display}>
                      <TableCell className="font-mono text-xs">{summary.student_id_display}</TableCell>
                      <TableCell>{summary.full_name}</TableCell>
                      <TableCell>{summary.grade_level}</TableCell>
                      <TableCell className="text-center font-medium text-green-600">{summary.total_present}</TableCell>
                      <TableCell className="text-center font-medium text-red-600">{summary.total_absent}</TableCell>
                      <TableCell className="text-center font-medium text-yellow-600">{summary.total_late}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
            This report reflects all attendance data recorded in Supabase.
        </CardFooter>
      </Card>
    </div>
  );
}
