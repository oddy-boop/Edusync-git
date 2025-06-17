
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserCheck, Users, Loader2, AlertCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

// Teacher profile structure from Supabase 'teachers' table
interface TeacherProfileFromSupabase {
  id: string; // PK of 'teachers' table
  auth_user_id: string; // FK to auth.users.id
  full_name: string;
  email: string;
  assigned_classes: string[];
}

// Student data structure from Supabase 'students' table
interface StudentFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

type AttendanceStatus = "present" | "absent" | "late"; // "unmarked" is a UI state, not stored

interface StudentAttendanceRecordUI { // For UI state
  status: AttendanceStatus | "unmarked";
  notes: string;
}

// Structure for attendance entry in Supabase 'attendance_records' table
interface AttendanceEntryForSupabase {
  id?: string; // Optional UUID for existing records
  student_id_display: string;
  student_name: string;
  class_id: string;
  date: string; 
  status: AttendanceStatus;
  notes: string;
  marked_by_teacher_auth_id: string; 
  marked_by_teacher_name: string;
  // created_at and updated_at handled by Supabase
}


export default function TeacherAttendancePage() {
  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileFromSupabase | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentFromSupabase[]>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecordUI>>>({}); // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState<Record<string, boolean>>({});
  const isMounted = useRef(true);
  const { toast } = useToast();
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const todayDateString = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);
    supabaseRef.current = getSupabase();

    const loadInitialData = async () => {
      if (!isMounted.current || !supabaseRef.current || typeof window === 'undefined') return;

      const authUid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (authUid) {
        setTeacherAuthUid(authUid);
        try {
          const { data: profileData, error: profileError } = await supabaseRef.current
            .from('teachers')
            .select('id, auth_user_id, full_name, email, assigned_classes')
            .eq('auth_user_id', authUid)
            .single();

          if (profileError) throw profileError;
          
          if (profileData) {
            if (isMounted.current) setTeacherProfile(profileData as TeacherProfileFromSupabase);

            if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
              const { data: allAssignedStudents, error: studentsError } = await supabaseRef.current
                .from('students')
                .select('student_id_display, full_name, grade_level')
                .in('grade_level', profileData.assigned_classes)
                .order('full_name', { ascending: true });

              if (studentsError) throw studentsError;

              let studentsForTeacher: Record<string, StudentFromSupabase[]> = {};
              let initialAttendanceUI: Record<string, Record<string, StudentAttendanceRecordUI>> = {};

              for (const className of profileData.assigned_classes) {
                const classStudents = (allAssignedStudents || []).filter(s => s.grade_level === className);
                studentsForTeacher[className] = classStudents;
                initialAttendanceUI[className] = {};
                classStudents.forEach(student => {
                  initialAttendanceUI[className][student.student_id_display] = { status: "unmarked", notes: "" };
                });
              }
              if (isMounted.current) {
                setStudentsByClass(studentsForTeacher);
                setAttendanceRecords(initialAttendanceUI);
                // Auto-select first class if available
                if(profileData.assigned_classes.length > 0 && !selectedClass) {
                    setSelectedClass(profileData.assigned_classes[0]);
                }
              }
            } else {
              if (isMounted.current) setStudentsByClass({});
            }
          } else {
            if (isMounted.current) setError("Teacher profile not found in Supabase. Attendance cannot be taken.");
          }
        } catch (e: any) {
          console.error("TeacherAttendancePage: Error fetching teacher/student data from Supabase:", e);
          if (isMounted.current) setError(`Failed to load data from Supabase: ${e.message}`);
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated. Please login.");
        }
        router.push("/auth/teacher/login");
      }
      if (isMounted.current) setIsLoading(false);
    };
    
    loadInitialData();

    return () => {
      isMounted.current = false;
    };
  }, [router]); // Removed selectedClass dependency to avoid re-fetching students on class change here

  // Fetch existing attendance for the selected class and today
  useEffect(() => {
    const fetchTodaysAttendanceForClass = async () => {
      if (!selectedClass || !teacherProfile || !supabaseRef.current || !studentsByClass[selectedClass]) return;
      if (!isMounted.current) return;

      try {
        const { data: existingSupabaseRecords, error: fetchError } = await supabaseRef.current
          .from('attendance_records')
          .select('student_id_display, status, notes')
          .eq('class_id', selectedClass)
          .eq('date', todayDateString)
          .eq('marked_by_teacher_auth_id', teacherProfile.auth_user_id);

        if (fetchError) throw fetchError;

        if (isMounted.current) {
          setAttendanceRecords(prevRecords => {
            const updatedClassRecords = { ...(prevRecords[selectedClass] || {}) };
            studentsByClass[selectedClass].forEach(student => { // Ensure all students in class have an entry
                if (!updatedClassRecords[student.student_id_display]) {
                     updatedClassRecords[student.student_id_display] = { status: "unmarked", notes: "" };
                }
            });
            existingSupabaseRecords?.forEach(record => {
              if (updatedClassRecords[record.student_id_display]) {
                updatedClassRecords[record.student_id_display] = {
                  status: record.status as AttendanceStatus,
                  notes: record.notes || ""
                };
              }
            });
            return { ...prevRecords, [selectedClass]: updatedClassRecords };
          });
        }
      } catch (e: any) {
        console.error(`Error fetching today's attendance for ${selectedClass} from Supabase:`, e);
        toast({ title: "Error", description: `Could not load existing attendance for ${selectedClass}: ${e.message}`, variant: "destructive" });
      }
    };

    if (selectedClass) {
      fetchTodaysAttendanceForClass();
    }
  }, [selectedClass, teacherProfile, todayDateString, studentsByClass, toast]);


  const handleAttendanceChange = (className: string, studentId: string, status: AttendanceStatus | "unmarked") => {
    setAttendanceRecords(prev => ({
      ...prev,
      [className]: {
        ...prev[className],
        [studentId]: {
          ...(prev[className]?.[studentId] || { status: "unmarked", notes: "" }),
          status: status,
        },
      },
    }));
  };

  const handleNotesChange = (className: string, studentId: string, notes: string) => {
     setAttendanceRecords(prev => ({
      ...prev,
      [className]: {
        ...prev[className],
        [studentId]: {
          ...(prev[className]?.[studentId] || { status: "unmarked", notes: "" }),
          notes: notes,
        },
      },
    }));
  };

  const handleSaveAttendance = async (className: string) => {
    if (!teacherProfile || !teacherAuthUid || !supabaseRef.current) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive" });
      return;
    }

    const classAttendanceRecordsUI = attendanceRecords[className];
    const studentsInClass = studentsByClass[className];

    if (!classAttendanceRecordsUI || !studentsInClass || studentsInClass.length === 0) {
      toast({ title: "No Data", description: "No students or attendance data to save.", variant: "warning" });
      return;
    }

    const recordsToUpsert: AttendanceEntryForSupabase[] = [];
    studentsInClass.forEach(student => {
      const recordUI = classAttendanceRecordsUI[student.student_id_display];
      if (recordUI && recordUI.status !== "unmarked") {
        recordsToUpsert.push({
          student_id_display: student.student_id_display,
          student_name: student.full_name,
          class_id: className,
          date: todayDateString,
          status: recordUI.status,
          notes: recordUI.notes || "",
          marked_by_teacher_auth_id: teacherAuthUid,
          marked_by_teacher_name: teacherProfile.full_name,
        });
      }
    });

    if (recordsToUpsert.length === 0) {
      toast({ title: "No Attendance Marked", description: "Please mark attendance for at least one student.", variant: "info" });
      return;
    }

    setIsSavingAttendance(prev => ({ ...prev, [className]: true }));

    try {
      const { error: upsertError } = await supabaseRef.current
        .from('attendance_records')
        .upsert(recordsToUpsert, { onConflict: 'student_id_display,date' }); // Assumes unique constraint

      if (upsertError) throw upsertError;

      toast({
        title: "Attendance Saved",
        description: `Attendance for ${recordsToUpsert.length} student(s) in ${className} saved to Supabase for ${todayDateString}.`,
      });
    } catch (error: any) {
      console.error("Error saving attendance to Supabase:", error);
      toast({
        title: "Save Failed",
        description: `Could not save attendance to Supabase: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      if(isMounted.current) {
        setIsSavingAttendance(prev => ({ ...prev, [className]: false }));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading attendance page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!teacherProfile) { // Should be caught by error state, but as a fallback
    return (
      <Card><CardHeader><CardTitle>Profile Loading Issue</CardTitle></CardHeader>
        <CardContent><p>Teacher profile could not be loaded. Please try logging in again.</p>
         <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <UserCheck className="mr-3 h-8 w-8" /> Record Attendance
        </h2>
        <p className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">Date: {todayDisplay}</p>
      </div>
      <CardDescription>
        Mark attendance for students in your assigned classes for today. Select a class to begin. Attendance is saved to Supabase.
      </CardDescription>

      <Card>
        <CardHeader>
            <Label htmlFor="class-select">Select Class to Mark Attendance:</Label>
        </CardHeader>
        <CardContent>
            <Select value={selectedClass || ""} onValueChange={setSelectedClass} disabled={!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0}>
                <SelectTrigger id="class-select" className="w-full md:w-1/2 lg:w-1/3">
                    <SelectValue placeholder={teacherProfile.assigned_classes.length === 0 ? "No classes assigned" : "Choose a class"} />
                </SelectTrigger>
                <SelectContent>
                {(teacherProfile.assigned_classes || []).map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
                </SelectContent>
            </Select>
            {!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">You are not assigned to any classes in your profile.</p>
            )}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="flex items-center text-xl">
                    <Users className="mr-2 h-5 w-5 text-primary/80" /> Class: {selectedClass}
                </CardTitle>
                 <Button onClick={() => handleSaveAttendance(selectedClass)} size="sm" disabled={isSavingAttendance[selectedClass]}>
                    {isSavingAttendance[selectedClass] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSavingAttendance[selectedClass] ? `Saving for ${selectedClass}...` : `Save Attendance for ${selectedClass}`}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!studentsByClass[selectedClass] || studentsByClass[selectedClass].length === 0) ? (
              <p className="text-muted-foreground text-center py-4">No students found for {selectedClass} in Supabase or data is still loading.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] sm:w-[250px]">Student Name</TableHead>
                      <TableHead className="hidden sm:table-cell w-[150px]">Student ID</TableHead>
                      <TableHead className="min-w-[280px]">Attendance Status</TableHead>
                      <TableHead className="min-w-[200px]">Notes (Optional)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsByClass[selectedClass].map((student) => {
                      const currentRecord = attendanceRecords[selectedClass]?.[student.student_id_display] || { status: "unmarked", notes: "" };
                      return (
                        <TableRow key={student.student_id_display}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{student.student_id_display}</TableCell>
                          <TableCell>
                            <RadioGroup
                              value={currentRecord.status}
                              onValueChange={(value) => handleAttendanceChange(selectedClass, student.student_id_display, value as AttendanceStatus | "unmarked")}
                              className="flex space-x-1 sm:space-x-2 flex-wrap"
                            >
                              {(["present", "absent", "late"] as AttendanceStatus[]).map((statusOption) => (
                                <div key={statusOption} className="flex items-center space-x-1 sm:space-x-2">
                                  <RadioGroupItem value={statusOption} id={`${selectedClass}-${student.student_id_display}-${statusOption}`} />
                                  <Label htmlFor={`${selectedClass}-${student.student_id_display}-${statusOption}`} className="capitalize text-xs sm:text-sm">
                                    {statusOption}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="e.g., Left early, Excused"
                              value={currentRecord.notes}
                              onChange={(e) => handleNotesChange(selectedClass, student.student_id_display, e.target.value)}
                              className="text-xs sm:text-sm h-8 sm:h-9"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
       {Object.keys(studentsByClass).length === 0 && !isLoading && !selectedClass && (
        <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">
                    Select a class to begin marking attendance.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
