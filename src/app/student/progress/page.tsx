
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Loader2, AlertCircle, UserCircle, TrendingUp, PieChart, CheckSquare, Activity } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent"; // Re-using for detailed sections

interface StudentProfile {
  studentId: string;
  fullName: string;
  gradeLevel: string;
}

interface ProgressSection {
  title: string;
  icon: React.ElementType;
  description: string;
  dataAiHint?: string; // For placeholder images if we add them
}

export default function StudentProgressPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function fetchStudentData() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      let studentId: string | null = null;
      if (typeof window !== "undefined") {
        studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      }

      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view your progress.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const studentDocRef = doc(db, "students", studentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
          if (isMounted.current) {
            setError("Student profile not found. Please contact administration.");
          }
        } else {
          const profile = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as StudentProfile;
          if (isMounted.current) {
            setStudentProfile(profile);
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
  }, []);

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
      icon: Activity, // Replaced PieChart with Activity for a more general "progress" feel
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
             <Button asChild className="mt-4"><Link href="/student/login">Go to Login</Link></Button>
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
         <Button asChild className="mt-4"><Link href="/student/login">Go to Login</Link></Button>
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
          <p><strong>Student:</strong> {studentProfile.fullName}</p>
          <p><strong>Class:</strong> {studentProfile.gradeLevel}</p>
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
              {/* 
                This is where actual data/charts would go. 
                For now, using a more descriptive placeholder text.
              */}
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
                This "My Progress" page is currently a structural placeholder. Future development will integrate actual academic data, including grades, attendance records, and assignment statuses, to provide meaningful visualizations and insights into your progress.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
