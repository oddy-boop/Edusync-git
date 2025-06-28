"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart2, Loader2, AlertCircle, TrendingUp, CheckSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { format } from "date-fns";

interface StudentProfile {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface SubjectResultDisplay {
  subjectName: string;
  totalScore?: string;
  [key: string]: any;
}

interface AcademicResult {
  id: string;
  term: string;
  year: string;
  overall_average?: string | null;
  subject_results: SubjectResultDisplay[];
  published_at?: string | null;
}

export default function StudentProgressPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [academicResults, setAcademicResults] = useState<AcademicResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;

    async function fetchStudentDataAndResults() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Student not authenticated. Please log in to view your progress.");
        }

        const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select('student_id_display, full_name, grade_level')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!profileData) {
          throw new Error("Student profile not found. Please contact administration.");
        }
        
        if(isMounted.current) setStudentProfile(profileData);

        const today = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        const { data: resultsData, error: resultsError } = await supabase
          .from('academic_results')
          .select('id, term, year, overall_average, subject_results, published_at')
          .eq('student_id_display', profileData.student_id_display)
          .eq('approval_status', ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED)
          .not('published_at', 'is', null)
          .lte('published_at', today)
          .order('year', { ascending: true })
          .order('term', { ascending: true });
        
        if (resultsError) throw resultsError;

        if (isMounted.current) {
            setAcademicResults(resultsData || []);
        }

      } catch (e: any) {
        console.error("Error fetching data for progress page:", e);
        if (isMounted.current) {
          setError(`Failed to load your progress data: ${e.message}`);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    fetchStudentDataAndResults();

    return () => {
      isMounted.current = false;
    };
  }, [supabase]);
  
  const trendData = useMemo(() => {
    return academicResults.map(result => ({
      name: `${result.term} ${result.year}`,
      average: result.overall_average ? parseFloat(result.overall_average) : 0,
    })).filter(item => item.average > 0);
  }, [academicResults]);

  const latestResult = academicResults.length > 0 ? academicResults[academicResults.length - 1] : null;

  const radarData = useMemo(() => {
      if (!latestResult) return [];
      return latestResult.subject_results.map(subject => ({
          subject: subject.subjectName.substring(0, 15), // Shorten long subject names
          score: subject.totalScore ? parseFloat(subject.totalScore) : 0,
          fullMark: 100,
      })).filter(item => item.score > 0);
  }, [latestResult]);
  
  const chartConfig = {
      average: {
        label: "Average Score",
        color: "hsl(var(--chart-1))",
      },
      score: {
          label: "Score",
          color: "hsl(var(--chart-2))",
      }
  };


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
        Track your academic journey with visualizations of your performance over time.
      </CardDescription>
      
      {academicResults.length === 0 ? (
        <Card className="shadow-md text-center py-12">
            <CardHeader><CardTitle>No Progress Data Available</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground">There are no published results available to generate your progress report. Please check back later.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90">
                <TrendingUp className="mr-3 h-6 w-6" /> Overall Average Score Trend
              </CardTitle>
              <CardDescription>This chart shows your overall average score across different academic terms.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                  <BarChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis />
                    <Tooltip cursor={false} content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="average" fill="var(--color-average)" radius={4} />
                  </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary/90">
                    <Activity className="mr-3 h-6 w-6" /> Subject Performance Overview (Latest Term)
                </CardTitle>
                <CardDescription>
                    A snapshot of your scores in different subjects for {latestResult?.term} {latestResult?.year}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                    <RadarChart data={radarData}>
                        <CartesianGrid />
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Radar name="Score" dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.6} />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-md mt-6">
        <CardHeader>
            <CardTitle>Development Note</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Attendance and assignment completion tracking are planned for a future update.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
