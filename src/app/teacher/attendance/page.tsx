
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
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecord>>>({}); // { className: { studentId: { status, notes } } }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                }));
                allStudentsForTeacher[className] = classStudents;

                // Initialize attendance records for this class
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

  const handleSaveAttendance = (className: string) => {
    // Placeholder for saving attendance data to Firestore
    // This would involve creating a new document in an 'attendance' collection
    // with fields like date, classId, teacherId, and a map of studentId to their attendance status and notes.
    const classAttendance = attendanceRecords[className];
    if (!classAttendance) {
      toast({ title: "Error", description: "No attendance data to save for this class.", variant: "destructive" });
      return;
    }
    
    // Filter out unmarked students or decide how to handle them
    const markedAttendance = Object.entries(classAttendance)
        .filter(([_, record]) => record.status !== 'unmarked')
        .reduce((acc, [studentId, record]) => {
            acc[studentId] = record;
            return acc;
        }, {} as Record<string, StudentAttendanceRecord>);


    if (Object.keys(markedAttendance).length === 0) {
      toast({ title: "No Attendance Marked", description: "Please mark attendance for at least one student.", variant: "destructive" });
      return;
    }

    console.log(`Saving attendance for ${className}:`, markedAttendance);
    // Example: await saveAttendanceToFirestore(className, new Date(), teacherProfile.uid, markedAttendance);
    toast({
      title: "Attendance Saved (Mock)",
      description: `Attendance for ${className} has been recorded (mocked). Actual Firestore save to be implemented.`,
    });
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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <UserCheck className="mr-3 h-8 w-8" /> Record Attendance
        </h2>
        <p className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">Date: {today}</p>
      </div>
      <CardDescription>
        Mark attendance for students in your assigned classes. Select Present, Absent, or Late. Add optional notes if needed.
      </CardDescription>

      {teacherProfile.assignedClasses.map((className) => (
        <Card key={className} className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="flex items-center text-xl">
                    <Users className="mr-2 h-5 w-5 text-primary/80" /> Class: {className}
                </CardTitle>
                 <Button onClick={() => handleSaveAttendance(className)} size="sm">
                    <Save className="mr-2 h-4 w-4" /> Save Attendance for {className}
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
                                  <RadioGroupItem value={statusOption} id={`${student.studentId}-${statusOption}`} />
                                  <Label htmlFor={`${student.studentId}-${statusOption}`} className="capitalize text-xs sm:text-sm">
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

