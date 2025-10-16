
"use client";

// Use the dashboard layout wrapper provided by teacher layout; avoid nested AuthLayout to prevent duplicate header/footer
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Loader2, BookCheck, Users, X, Clock, Check } from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

type AttendanceMark = 'present' | 'absent' | 'late';

export default function TeacherRegisterPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    async function load() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // Not authenticated — show original registration-disabled card below
          setTeacherProfile(null);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('teachers')
          .select('id, auth_user_id, full_name, assigned_classes, school_id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) {
          // Not a registered teacher (keep registration-disabled)
          setTeacherProfile(null);
          return;
        }
        if (!isMounted.current) return;
        setTeacherProfile(profileData);

  // request all student columns to be tolerant of either `name` or `full_name` column variants
  let studentQuery = supabase.from('students').select('*').eq('school_id', profileData.school_id);
        if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
          studentQuery = studentQuery.in('grade_level', profileData.assigned_classes);
        }
        const { data: fetchedStudents, error: studentsError } = await studentQuery;
        if (studentsError) throw studentsError;
        if (!isMounted.current) return;
        setStudents(fetchedStudents || []);

        // initialize marks map defaulting to 'present'
        const initialMarks: Record<string, AttendanceMark> = {} as any;
        (fetchedStudents || []).forEach((s: any) => { initialMarks[s.student_id_display] = 'present'; });
        setMarks(initialMarks);

        // load existing attendance for today's date (or selected date)
        try {
          const studentIds = (fetchedStudents || []).map((s: any) => s.student_id_display);
          if (studentIds.length > 0) {
            const { data: existing, error: existingError } = await supabase
              .from('attendance_records')
              .select('student_id_display, status')
              .in('student_id_display', studentIds)
              .eq('date', date);
            if (existingError) throw existingError;
            if (existing && existing.length > 0) {
              const updatedMarks = { ...initialMarks } as Record<string, AttendanceMark>;
              existing.forEach((r: any) => {
                if (r.student_id_display && r.status) {
                  updatedMarks[r.student_id_display] = r.status;
                }
              });
              setMarks(updatedMarks);
            }
          }
        } catch (e: any) {
          console.warn('Could not load existing attendance for date', e);
        }
      } catch (e: any) {
        console.error('Error loading register page', e);
        toast({ title: 'Error', description: e?.message || String(e), variant: 'destructive' });
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted.current = false; };
  }, [supabase, toast]);

  // Hide sidebar logo and duplicate footers while this page is mounted to keep page neat
  useEffect(() => {
    // hide logo anchors that include an image or svg (site branding)
    const logoAnchors = Array.from(document.querySelectorAll('a[href="/"]')) as HTMLAnchorElement[];
    const hiddenAnchors: HTMLAnchorElement[] = [];
    logoAnchors.forEach(a => {
      if (a.querySelector('img') || a.querySelector('svg')) {
        a.style.display = 'none';
        hiddenAnchors.push(a);
      }
    });

    // Hide duplicate footers: keep the first footer and hide the rest
    const footers = Array.from(document.querySelectorAll('footer')) as HTMLElement[];
    if (footers.length > 1) {
      footers.slice(1).forEach(f => { f.style.display = 'none'; });
    }

    return () => {
      hiddenAnchors.forEach(a => { a.style.display = ''; });
      if (footers.length > 1) {
        footers.slice(1).forEach(f => { f.style.display = ''; });
      }
    };
  }, []);

  const saveAttendance = async () => {
    if (!teacherProfile) return;
    setIsLoading(true);
    try {
      const studentIds = Object.keys(marks);

      // Fetch existing records for these students on the selected date
      const { data: existing, error: fetchErr } = await supabase
        .from('attendance_records')
        .select('id, student_id_display')
        .in('student_id_display', studentIds)
        .eq('date', date);

      if (fetchErr) throw fetchErr;

      const existingMap: Record<string, string> = {};
      (existing || []).forEach((r: any) => { existingMap[r.student_id_display] = r.id; });

      const toInsert: any[] = [];
      const toUpdate: { id: string; status: AttendanceMark }[] = [];

      studentIds.forEach(studentId => {
        const status = marks[studentId];
        const student = students.find(s => s.student_id_display === studentId);
        const payload = {
          school_id: teacherProfile.school_id,
          student_id_display: studentId,
          class_id: student?.grade_level || '',
          date: date,
          status,
          marked_by_teacher_auth_id: teacherProfile.auth_user_id,
        };
        const existingId = existingMap[studentId];
        if (existingId) {
          toUpdate.push({ id: existingId, status });
        } else {
          toInsert.push(payload);
        }
      });

      // Debug: log payloads
      console.log('Attendance save payloads', { toInsert, toUpdate });

      // Perform inserts for new records
      if (toInsert.length > 0) {
        const insertResp = await supabase.from('attendance_records').insert(toInsert);
        console.log('insertResp', insertResp);
        if (insertResp.error) throw insertResp.error;
      }

      // Perform updates for existing records (one by one to allow different statuses)
      for (const u of toUpdate) {
        const updResp = await supabase.from('attendance_records').update({ status: u.status, marked_by_teacher_auth_id: teacherProfile.auth_user_id }).eq('id', u.id);
        console.log('updateResp for', u.id, updResp);
        if (updResp.error) throw updResp.error;
      }
      toast({ title: 'Saved', description: 'Attendance recorded successfully.' });
    } catch (e: any) {
      console.error('Save failed', e);
      toast({ title: 'Save failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMark = (studentId: string, value: AttendanceMark) => {
    setMarks(prev => ({ ...prev, [studentId]: value }));
  };

  // Checkbox-style toggle: checking a box sets that status; checking it again reverts to 'present'
  const toggleMarkCheckbox = (studentId: string, value: AttendanceMark) => {
    setMarks(prev => ({ ...prev, [studentId]: prev[studentId] === value ? 'present' : value }));
  };

  const markAll = (value: AttendanceMark) => {
    setMarks(prev => {
      const next = { ...prev };
      const targetStudents = filteredStudents.map(s => s.student_id_display);
      targetStudents.forEach(id => { next[id] = value; });
      return next;
    });
  };

  // If loading, show spinner inside the dashboard content area (avoid AuthLayout to prevent duplicate header/footer)
  if (isLoading) {
    return (
      <div className="p-4 w-full">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-headline font-semibold text-primary">Teacher Register</h1>
            <p className="text-muted-foreground mt-1">Mark students' attendance in a class register.</p>
          </div>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p className="text-muted-foreground">Loading register...</p>
          </div>
        </div>
      </div>
    );
  }

  // If teacherProfile is null (either not authenticated or not a teacher), show the original registration-disabled card but inside dashboard layout
  if (!teacherProfile) {
    return (
      <div className="p-4 w-full">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-headline font-semibold text-primary">Teacher Registration</h1>
            <p className="text-muted-foreground mt-1">This page is for initial setup only.</p>
          </div>
          <Card className="shadow-lg border-destructive/50 bg-destructive/5">
              <CardHeader>
                  <CardTitle className="flex items-center text-destructive"><AlertCircle className="mr-2 h-5 w-5"/> Teacher Registration Disabled</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-destructive/90">
                    For security reasons, new teachers can no longer register from this public page. Teachers must be invited by an administrator from within the application dashboard.
                </CardDescription>
                <Button asChild className="mt-4 w-full" variant="secondary">
                    <Link href="/auth/teacher/login">Return to Teacher Login</Link>
                </Button>
              </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const filteredStudents = selectedClass === 'all' ? students : students.filter(s => s.grade_level === selectedClass);

  return (
    <div className="p-4 w-full">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-headline font-semibold text-primary">Class Register</h1>
          <p className="text-muted-foreground mt-1">Mark attendance for students in your assigned classes.</p>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center"><BookCheck className="mr-2"/> Class Register</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
              {teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0 && (
                <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v)}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Filter class"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assigned Classes</SelectItem>
                    {teacherProfile.assigned_classes.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <input
                type="date"
                value={date}
                title="Select attendance date"
                onChange={async (e) => {
                  setDate(e.target.value);
                  // when date changes, reload existing attendance for that date
                  setIsLoading(true);
                  try {
                    const studentIds = (students || []).map(s => s.student_id_display);
                    if (studentIds.length > 0) {
                      const { data: existing, error: existingError } = await supabase
                        .from('attendance_records')
                        .select('student_id_display, status')
                        .in('student_id_display', studentIds)
                        .eq('date', e.target.value);
                      if (existingError) throw existingError;
                      if (existing && existing.length > 0) {
                        const updatedMarks = { ...(marks || {}) } as Record<string, AttendanceMark>;
                        existing.forEach((r: any) => {
                          if (r.student_id_display && r.status) updatedMarks[r.student_id_display] = r.status;
                        });
                        setMarks(updatedMarks);
                      } else {
                        // reset to present
                        const resetMarks: Record<string, AttendanceMark> = {} as any;
                        (students || []).forEach((s: any) => { resetMarks[s.student_id_display] = 'present'; });
                        setMarks(resetMarks);
                      }
                    }
                  } catch (err) {
                    console.warn('Error reloading marks for date change', err);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="input input-bordered"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:ml-2 w-full sm:w-auto gap-2">
                <div className="flex gap-2">
                  <Button onClick={saveAttendance} disabled={isLoading}>Save</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <Button size="sm" variant="ghost" onClick={() => markAll('present')}>Mark All Present</Button>
                  <Button size="sm" variant="destructive" onClick={() => markAll('absent')}>Mark All Absent</Button>
                  <Button size="sm" variant="outline" onClick={() => markAll('late')}>Mark All Late</Button>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2"/> Students ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <p className="text-muted-foreground">No students found for the selected class.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Full name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map(s => (
                        <TableRow key={s.student_id_display}>
                          <TableCell className="font-mono text-sm">{s.student_id_display}</TableCell>
                          <TableCell>{s.name || s.full_name || s.fullName || ''}</TableCell>
                          <TableCell>{s.grade_level}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={marks[s.student_id_display] === 'present'}
                                onCheckedChange={() => toggleMarkCheckbox(s.student_id_display, 'present')}
                                aria-label={`Present for ${s.student_id_display}`}
                              />
                              <Check className="ml-2 text-green-600" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={marks[s.student_id_display] === 'absent'}
                                onCheckedChange={() => toggleMarkCheckbox(s.student_id_display, 'absent')}
                                aria-label={`Absent for ${s.student_id_display}`}
                              />
                              <X className="ml-2 text-red-600" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={marks[s.student_id_display] === 'late'}
                                onCheckedChange={() => toggleMarkCheckbox(s.student_id_display, 'late')}
                                aria-label={`Late for ${s.student_id_display}`}
                              />
                              <Clock className="ml-2 text-yellow-600" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">Mark attendance then click Save. Records are saved per date.</CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
