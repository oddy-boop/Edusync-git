"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Users, Loader2, AlertCircle, Save, WifiOff, Cloud, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const OFFLINE_STUDENTS_KEY = "offline_students_cache_edusync";
const OFFLINE_ATTENDANCE_QUEUE_KEY = "offline_attendance_queue_edusync";

interface TeacherProfileFromSupabase {
  id: string; 
  auth_user_id: string; 
  full_name: string;
  email: string;
  assigned_classes: string[];
}

interface StudentFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

type AttendanceStatus = "present" | "absent" | "late";

interface StudentAttendanceRecordUI {
  status: AttendanceStatus | "unmarked";
  notes: string;
}

interface QueuedAttendanceRecord {
  student_id_display: string;
  student_name: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  marked_by_teacher_auth_id: string;
  marked_by_teacher_name: string;
  timestamp: number;
}


export default function TeacherAttendancePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileFromSupabase | null>(null);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentFromSupabase[]>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, StudentAttendanceRecordUI>>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState<Record<string, boolean>>({});
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedItemsCount, setQueuedItemsCount] = useState(0);

  const todayDateString = format(new Date(), "yyyy-MM-dd");

  const syncOfflineQueue = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!isOnline || !supabase) return;

    const queuedItemsRaw = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    if (!queuedItemsRaw) {
        setQueuedItemsCount(0);
        return;
    }

    const queuedItems: QueuedAttendanceRecord[] = JSON.parse(queuedItemsRaw);
    if (queuedItems.length === 0) {
        setQueuedItemsCount(0);
        return;
    }

    toast({ title: "Syncing...", description: `Syncing ${queuedItems.length} offline attendance records.` });

    const recordsToUpsert = queuedItems.map(item => {
        const { timestamp, ...record } = item;
        return record;
    });

    const { error: upsertError } = await supabase
        .from('attendance_records')
        .upsert(recordsToUpsert, { onConflict: 'student_id_display,date' });

    if (upsertError) {
        toast({ title: "Sync Failed", description: `Could not sync offline data: ${upsertError.message}`, variant: "destructive" });
    } else {
        toast({ title: "Sync Successful", description: `${queuedItems.length} records have been synced with the server.` });
        localStorage.removeItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
        setQueuedItemsCount(0);
    }
  }, [isOnline, toast]);


  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    setIsOnline(navigator.onLine);

    const queuedItemsRaw = typeof window !== 'undefined' ? localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY) : null;
    const queuedItems = queuedItemsRaw ? JSON.parse(queuedItemsRaw) : [];
    setQueuedItemsCount(queuedItems.length);

    const loadInitialData = async () => {
        if (!isMounted.current || !supabaseRef.current) return;
        
        const { data: { session } } = await supabaseRef.current.auth.getSession();
        if (!session?.user) {
            if (isMounted.current) {
                if (!navigator.onLine) {
                    setError("You are offline. Please connect to the internet to log in for the first time.");
                } else {
                    setError("Teacher not authenticated. Please log in.");
                }
            }
            setIsLoading(false);
            return;
        }

        if(isMounted.current) setAuthUser(session.user);

        try {
            if (navigator.onLine) {
                const { data: profileData, error: profileError } = await supabaseRef.current
                    .from('teachers').select('id, auth_user_id, full_name, email, assigned_classes').eq('auth_user_id', session.user.id).single();
                if (profileError) throw profileError;
                
                if (profileData && isMounted.current) {
                    setTeacherProfile(profileData);
                    localStorage.setItem('teacher_profile_cache_edusync', JSON.stringify(profileData));
                    if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
                        const orFilter = profileData.assigned_classes.map(cls => `grade_level.eq.${cls}`).join(',');
                        const { data: allAssignedStudents, error: studentsError } = await supabaseRef.current
                            .from('students').select('student_id_display, full_name, grade_level').or(orFilter).order('full_name', { ascending: true });
                        if (studentsError) throw studentsError;

                        let studentsForTeacher: Record<string, StudentFromSupabase[]> = {};
                        profileData.assigned_classes.forEach(className => {
                            studentsForTeacher[className] = (allAssignedStudents || []).filter(s => s.grade_level === className);
                        });

                        if (isMounted.current) {
                            setStudentsByClass(studentsForTeacher);
                            localStorage.setItem(OFFLINE_STUDENTS_KEY, JSON.stringify(studentsForTeacher));
                            if (profileData.assigned_classes.length > 0 && !selectedClass) {
                                setSelectedClass(profileData.assigned_classes[0]);
                            }
                        }
                    }
                }
            } else { // Offline logic
                const cachedProfileRaw = localStorage.getItem('teacher_profile_cache_edusync');
                const cachedStudentsRaw = localStorage.getItem(OFFLINE_STUDENTS_KEY);

                if (cachedProfileRaw) {
                    const cachedProfile = JSON.parse(cachedProfileRaw);
                    if(isMounted.current) setTeacherProfile(cachedProfile);

                    if (cachedStudentsRaw) {
                        const cachedStudents = JSON.parse(cachedStudentsRaw);
                        if(isMounted.current) setStudentsByClass(cachedStudents);
                        if (cachedProfile.assigned_classes.length > 0 && !selectedClass) {
                            setSelectedClass(cachedProfile.assigned_classes[0]);
                        }
                    } else {
                        setError("Student list not cached. Please connect to the internet once to download it for offline use.");
                    }
                } else {
                    setError("You are offline and no teacher profile is saved on this device. Please connect to the internet and log in once to enable offline mode.");
                }
            }
        } catch (e: any) {
            if (isMounted.current) setError(`Failed to load data: ${e.message}`);
        }
        if (isMounted.current) setIsLoading(false);
    };

    loadInitialData();

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncOfflineQueue();
    }
  }, [isOnline, syncOfflineQueue]);

  useEffect(() => {
    const fetchTodaysAttendanceForClass = async () => {
        if (!selectedClass || !teacherProfile || !supabaseRef.current || !studentsByClass[selectedClass] || !isOnline) return;

        try {
            const { data: existingSupabaseRecords, error: fetchError } = await supabaseRef.current
              .from('attendance_records').select('student_id_display, status, notes').eq('class_id', selectedClass).eq('date', todayDateString);
            if (fetchError) throw fetchError;
            
            if (isMounted.current) {
                setAttendanceRecords(prev => {
                    const updatedClassRecords = { ...(prev[selectedClass] || {}) };
                    (existingSupabaseRecords || []).forEach(record => {
                        if (updatedClassRecords[record.student_id_display]) {
                            updatedClassRecords[record.student_id_display] = { status: record.status as AttendanceStatus, notes: record.notes || "" };
                        }
                    });
                    return { ...prev, [selectedClass]: updatedClassRecords };
                });
            }
        } catch (e: any) {
            toast({ title: "Error", description: `Could not load existing attendance for ${selectedClass}: ${e.message}`, variant: "destructive" });
        }
    };
    if (selectedClass) {
      // Initialize UI state first, then fetch online records if available
      setAttendanceRecords(prev => {
          const classRecords = { ...(prev[selectedClass] || {}) };
          (studentsByClass[selectedClass] || []).forEach(student => {
              if (!classRecords[student.student_id_display]) {
                   classRecords[student.student_id_display] = { status: "unmarked", notes: "" };
              }
          });
          return { ...prev, [selectedClass]: classRecords };
      });
      fetchTodaysAttendanceForClass();
    }
  }, [selectedClass, teacherProfile, todayDateString, studentsByClass, toast, isOnline]);

  const handleAttendanceChange = (className: string, studentId: string, status: AttendanceStatus | "unmarked") => {
    setAttendanceRecords(prev => ({
      ...prev, [className]: { ...prev[className], [studentId]: { ...(prev[className]?.[studentId] || { status: "unmarked", notes: "" }), status: status } }
    }));
  };

  const handleNotesChange = (className: string, studentId: string, notes: string) => {
     setAttendanceRecords(prev => ({
      ...prev, [className]: { ...prev[className], [studentId]: { ...(prev[className]?.[studentId] || { status: "unmarked", notes: "" }), notes: notes } }
    }));
  };

  const handleSaveAttendance = async (className: string) => {
    if (!authUser || !teacherProfile) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive" });
      return;
    }

    const classAttendanceRecordsUI = attendanceRecords[className];
    const studentsInClass = studentsByClass[className];

    if (!classAttendanceRecordsUI || !studentsInClass || studentsInClass.length === 0) {
      toast({ title: "No Data", description: "No students or attendance data to save.", variant: "default" });
      return;
    }
    
    setIsSavingAttendance(prev => ({ ...prev, [className]: true }));

    const recordsToSave: QueuedAttendanceRecord[] = studentsInClass.map(student => {
      const recordUI = classAttendanceRecordsUI[student.student_id_display];
      if (recordUI && recordUI.status !== "unmarked") {
        return {
          student_id_display: student.student_id_display,
          student_name: student.full_name,
          class_id: className,
          date: todayDateString,
          status: recordUI.status,
          notes: recordUI.notes || "",
          marked_by_teacher_auth_id: authUser.id,
          marked_by_teacher_name: teacherProfile.full_name,
          timestamp: Date.now(),
        };
      }
      return null;
    }).filter((r): r is QueuedAttendanceRecord => r !== null);

    if (recordsToSave.length === 0) {
      toast({ title: "No Attendance Marked", description: "Please mark attendance for at least one student.", variant: "info" });
      setIsSavingAttendance(prev => ({ ...prev, [className]: false }));
      return;
    }

    if (isOnline && supabaseRef.current) {
        const recordsToUpsert = recordsToSave.map(({ timestamp, ...rest }) => rest);
        const { error: upsertError } = await supabaseRef.current
            .from('attendance_records').upsert(recordsToUpsert, { onConflict: 'student_id_display,date' });

        if (upsertError) {
            toast({ title: "Save Failed", description: `Could not save attendance online: ${upsertError.message}`, variant: "destructive" });
        } else {
            toast({ title: "Attendance Saved", description: `Attendance for ${recordsToSave.length} student(s) saved.` });
        }
    } else { // Offline Mode
        const queuedItemsRaw = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
        let queuedItems: QueuedAttendanceRecord[] = queuedItemsRaw ? JSON.parse(queuedItemsRaw) : [];
        
        // Remove old entries for the same student/date and add new ones
        recordsToSave.forEach(newRecord => {
            queuedItems = queuedItems.filter(q => !(q.student_id_display === newRecord.student_id_display && q.date === newRecord.date));
            queuedItems.push(newRecord);
        });
        
        localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(queuedItems));
        setQueuedItemsCount(queuedItems.length);
        toast({ title: "Saved Offline", description: `${recordsToSave.length} records queued for syncing when you are back online.` });
    }
    
    if (isMounted.current) setIsSavingAttendance(prev => ({ ...prev, [className]: false }));
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error) {
    return <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>;
  }

  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <UserCheck className="mr-3 h-8 w-8" /> Record Attendance
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
            {isOnline ? <Cloud className="h-4 w-4 text-green-500"/> : <WifiOff className="h-4 w-4 text-red-500"/>}
            <span>{isOnline ? "Online" : "Offline Mode"}</span>
            {queuedItemsCount > 0 && <span className="text-xs">({queuedItemsCount} items queued)</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={syncOfflineQueue} disabled={!isOnline || queuedItemsCount === 0}><RefreshCw className={cn("h-4 w-4", !isOnline && "text-muted-foreground")}/></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md w-fit">Date: {todayDisplay}</p>

      <Card>
        <CardHeader><Label htmlFor="class-select">Select Class to Mark Attendance:</Label></CardHeader>
        <CardContent>
            <Select value={selectedClass || ""} onValueChange={setSelectedClass} disabled={!teacherProfile?.assigned_classes || teacherProfile.assigned_classes.length === 0}>
                <SelectTrigger id="class-select" className="w-full md:w-1/2 lg:w-1/3"><SelectValue placeholder={teacherProfile?.assigned_classes.length === 0 ? "No classes assigned" : "Choose a class"} /></SelectTrigger>
                <SelectContent>{(teacherProfile?.assigned_classes || []).map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
            </Select>
            {!teacherProfile?.assigned_classes || teacherProfile.assigned_classes.length === 0 && <p className="text-xs text-muted-foreground mt-1">You are not assigned to any classes.</p>}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5"/> Class: {selectedClass}</CardTitle>
                <Button onClick={() => handleSaveAttendance(selectedClass)} size="sm" disabled={isSavingAttendance[selectedClass]}>
                    {isSavingAttendance[selectedClass] ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {isSavingAttendance[selectedClass] ? `Saving...` : `Save Attendance`}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!studentsByClass[selectedClass] || studentsByClass[selectedClass].length === 0) ? (
              <p className="text-muted-foreground text-center py-4">No students found for {selectedClass}.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[250px]">Student Name</TableHead><TableHead className="hidden sm:table-cell w-[150px]">Student ID</TableHead><TableHead>Attendance Status</TableHead><TableHead>Notes (Optional)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {studentsByClass[selectedClass].map((student) => {
                      const currentRecord = attendanceRecords[selectedClass]?.[student.student_id_display] || { status: "unmarked", notes: "" };
                      return (
                        <TableRow key={student.student_id_display}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{student.student_id_display}</TableCell>
                          <TableCell>
                            <RadioGroup value={currentRecord.status} onValueChange={(value) => handleAttendanceChange(selectedClass, student.student_id_display, value as AttendanceStatus | "unmarked")} className="flex space-x-2">
                              {(["present", "absent", "late"] as AttendanceStatus[]).map((statusOption) => (
                                <div key={statusOption} className="flex items-center space-x-2"><RadioGroupItem value={statusOption} id={`${student.student_id_display}-${statusOption}`} /><Label htmlFor={`${student.student_id_display}-${statusOption}`} className="capitalize">{statusOption}</Label></div>
                              ))}
                            </RadioGroup>
                          </TableCell>
                          <TableCell><Input type="text" placeholder="e.g., Left early" value={currentRecord.notes} onChange={(e) => handleNotesChange(selectedClass, student.student_id_display, e.target.value)} /></TableCell>
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
    </div>
  );
}
