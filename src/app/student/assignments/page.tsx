
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUp, Calendar, Download, Loader2, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import pool from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

interface StudentProfile {
  student_id_display: string; 
  full_name: string;
  grade_level: string;
  school_id: number;
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

// SERVER ACTION
async function fetchAssignmentsPageData(userId: string) {
    const client = await pool.connect();
    try {
        const { rows: profileRows } = await client.query('SELECT student_id_display, full_name, grade_level, school_id FROM students WHERE user_id = $1', [userId]);
        if (profileRows.length === 0) {
            throw new Error("Student profile not found.");
        }
        const profile = profileRows[0];

        const { rows: settingsRows } = await client.query('SELECT current_academic_year FROM schools WHERE id = $1', [profile.school_id]);
        const year = settingsRows[0]?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        
        const startYear = parseInt(year.split('-')[0], 10);
        const endYear = parseInt(year.split('-')[1], 10);
        const academicYearStartDate = `${startYear}-08-01`; 
        const academicYearEndDate = `${endYear}-07-31`;

        const { rows: assignmentRows } = await client.query(
            'SELECT * FROM assignments WHERE school_id = $1 AND class_id = $2 AND due_date >= $3 AND due_date <= $4 ORDER BY due_date ASC',
            [profile.school_id, profile.grade_level, academicYearStartDate, academicYearEndDate]
        );
        
        return { profile, assignments: assignmentRows, error: null };

    } catch (e: any) {
        return { error: e.message };
    } finally {
        client.release();
    }
}

export default function StudentAssignmentsPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const { toast } = useToast(); 
  const { user } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    
    async function loadData() {
        if (!isMounted.current || !user) {
            setError("Student not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }

        const { profile, assignments: fetchedAssignments, error: fetchError } = await fetchAssignmentsPageData(user.id);
        
        if(isMounted.current) {
            if(fetchError) {
                setError(fetchError);
            } else {
                setStudentProfile(profile as StudentProfile);
                setAssignments(fetchedAssignments as Assignment[]);
            }
            setIsLoading(false);
        }
    }

    loadData();

    return () => { isMounted.current = false; };
  }, [user]);
  
  const handleCopyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: "Assignment description copied to clipboard." }))
      .catch(err => toast({ title: "Error", description: "Could not copy text.", variant: "destructive" }));
  };

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
        Here are all the assignments for your class for the current academic year, ordered by the soonest due date.
      </CardDescription>

      {assignments.length === 0 ? (
        <Card className="shadow-md text-center py-12">
            <CardHeader><CardTitle>No Assignments Found</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">There are currently no assignments posted for your class for this academic year. Please check back later!</p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="shadow-md">
              <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span>Assigned by: {assignment.teacher_name}</span>
                            <span className="flex items-center"><Calendar className="mr-1.5 h-3 w-3" /> Due: {format(new Date(assignment.due_date + 'T00:00:00'), "PPP")}</span>
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(assignment.description)} className="h-8 w-8">
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy description</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
              </CardContent>
              {assignment.file_url && (
                <CardFooter>
                    <Button asChild variant="outline" size="sm">
                        <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" download>
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
