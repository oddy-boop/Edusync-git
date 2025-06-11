
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
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, Timestamp, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Firestore teacher profile
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role: string;
}

// Student data structure from Firestore
interface RegisteredStudent {
  studentId: string; // Document ID from Firestore
  fullName: string;
  gradeLevel: string;
  // Add other fields if needed later
}

type AttendanceStatus = "present" | "absent" | "late" | "unmarked";

interface StudentAttendanceRecord {
  status: AttendanceStatus;
  notes: string;
}

export default function TeacherAttendancePage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  // { className: { studentId: { status, notes } } }
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecord>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState<Record<string, boolean>>({}); // For individual class save buttons
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
          const teacherDocRef = doc(db, "teachers", user.uid);
          const teacherDocSnap = await getDoc(teacherDocRef);

          if (teacherDocSnap.exists()) {
            const profileData = teacherDocSnap.data() as TeacherProfile;
            if (isMounted.current) setTeacherProfile(profileData);

            if (profileData.assignedClasses && profileData.assignedClasses.length > 0) {
              let allStudentsForTeacher: Record<string, RegisteredStudent[]> = {};
              let initialAttendance: Record<string, Record<string, StudentAttendanceRecord>> = {};
              const studentsCollectionRef = collection(db, "students");

              for (const className of profileData.assignedClasses) {
                const q = query(studentsCollectionRef, where("gradeLevel", "==", className));
                const studentSnapshots = await getDocs(q);
                const classStudents = studentSnapshots.docs.map(docSnap => ({
                  studentId: docSnap.id,
                  ...(docSnap.data() as Omit<RegisteredStudent, 'studentId' | 'gradeLevel'>),
                  gradeLevel: className,
                })).sort((a,b) => a.fullName.localeCompare(b.fullName)); // Sort students by name
                allStudentsForTeacher[className] = classStudents;

                initialAttendance[className] = {};
                classStudents.forEach(student => {
                  initialAttendance[className][student.studentId] = { status: "unmarked", notes: "" };
                });
              }
              if (isMounted.current) {
                setStudentsByClass(allStudentsForTeacher);
                setAttendanceRecords(initialAttendance);
              }
            } else {
              if (isMounted.current) setStudentsByClass({});
            }
          } else {
            if (isMounted.current) setError("Teacher profile not found. Attendance cannot be taken.");
            console.error("TeacherAttendancePage: Teacher profile not found for UID:", user.uid);
          }
        } catch (e: any) {
          console.error("TeacherAttendancePage: Error fetching teacher/student data:", e);
          if (isMounted.current) setError(`Failed to load data: ${e.message}`);
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
    if (!teacherProfile || !currentUser) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive" });
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

    const batch = writeBatch(db);
    const attendanceDate = new Date(); // Using current date for attendance
    attendanceDate.setHours(0, 0, 0, 0); // Normalize to start of day for consistent querying
    const dateString = attendanceDate.toISOString().split('T')[0]; // YYYY-MM-DD

    markedStudents.forEach(student => {
      const record = classAttendanceRecords[student.studentId];
      const docId = `${student.studentId}_${dateString}`; // studentId_YYYY-MM-DD
      const attendanceDocRef = doc(db, "attendanceEntries", docId);

      const dataToSave = {
        studentId: student.studentId,
        studentName: student.fullName,
        className: className, // The class for which attendance was taken
        date: Timestamp.fromDate(attendanceDate),
        status: record.status,
        notes: record.notes || "",
        markedByTeacherId: teacherProfile.uid,
        markedByTeacherName: teacherProfile.fullName,
        lastUpdatedAt: Timestamp.now(),
      };
      batch.set(attendanceDocRef, dataToSave); // Overwrites if already exists for this student on this day
    });

    try {
      await batch.commit();
      toast({
        title: "Attendance Saved",
        description: `Attendance for ${markedStudents.length} student(s) in ${className} has been saved for ${dateString}.`,
      });
    } catch (error: any) {
      console.error("Error saving attendance to Firestore:", error);
      toast({
        title: "Save Failed",
        description: `Could not save attendance: ${error.message}`,
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
          <p className="text-muted-foreground">You are not currently assigned to any classes. Attendance records cannot be displayed.</p>
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
        Mark attendance for students in your assigned classes for today. Select Present, Absent, or Late. Add optional notes if needed. Attendance is saved to Firestore.
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
              <p className="text-muted-foreground text-center py-4">No students found for {className} or data is still loading.</p>
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
                    No classes with students found. If you have assigned classes, ensure students are registered under them.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
