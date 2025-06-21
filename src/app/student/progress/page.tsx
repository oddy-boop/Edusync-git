
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BarChart2, Loader2, AlertCircle, TrendingUp, CheckSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { getSupabase } from "@/lib/supabaseClient";

interface StudentProfile {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface ProgressSection {
  title: string;
  icon: React.ElementType;
  description: string;
  dataAiHint?: string;
}

export default function StudentProgressPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;

    async function fetchStudentData() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Student not authenticated. Please log in to view your progress.");
        }

        const { data: profileData, error: fetchError } = await supabase
          .from('students')
          .select('student_id_display, full_name, grade_level')
          .eq('auth_user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (!profileData) {
          if (isMounted.current) {
            setError("Student profile not found. Please contact administration.");
          }
        } else {
          if (isMounted.current) {
            setStudentProfile(profileData);
          }
        }
      } catch (e: any) {
        console.error("Error fetching student profile for progress page:", e);
        if (isMounted.current) {
          setError(`Failed to load your profile data: ${e.message}`);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    fetchStudentData();

    return () => {
      isMounted.current = false;
    };
  }, [supabase]);

  const progressSections: ProgressSection[] = [
    {
      title: "Overall Academic Performance",
      icon: TrendingUp,
      description: "View your overall GPA, average scores, and class ranking (if available). Charts will show your performance trends over different terms or academic years.",
      dataAiHint: "academic graph chart"
    },
    {
      title: "Subject-Specific Analysis",
      icon: BarChart2,
      description: "Deep dive into your performance in each subject. Compare scores, identify strengths, and see areas needing improvement with detailed charts and metrics.",
      dataAiHint: "subject performance"
    },
    {
      title: "Attendance Record Summary",
      icon: CheckSquare,
      description: "Track your attendance percentage, number of days present, absent, or late. Visual aids will help you monitor your regularity.",
      dataAiHint: "attendance calendar"
    },
    {
      title: "Assignment & Task Completion",
      icon: Activity,
      description: "Monitor your assignment submission rates, grades on assignments, and overall task completion. This section will help you stay on top of your coursework.",
      dataAiHint: "task checklist"
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your progress dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Progress
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
        <CardHeader><CardTitle>Student Information Not Available</CardTitle></CardHeader>
        <CardContent>
          <p>We couldn't load your details. Please try logging in again or contact support.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <BarChart2 className="mr-3 h-8 w-8" /> My Academic Progress
        </h2>
        <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
          <p><strong>Student:</strong> {studentProfile.full_name}</p>
          <p><strong>Class:</strong> {studentProfile.grade_level}</p>
        </div>
      </div>
      <CardDescription>
        Track your academic journey, view performance trends, and monitor your attendance and assignment completion. 
      </CardDescription>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {progressSections.map((section) => (
          <Card key={section.title} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90">
                <section.icon className="mr-3 h-6 w-6" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-foreground/70">
                {section.description}
              </p>
              <div className="mt-4 text-center text-muted-foreground italic">
                (Progress data and visualizations will appear here soon)
              </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" className="w-full" disabled>
                    View Detailed {section.title.replace(" Summary", "").replace(" Analysis", "")} (Coming Soon)
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <Card className="shadow-md mt-6">
        <CardHeader>
            <CardTitle>Development Note</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                This "My Progress" page is currently a structural placeholder. Future development will integrate actual academic data from Supabase to provide meaningful visualizations and insights.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
