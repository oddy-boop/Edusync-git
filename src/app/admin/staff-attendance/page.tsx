
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, UserCheck, CheckCircle2, XCircle, AlertTriangle, Plane, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface TeacherProfile {
  id: string; 
  auth_user_id: string; 
  full_name: string;
}

type AttendanceStatus = "Present" | "Absent" | "On Leave" | "Out of Range";

interface TeacherAttendanceSummary {
  teacher_id: string;
  full_name: string;
  total_present: number;
  total_absent: number;
  total_on_leave: number;
  total_out_of_range: number;
  today_status: AttendanceStatus | null;
}


export default function StaffAttendancePage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<TeacherAttendanceSummary[]>([]);
  const [filteredSummary, setFilteredSummary] = useState<TeacherAttendanceSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [teacherToUpdate, setTeacherToUpdate] = useState<TeacherAttendanceSummary | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus | "">("");
  const [notes, setNotes] = useState("");

  const todayDateString = format(new Date(), 'yyyy-MM-dd');

  const loadInitialData = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoading(true);

      try {
          const { data: teacherData, error: teacherError } = await supabaseRef.current
              .from('teachers').select('id, auth_user_id, full_name').order('full_name', { ascending: true });
          if (teacherError) throw teacherError;
          
          if (isMounted.current) setTeachers(teacherData || []);

          const [
              { data: allRecords, error: recordsError },
              { data: todayRecordsData, error: todayError }
          ] = await Promise.all([
                supabaseRef.current.from('staff_attendance').select('teacher_id, status'),
                supabaseRef.current.from('staff_attendance').select('teacher_id, status').eq('date', todayDateString)
          ]);
          
          if (recordsError) throw recordsError;
          if (todayError) throw todayError;


          if (isMounted.current) {
              const summaryMap: Record<string, Omit<TeacherAttendanceSummary, 'full_name' | 'today_status'>> = {};
              const todayStatusMap: Record<string, AttendanceStatus> = {};

              (teacherData || []).forEach(teacher => {
                  summaryMap[teacher.id] = {
                      teacher_id: teacher.id,
                      total_present: 0,
                      total_absent: 0,
                      total_on_leave: 0,
                      total_out_of_range: 0,
                  };
              });

              (allRecords || []).forEach(record => {
                  if (summaryMap[record.teacher_id]) {
                      switch (record.status as AttendanceStatus) {
                          case 'Present': summaryMap[record.teacher_id].total_present++; break;
                          case 'Absent': summaryMap[record.teacher_id].total_absent++; break;
                          case 'On Leave': summaryMap[record.teacher_id].total_on_leave++; break;
                          case 'Out of Range': summaryMap[record.teacher_id].total_out_of_range++; break;
                      }
                  }
              });

              (todayRecordsData || []).forEach(record => {
                  todayStatusMap[record.teacher_id] = record.status as AttendanceStatus;
              });
              
              const summaryArray = Object.values(summaryMap).map(summary => ({
                  ...summary,
                  full_name: (teacherData || []).find(t => t.id === summary.teacher_id)?.full_name || 'Unknown Teacher',
                  today_status: todayStatusMap[summary.teacher_id] || null,
              }));
              
              setAttendanceSummary(summaryArray);
              setFilteredSummary(summaryArray);
          }
          
      } catch (e: any) {
          if (isMounted.current) setError(`Failed to load data: ${e.message}`);
      } finally {
          if (isMounted.current) setIsLoading(false);
      }
  };

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const checkAdminSession = async () => {
        if (!isMounted.current || !supabaseRef.current) return;
        
        const { data: { session } } = await supabaseRef.current.auth.getSession();
        if (!session?.user) {
            if (isMounted.current) setError("Admin not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }
        if (isMounted.current) {
            setCurrentUser(session.user);
            await loadInitialData();
        }
    };
    checkAdminSession();
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = attendanceSummary.filter(item =>
        item.full_name.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredSummary(filtered);
  }, [searchTerm, attendanceSummary]);

  const handleOpenStatusModal = (teacher: TeacherAttendanceSummary) => {
    setTeacherToUpdate(teacher);
    setNewStatus(teacher.today_status || "");
    setNotes("");
    setIsStatusModalOpen(true);
  };
  
  const handleSaveStatus = async () => {
    if (!teacherToUpdate || !newStatus || !currentUser) {
      toast({ title: 'Error', description: 'Please select a teacher and a status.', variant: 'destructive' });
      return;
    }
    
    setIsSubmittingStatus(true);
    
    const record = {
      teacher_id: teacherToUpdate.teacher_id,
      date: todayDateString,
      status: newStatus,
      notes: `Manually set by admin: ${notes}`,
      marked_by_admin_id: currentUser.id,
    };
    
    try {
      const { error } = await supabaseRef.current!.from('staff_attendance').upsert(record, { onConflict: 'teacher_id,date' });
      if (error) throw error;
      
      toast({ title: 'Success', description: `Attendance for ${teacherToUpdate.full_name} updated to ${newStatus}.` });
      
      // Refresh data locally instead of full reload
      const updatedSummary = attendanceSummary.map(summary => {
        if (summary.teacher_id === teacherToUpdate.teacher_id) {
            return { ...summary, today_status: newStatus as AttendanceStatus };
        }
        return summary;
      });
      setAttendanceSummary(updatedSummary);

      setIsStatusModalOpen(false);

    } catch (e: any) {
      toast({ title: 'Error', description: `Could not update attendance: ${e.message}`, variant: 'destructive' });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const StatusIcon = ({ status }: { status: AttendanceStatus | null }) => {
    if (status === 'Present') return <CheckCircle2 className="text-green-600 h-5 w-5" title="Present"/>;
    if (status === 'Absent') return <XCircle className="text-red-600 h-5 w-5" title="Absent"/>;
    if (status === 'On Leave') return <Plane className="text-blue-600 h-5 w-5" title="On Leave"/>;
    if (status === 'Out of Range') return <AlertTriangle className="text-orange-600 h-5 w-5" title="Out of Range"/>;
    return <span className="text-muted-foreground text-xs">-</span>;
  };


  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error) {
    return <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <UserCheck className="mr-3 h-8 w-8" /> Staff Attendance Overview
      </h2>
      <CardDescription>A summary of attendance records for all staff members.</CardDescription>
      
      <Card>
        <CardHeader>
            <Input 
                placeholder="Search by teacher name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No teachers found in the system.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]">Staff Name</TableHead>
                        <TableHead className="text-center">Today's Status</TableHead>
                        <TableHead className="text-center">Total Present</TableHead>
                        <TableHead className="text-center">Total Absent</TableHead>
                        <TableHead className="text-center">Total On Leave</TableHead>
                        <TableHead className="text-center">Total Out of Range</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.map((summary) => (
                      <TableRow key={summary.teacher_id}>
                        <TableCell className="font-medium">{summary.full_name}</TableCell>
                        <TableCell className="text-center flex justify-center items-center">
                            <StatusIcon status={summary.today_status} />
                        </TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{summary.total_present}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{summary.total_absent}</TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">{summary.total_on_leave}</TableCell>
                        <TableCell className="text-center text-orange-600 font-semibold">{summary.total_out_of_range}</TableCell>
                        <TableCell className="text-center">
                            <Button variant="outline" size="sm" onClick={() => handleOpenStatusModal(summary)}><Edit className="mr-1 h-3 w-3"/>Set Status</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">This report summarizes all historical attendance data in the system.</p>
        </CardFooter>
      </Card>
      
      {teacherToUpdate && (
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Attendance for {teacherToUpdate.full_name}</DialogTitle>
                    <DialogDescription>Manually set the attendance status for {format(new Date(), 'PPP')}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="status-select">Status</Label>
                        <Select value={newStatus} onValueChange={(value) => setNewStatus(value as AttendanceStatus)}>
                            <SelectTrigger id="status-select">
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="On Leave">On Leave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="status-notes">Notes (Optional)</Label>
                        <Textarea id="status-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Called in sick"/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveStatus} disabled={isSubmittingStatus || !newStatus}>
                        {isSubmittingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Save Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

