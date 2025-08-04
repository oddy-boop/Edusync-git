
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserCheck, Loader2, AlertCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { format } from "date-fns";

interface TeacherProfile {
  id: string; 
  auth_user_id: string; 
  full_name: string;
}

type AttendanceStatus = "Present" | "Absent" | "On Leave";

interface StaffAttendanceRecord {
  status: AttendanceStatus | "Unmarked";
  notes: string;
}

export default function StaffAttendancePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, StaffAttendanceRecord>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const todayDateString = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const loadInitialData = async () => {
        if (!isMounted.current || !supabaseRef.current) return;
        setIsLoading(true);

        const { data: { session } } = await supabaseRef.current.auth.getSession();
        if (!session?.user) {
            if (isMounted.current) setError("Admin not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }

        if(isMounted.current) setAuthUser(session.user);

        try {
            const { data: teacherData, error: teacherError } = await supabaseRef.current
                .from('teachers').select('id, auth_user_id, full_name').order('full_name', { ascending: true });
            if (teacherError) throw teacherError;
            
            if (isMounted.current) setTeachers(teacherData || []);

            const { data: todaysRecords, error: recordsError } = await supabaseRef.current
                .from('staff_attendance').select('teacher_id, status, notes').eq('date', todayDateString);
            if (recordsError) throw recordsError;
            
            if (isMounted.current) {
                const initialRecords: Record<string, StaffAttendanceRecord> = {};
                (teacherData || []).forEach(teacher => {
                    const existingRecord = (todaysRecords || []).find(r => r.teacher_id === teacher.id);
                    initialRecords[teacher.id] = {
                        status: (existingRecord?.status as AttendanceStatus) || "Unmarked",
                        notes: existingRecord?.notes || ""
                    };
                });
                setAttendanceRecords(initialRecords);
            }
            
        } catch (e: any) {
            if (isMounted.current) setError(`Failed to load data: ${e.message}`);
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    loadInitialData();

    return () => { isMounted.current = false; };
  }, []);

  const handleAttendanceChange = (teacherId: string, status: AttendanceStatus | "Unmarked") => {
    setAttendanceRecords(prev => ({
      ...prev, [teacherId]: { ...(prev[teacherId] || { status: "Unmarked", notes: "" }), status: status }
    }));
  };

  const handleNotesChange = (teacherId: string, notes: string) => {
     setAttendanceRecords(prev => ({
      ...prev, [teacherId]: { ...(prev[teacherId] || { status: "Unmarked", notes: "" }), notes: notes }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!authUser) {
      toast({ title: "Error", description: "Authentication error.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);

    const recordsToSave = Object.entries(attendanceRecords)
      .filter(([_, record]) => record.status !== "Unmarked")
      .map(([teacherId, record]) => ({
        teacher_id: teacherId,
        date: todayDateString,
        status: record.status,
        notes: record.notes || null,
        marked_by_admin_id: authUser.id,
      }));
    
    if (recordsToSave.length === 0) {
      toast({ title: "No changes", description: "No attendance has been marked to save.", variant: "default" });
      setIsSaving(false);
      return;
    }

    try {
        const { error: upsertError } = await (supabaseRef.current as SupabaseClient)
            .from('staff_attendance')
            .upsert(recordsToSave, { onConflict: 'teacher_id,date' });

        if (upsertError) throw upsertError;
        
        toast({ title: "Success", description: `Attendance for ${recordsToSave.length} staff member(s) saved successfully.` });
    } catch (e: any) {
        toast({ title: "Save Failed", description: `Could not save attendance: ${e.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsSaving(false);
    }
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
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <UserCheck className="mr-3 h-8 w-8" /> Staff Attendance
      </h2>
      <p className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md w-fit">Date: {todayDisplay}</p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Mark Today's Staff Attendance</CardTitle>
          <CardDescription>Select the status for each staff member for today.</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No teachers found in the system to mark attendance for.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-[250px]">Staff Name</TableHead><TableHead>Attendance Status</TableHead><TableHead>Notes (Optional)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {teachers.map((teacher) => {
                    const currentRecord = attendanceRecords[teacher.id] || { status: "Unmarked", notes: "" };
                    return (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.full_name}</TableCell>
                        <TableCell>
                          <RadioGroup value={currentRecord.status} onValueChange={(value) => handleAttendanceChange(teacher.id, value as AttendanceStatus | "Unmarked")} className="flex space-x-2 sm:space-x-4">
                            {(["Present", "Absent", "On Leave"] as AttendanceStatus[]).map((statusOption) => (
                              <div key={statusOption} className="flex items-center space-x-2"><RadioGroupItem value={statusOption} id={`${teacher.id}-${statusOption}`} /><Label htmlFor={`${teacher.id}-${statusOption}`} className="capitalize">{statusOption}</Label></div>
                            ))}
                          </RadioGroup>
                        </TableCell>
                        <TableCell><Input type="text" placeholder="e.g., Sick leave, Workshop" value={currentRecord.notes} onChange={(e) => handleNotesChange(teacher.id, e.target.value)} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveAttendance} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Save All Attendance
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
