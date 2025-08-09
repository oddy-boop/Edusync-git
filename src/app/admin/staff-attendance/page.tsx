
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, UserCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';

interface TeacherProfile {
  id: string; 
  auth_user_id: string; 
  full_name: string;
}

interface StaffAttendanceRecord {
  teacher_id: string;
  status: "Present" | "Absent" | "On Leave" | "Out of Range";
}

interface TeacherAttendanceSummary {
  teacher_id: string;
  full_name: string;
  total_present: number;
  total_absent: number;
  total_on_leave: number;
  total_out_of_range: number;
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

        try {
            const { data: teacherData, error: teacherError } = await supabaseRef.current
                .from('teachers').select('id, auth_user_id, full_name').order('full_name', { ascending: true });
            if (teacherError) throw teacherError;
            
            if (isMounted.current) setTeachers(teacherData || []);

            const { data: allRecords, error: recordsError } = await supabaseRef.current
                .from('staff_attendance').select('teacher_id, status');
            if (recordsError) throw recordsError;

            if (isMounted.current) {
                const summaryMap: Record<string, Omit<TeacherAttendanceSummary, 'full_name'>> = {};

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
                        switch (record.status) {
                            case 'Present': summaryMap[record.teacher_id].total_present++; break;
                            case 'Absent': summaryMap[record.teacher_id].total_absent++; break;
                            case 'On Leave': summaryMap[record.teacher_id].total_on_leave++; break;
                            case 'Out of Range': summaryMap[record.teacher_id].total_out_of_range++; break;
                        }
                    }
                });
                
                const summaryArray = Object.values(summaryMap).map(summary => ({
                    ...summary,
                    full_name: (teacherData || []).find(t => t.id === summary.teacher_id)?.full_name || 'Unknown Teacher'
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

    loadInitialData();

    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = attendanceSummary.filter(item =>
        item.full_name.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredSummary(filtered);
  }, [searchTerm, attendanceSummary]);


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
                        <TableHead className="w-[300px]">Staff Name</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">On Leave</TableHead>
                        <TableHead className="text-center">Out of Range</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.map((summary) => (
                      <TableRow key={summary.teacher_id}>
                        <TableCell className="font-medium">{summary.full_name}</TableCell>
                        <TableCell className="text-center text-green-600 font-semibold">{summary.total_present}</TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">{summary.total_absent}</TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">{summary.total_on_leave}</TableCell>
                        <TableCell className="text-center text-orange-600 font-semibold">{summary.total_out_of_range}</TableCell>
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
    </div>
  );
}
