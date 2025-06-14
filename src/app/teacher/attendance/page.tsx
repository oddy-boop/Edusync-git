
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
import { ATTENDANCE_ENTRIES_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

// Teacher profile structure from Supabase 'teachers' table
interface TeacherProfileFromSupabase {
  id: string;
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

type AttendanceStatus = "present" | "absent" | "late" | "unmarked";

interface StudentAttendanceRecord {
  status: AttendanceStatus;
  notes: string;
}

// Structure for attendance entry in localStorage
interface AttendanceEntryForStorage {
  id: string; // studentId_YYYY-MM-DD
  studentId: string;
  studentName: string;
  className: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  status: AttendanceStatus;
  notes: string;
  markedByTeacherId: string;
  markedByTeacherName: string;
  lastUpdatedAt: string; // ISO DateTime string
}


export default function TeacherAttendancePage() {
  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileFromSupabase | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentFromSupabase[]>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecord>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState<Record<string, boolean>>({});
  const isMounted = useRef(true);
  const { toast } = useToast();
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);
    supabaseRef.current = getSupabase();

    const loadInitialData = async () => {
      if (!isMounted.current || !supabaseRef.current || typeof window === 'undefined') return;

      const uid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (uid) {
        setTeacherUid(uid);
        try {
          // Fetch teacher profile from Supabase
          const { data: profileData, error: profileError } = await supabaseRef.current
            .from('teachers')
            .select('id, full_name, email, assigned_classes')
            .eq('id', uid)
            .single();

          if (profileError) throw profileError;
          
          if (profileData) {
            if (isMounted.current) setTeacherProfile(profileData as TeacherProfileFromSupabase);

            if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
              // Fetch students for the teacher's assigned classes
              const { data: allAssignedStudents, error: studentsError } = await supabaseRef.current
                .from('students')
                .select('student_id_display, full_name, grade_level')
                .in('grade_level', profileData.assigned_classes)
                .order('full_name', { ascending: true });

              if (studentsError) throw studentsError;

              let studentsForTeacher: Record<string, StudentFromSupabase[]> = {};
              let initialAttendance: Record<string, Record<string, StudentAttendanceRecord>> = {};

              for (const className of profileData.assigned_classes) {
                const classStudents = (allAssignedStudents || []).filter(s => s.grade_level === className);
                studentsForTeacher[className] = classStudents;

                initialAttendance[className] = {};
                classStudents.forEach(student => {
                  initialAttendance[className][student.student_id_display] = { status: "unmarked", notes: "" };
                });
              }
              if (isMounted.current) {
                setStudentsByClass(studentsForTeacher);
                setAttendanceRecords(initialAttendance);
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
  }, [router]);

  const handleAttendanceChange = (className: string, studentId: string, status: AttendanceStatus) => {
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
    if (!teacherProfile || !teacherUid || typeof window === 'undefined') {
      toast({ title: "Error", description: "Authentication error or localStorage unavailable.", variant: "destructive" });
      return;
    }

    const classAttendanceRecords = attendanceRecords[className];
    const studentsInClass = studentsByClass[className];

    if (!classAttendanceRecords || !studentsInClass || studentsInClass.length === 0) {
      toast({ title: "No Data", description: "No students or attendance data to save for this class.", variant: "warning" });
      return;
    }

    const markedStudents = studentsInClass.filter(
      student => classAttendanceRecords[student.student_id_display]?.status !== "unmarked"
    );

    if (markedStudents.length === 0) {
      toast({ title: "No Attendance Marked", description: "Please mark attendance for at least one student before saving.", variant: "info" });
      return;
    }

    setIsSavingAttendance(prev => ({ ...prev, [className]: true }));

    const attendanceDate = new Date();
    const dateString = attendanceDate.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const existingEntriesRaw = localStorage.getItem(ATTENDANCE_ENTRIES_KEY);
      let allAttendanceEntries: AttendanceEntryForStorage[] = existingEntriesRaw ? JSON.parse(existingEntriesRaw) : [];

      markedStudents.forEach(student => {
        const record = classAttendanceRecords[student.student_id_display];
        const docId = `${student.student_id_display}_${dateString}`; 
        
        const dataToSave: AttendanceEntryForStorage = {
          id: docId,
          studentId: student.student_id_display,
          studentName: student.full_name,
          className: className,
          date: dateString,
          status: record.status === "unmarked" ? "absent" : record.status, 
          notes: record.notes || "",
          markedByTeacherId: teacherProfile.id, 
          markedByTeacherName: teacherProfile.full_name,
          lastUpdatedAt: new Date().toISOString(),
        };

        const existingEntryIndex = allAttendanceEntries.findIndex(entry => entry.id === docId);
        if (existingEntryIndex > -1) {
          allAttendanceEntries[existingEntryIndex] = dataToSave; 
        } else {
          allAttendanceEntries.push(dataToSave); 
        }
      });

      localStorage.setItem(ATTENDANCE_ENTRIES_KEY, JSON.stringify(allAttendanceEntries));
      toast({
        title: "Attendance Saved",
        description: `Attendance for ${markedStudents.length} student(s) in ${className} has been saved locally for ${dateString}.`,
      });
    } catch (error: any) {
      console.error("Error saving attendance to localStorage:", error);
      toast({
        title: "Save Failed",
        description: `Could not save attendance to localStorage: ${error.message}`,
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
        <p className="text-muted-foreground">Loading attendance records...</p>
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
          {error.includes("Not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!teacherProfile || !teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-6 w-6 text-primary" /> Digital Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You are not currently assigned to any classes according to your Supabase profile. Attendance records cannot be displayed.</p>
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
        Mark attendance for students in your assigned classes for today. Select Present, Absent, or Late. Add optional notes if needed. Attendance is saved to local browser storage.
      </CardDescription>

      {teacherProfile.assigned_classes.map((className) => (
        <Card key={className} className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="flex items-center text-xl">
                    <Users className="mr-2 h-5 w-5 text-primary/80" /> Class: {className}
                </CardTitle>
                 <Button onClick={() => handleSaveAttendance(className)} size="sm" disabled={isSavingAttendance[className]}>
                    {isSavingAttendance[className] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSavingAttendance[className] ? `Saving for ${className}...` : `Save Attendance for ${className}`}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!studentsByClass[className] || studentsByClass[className].length === 0) ? (
              <p className="text-muted-foreground text-center py-4">No students found for {className} in Supabase or data is still loading.</p>
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
                    {studentsByClass[className].map((student) => {
                      const currentRecord = attendanceRecords[className]?.[student.student_id_display] || { status: "unmarked", notes: "" };
                      return (
                        <TableRow key={student.student_id_display}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{student.student_id_display}</TableCell>
                          <TableCell>
                            <RadioGroup
                              value={currentRecord.status}
                              onValueChange={(value) => handleAttendanceChange(className, student.student_id_display, value as AttendanceStatus)}
                              className="flex space-x-1 sm:space-x-2 flex-wrap"
                            >
                              {(["present", "absent", "late"] as AttendanceStatus[]).map((statusOption) => (
                                <div key={statusOption} className="flex items-center space-x-1 sm:space-x-2">
                                  <RadioGroupItem value={statusOption} id={`${className}-${student.student_id_display}-${statusOption}`} />
                                  <Label htmlFor={`${className}-${student.student_id_display}-${statusOption}`} className="capitalize text-xs sm:text-sm">
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
                              onChange={(e) => handleNotesChange(className, student.student_id_display, e.target.value)}
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
      ))}
       {Object.keys(studentsByClass).length === 0 && !isLoading && (
        <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">
                    No classes with students found in Supabase. If you have assigned classes, ensure students are registered under them in Supabase.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
