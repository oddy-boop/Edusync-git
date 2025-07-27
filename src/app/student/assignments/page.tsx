
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUp, Calendar, Download, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface StudentProfile {
  student_id_display: string; 
  full_name: string;
  grade_level: string;
}

interface Assignment {
  id: string;
  teacher_name: string;
  class_id: string;
  title: string;
  description: string;
  due_date: string; // ISO Date string (YYYY-MM-DD)
  file_url?: string | null;
  created_at: string;
}

export default function StudentAssignmentsPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast(); 
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();
    
    async function fetchStudentAndAssignmentData() {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabaseRef.current.auth.getUser();
        if (!user) {
            throw new Error("Student not authenticated. Please log in.");
        }

        const { data: profileData, error: profileError } = await supabaseRef.current
            .from("students")
            .select("student_id_display, full_name, grade_level")
            .eq("auth_user_id", user.id)
            .single();

        if (profileError) throw new Error(`Failed to find student profile: ${profileError.message}`);
        if (isMounted.current) setStudentProfile(profileData);

        const { data: fetchedAssignments, error: assignmentsError } = await supabaseRef.current
          .from('assignments')
          .select('*')
          .eq('class_id', profileData.grade_level)
          .order('due_date', { ascending: true });
        
        if (assignmentsError) throw assignmentsError;
        
        if (isMounted.current) setAssignments(fetchedAssignments || []);

      } catch (e: any) {
        console.error("Error fetching student assignments:", e);
        if (isMounted.current) setError(e.message || "An unknown error occurred.");
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchStudentAndAssignmentData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Please log in") && (
             <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!studentProfile) {
     return ( 
      <Card>
        <CardHeader><CardTitle>Student Not Found</CardTitle></CardHeader>
        <CardContent><p>Please log in with your account.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <BookUp className="mr-3 h-8 w-8" /> My Assignments
        </h2>
        <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
            <p><strong>Student:</strong> {studentProfile.full_name}</p>
            <p><strong>Class:</strong> {studentProfile.grade_level}</p>
        </div>
      </div>
      <CardDescription>
        Here are all the assignments for your class, ordered by the soonest due date.
      </CardDescription>

      {assignments.length === 0 ? (
        <Card className="shadow-md text-center py-12">
            <CardHeader><CardTitle>No Assignments Found</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">There are currently no assignments posted for your class. Please check back later!</p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span>Assigned by: {assignment.teacher_name}</span>
                    <span className="flex items-center"><Calendar className="mr-1.5 h-3 w-3" /> Due: {format(new Date(assignment.due_date + 'T00:00:00'), "PPP")}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
              </CardContent>
              {assignment.file_url && (
                <CardFooter>
                    <Button asChild variant="outline" size="sm">
                        <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" /> Download Attached File
                        </a>
                    </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
