
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";

interface TeacherProfile {
  id: string; 
  auth_user_id: string;
  full_name: string;
  assigned_classes: string[];
  school_id: number;
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;

    async function fetchTeacherAndAttendanceData() {
        if (!isMounted.current) return;
        setIsLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            if (isMounted.current) setError("Teacher not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }

        try {
      const { data: profileData, error: profileError } = await supabase
        .from("teachers")
        .select("id, auth_user_id, full_name, assigned_classes, school_id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Supabase returned an error fetching teacher profile', profileError);
        throw profileError;
      }

      if (!profileData) {
        if (isMounted.current) {
          setError('Teacher profile not found. Please contact admin.');
        }
        setIsLoading(false);
        return;
      }

      const currentTeacherProfile = profileData as TeacherProfile;
      if (isMounted.current) setTeacherProfile(currentTeacherProfile);

      // Get current academic year from school settings using the teacher's school_id
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("current_academic_year")
        .eq("id", currentTeacherProfile.school_id)
        .maybeSingle();
      
      if (schoolError) throw schoolError;
      
      // Parse academic year (e.g., "2024-2025") to get date range
      const academicYear = schoolData?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const [startYear, endYear] = academicYear.split('-').map((year: string) => parseInt(year, 10));
      
      // Academic year typically runs from September to August
      const academicYearStart = `${startYear}-09-01`;
      const academicYearEnd = `${endYear}-08-31`;

            let studentQuery = supabase.from("students").select("student_id_display, full_name, grade_level").eq("school_id", currentTeacherProfile.school_id);
            if (currentTeacherProfile.assigned_classes && currentTeacherProfile.assigned_classes.length > 0) {
                studentQuery = studentQuery.in("grade_level", currentTeacherProfile.assigned_classes);
            }
            const { data: fetchedStudents, error: studentsError } = await studentQuery;
            if (studentsError) throw studentsError;

            if (!isMounted.current) return;
            setStudents(fetchedStudents || []);

            if (!fetchedStudents || fetchedStudents.length === 0) {
                setIsLoading(false);
                return;
            }

            const studentIds = fetchedStudents.map(s => s.student_id_display);
            const { data: attendanceRecords, error: attendanceError } = await supabase
                .from("attendance_records")
                .select("student_id_display, status")
                .eq("school_id", currentTeacherProfile.school_id)
                .in("student_id_display", studentIds)
                .gte("date", academicYearStart)
                .lte("date", academicYearEnd);
            
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
            toast({ title: "Error", description: `Could not load data: ${e.message}`, variant: "destructive"});
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }
    
    fetchTeacherAndAttendanceData();

    return () => { isMounted.current = false; };
  }, [supabase, toast]);

  const filteredSummary = selectedClassFilter === "all" 
    ? attendanceSummary 
    : attendanceSummary.filter(s => s.grade_level === selectedClassFilter);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading attendance overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
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
        Summary of student attendance records for your assigned classes.
      </CardDescription>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary/80" /> 
            Student Attendance Summary
            {selectedClassFilter !== "all" && ` for ${selectedClassFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSummary.length === 0 ? (
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
                      <TableCell className="font-mono text-sm">{summary.student_id_display}</TableCell>
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
            This report reflects all attendance data recorded in the system.
        </CardFooter>
      </Card>
    </div>
  );
}
