
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
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { REGISTERED_TEACHERS_KEY, REGISTERED_STUDENTS_KEY, ATTENDANCE_ENTRIES_KEY } from "@/lib/constants";

// LocalStorage teacher profile structure
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[];
}

// LocalStorage student data structure
interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecord>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState<Record<string, boolean>>({});
  const isMounted = useRef(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    isMounted.current = true;
    const unsubscribeAuthState = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;

      if (user) {
        setCurrentUser(user);
        try {
          if (typeof window !== 'undefined') {
            const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
            const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
            const profileData = allTeachers.find(t => t.uid === user.uid);

            if (profileData) {
              if (isMounted.current) setTeacherProfile(profileData);

              if (profileData.assignedClasses && profileData.assignedClasses.length > 0) {
                const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
                const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
                let studentsForTeacher: Record<string, RegisteredStudent[]> = {};
                let initialAttendance: Record<string, Record<string, StudentAttendanceRecord>> = {};

                for (const className of profileData.assignedClasses) {
                  const classStudents = allStudents
                    .filter(s => s.gradeLevel === className)
                    .sort((a,b) => a.fullName.localeCompare(b.fullName));
                  studentsForTeacher[className] = classStudents;

                  initialAttendance[className] = {};
                  classStudents.forEach(student => {
                    initialAttendance[className][student.studentId] = { status: "unmarked", notes: "" };
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
              if (isMounted.current) setError("Teacher profile not found in local records. Attendance cannot be taken.");
            }
          } else {
             if (isMounted.current) setError("localStorage is not available.");
          }
        } catch (e: any) {
          console.error("TeacherAttendancePage: Error fetching teacher/student data from localStorage:", e);
          if (isMounted.current) setError(`Failed to load data from localStorage: ${e.message}`);
        }
      } else {
        if (isMounted.current) {
          setCurrentUser(null);
          setTeacherProfile(null);
          setError("Not authenticated. Please login.");
        }
        router.push("/auth/teacher/login");
      }
      if (isMounted.current) setIsLoading(false);
    });

    return () => {
      isMounted.current = false;
      unsubscribeAuthState();
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
    if (!teacherProfile || !currentUser || typeof window === 'undefined') {
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
      student => classAttendanceRecords[student.studentId]?.status !== "unmarked"
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
        const record = classAttendanceRecords[student.studentId];
        const docId = `${student.studentId}_${dateString}`; // studentId_YYYY-MM-DD
        
        const dataToSave: AttendanceEntryForStorage = {
          id: docId,
          studentId: student.studentId,
          studentName: student.fullName,
          className: className,
          date: dateString,
          status: record.status,
          notes: record.notes || "",
          markedByTeacherId: teacherProfile.uid,
          markedByTeacherName: teacherProfile.fullName,
          lastUpdatedAt: new Date().toISOString(),
        };

        const existingEntryIndex = allAttendanceEntries.findIndex(entry => entry.id === docId);
        if (existingEntryIndex > -1) {
          allAttendanceEntries[existingEntryIndex] = dataToSave; // Update existing
        } else {
          allAttendanceEntries.push(dataToSave); // Add new
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

  if (!teacherProfile || !teacherProfile.assignedClasses || teacherProfile.assignedClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-6 w-6 text-primary" /> Digital Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You are not currently assigned to any classes according to local records. Attendance records cannot be displayed.</p>
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

      {teacherProfile.assignedClasses.map((className) => (
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
              <p className="text-muted-foreground text-center py-4">No students found for {className} in local storage or data is still loading.</p>
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
                      const currentRecord = attendanceRecords[className]?.[student.studentId] || { status: "unmarked", notes: "" };
                      return (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{student.studentId}</TableCell>
                          <TableCell>
                            <RadioGroup
                              value={currentRecord.status}
                              onValueChange={(value) => handleAttendanceChange(className, student.studentId, value as AttendanceStatus)}
                              className="flex space-x-1 sm:space-x-2 flex-wrap"
                            >
                              {(["present", "absent", "late"] as AttendanceStatus[]).map((statusOption) => (
                                <div key={statusOption} className="flex items-center space-x-1 sm:space-x-2">
                                  <RadioGroupItem value={statusOption} id={`${className}-${student.studentId}-${statusOption}`} />
                                  <Label htmlFor={`${className}-${student.studentId}-${statusOption}`} className="capitalize text-xs sm:text-sm">
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
                              onChange={(e) => handleNotesChange(className, student.studentId, e.target.value)}
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
            <CardContent>
                <p className="text-muted-foreground text-center py-8">
                    No classes with students found in local storage. If you have assigned classes, ensure students are registered under them.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
