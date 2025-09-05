"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, User, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimetableEntry {
  id: string;
  subject: string;
  period: string;
  day_of_week: string;
  teacher_id: string;
}

interface StudentProfile {
  student_id_display: string;
  grade_level: string;
  school_id: number;
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentTimetablePage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    isMounted.current = true;
    
    async function loadData() {
      if (authLoading) return;
      if (!isMounted.current || !user) {
        setError("Student not authenticated. Please log in.");
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('students')
          .select('student_id_display, grade_level, school_id')
          .eq('auth_user_id', user.id)
          .single();
        
        if (profileError) throw profileError;
        if (!profile) throw new Error("Student profile not found.");

        setStudentProfile(profile as StudentProfile);

        const { data: timetable, error: fetchError } = await supabase
          .from('timetable_entries')
          .select('id, subject, period, day_of_week, teacher_id')
          .eq('class_id', profile.grade_level)
          .order('day_of_week')
          .order('period');
        
        if (fetchError) throw fetchError;
        setTimetableEntries(timetable as TimetableEntry[]);
        
      } catch (e: any) {
        setError(e.message);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    loadData();

    return () => { isMounted.current = false; };
  }, [user, supabase, authLoading]);

  const groupedTimetable = timetableEntries.reduce((acc, entry) => {
    if (!acc[entry.day_of_week]) {
      acc[entry.day_of_week] = [];
    }
    acc[entry.day_of_week].push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your timetable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">My Timetable</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-headline font-semibold text-primary">My Timetable</h2>
      </div>
      
      {studentProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Class {studentProfile.grade_level} Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {timetableEntries.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No timetable entries found for your class.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your teacher hasn't uploaded the timetable yet or you may not be assigned to a class.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {DAYS_ORDER.map(day => {
                  const dayEntries = groupedTimetable[day] || [];
                  if (dayEntries.length === 0) return null;
                  
                  return (
                    <div key={day} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                        {day}
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {dayEntries.map(entry => (
                          <div key={entry.id} className="border rounded-lg p-4 space-y-2 bg-card">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">{entry.period}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span>{entry.subject}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
