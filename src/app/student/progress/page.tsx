
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart2, Loader2, AlertCircle, TrendingUp, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { format } from "date-fns";

interface StudentProfile {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  total_paid_override?: number | null;
  school_id: number;
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

type FeeStatus = "checking" | "paid" | "unpaid" | "error";

export default function StudentProgressPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [academicResults, setAcademicResults] = useState<AcademicResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = createClient();
  const { user, isLoading: authLoading } = useAuth();
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");

  useEffect(() => {
    isMounted.current = true;
    if (authLoading) return; // wait until AuthProvider resolves session

    async function fetchStudentDataAndResults() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);
      setFeesPaidStatus("checking");

      try {
        if (!user) {
          throw new Error("Student not authenticated. Please log in to view your progress.");
        }

  const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select('student_id_display, full_name, grade_level, total_paid_override, school_id')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError) {
          throw new Error(`Could not load student profile: ${profileError.message}`);
        }
        
        if(isMounted.current) setStudentProfile(profileData);
        
        // --- Fee Check Logic ---
        const { data: schoolSettings, error: settingsError } = await supabase
          .from("schools").select("current_academic_year").eq('id', profileData.school_id).single();
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        const fetchedCurrentYear = schoolSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if(isMounted.current) setCurrentSystemAcademicYear(fetchedCurrentYear);

        const { data: feeStructure, error: feeError } = await supabase
          .from('school_fee_items')
          .select('grade_level, amount, academic_year')
          .eq('grade_level', profileData.grade_level)
          .eq('academic_year', fetchedCurrentYear);
        if (feeError) throw feeError;
        const totalFeesDue = (feeStructure || []).reduce((sum, item) => sum + item.amount, 0);
        
        let academicYearStartDate = "";
        let academicYearEndDate = "";
        if (fetchedCurrentYear && /^\d{4}-\d{4}$/.test(fetchedCurrentYear)) {
          const startYear = fetchedCurrentYear.substring(0, 4);
          const endYear = fetchedCurrentYear.substring(5, 9);
          academicYearStartDate = `${startYear}-08-01`; 
          academicYearEndDate = `${endYear}-07-31`;     
        }

        let paymentsQuery = supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('student_id_display', profileData.student_id_display);
        
        // Note: Date filtering removed - count ALL payments regardless of date
        // This ensures students can access progress if they've paid fees at any time
        // if (academicYearStartDate && academicYearEndDate) {
        //     paymentsQuery = paymentsQuery
        //       .gte('payment_date', academicYearStartDate)
        //       .lte('payment_date', academicYearEndDate);
        // }

        const { data: payments, error: paymentError } = await paymentsQuery;
        if (paymentError) throw paymentError;
        const totalPaidByPayments = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
        const overrideAmount = typeof profileData.total_paid_override === 'number' ? profileData.total_paid_override : 0;
        const finalTotalPaid = totalPaidByPayments + overrideAmount;
        
        const isPaid = totalFeesDue === 0 || finalTotalPaid >= totalFeesDue;
        if(isMounted.current) setFeesPaidStatus(isPaid ? "paid" : "unpaid");
        // --- End Fee Check ---
        
        if (!isPaid) {
            if(isMounted.current) setIsLoading(false);
            return; // Don't fetch results if fees are unpaid
        }

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
          setFeesPaidStatus("error");
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
    if (!academicResults || !Array.isArray(academicResults)) return [];
    return academicResults.map(result => ({
      name: `${result.term} ${result.year}`,
      average: result.overall_average ? parseFloat(result.overall_average) : 0,
    })).filter(item => item.average > 0);
  }, [academicResults]);

  const latestResult = (academicResults && academicResults.length > 0) ? academicResults[academicResults.length - 1] : null;

  const subjectScoreData = useMemo(() => {
      if (!latestResult || !latestResult.subject_results || !Array.isArray(latestResult.subject_results)) return [];
      return latestResult.subject_results.map(subject => ({
          subject: subject.subjectName,
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

  if (feesPaidStatus === 'unpaid') {
      return (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <Lock className="h-5 w-5" />
          <AlertTitle className="font-semibold">Access Denied: Outstanding Fees</AlertTitle>
          <AlertDescription>
            Your progress report is unavailable due to outstanding fee payments for {currentSystemAcademicYear}.
            Please clear your balance to access your academic performance data.
            <Button variant="link" asChild className="p-0 h-auto ml-2 text-destructive hover:text-destructive/80">
                <Link href="/student/fees">View Fee Statement</Link>
            </Button>
          </AlertDescription>
        </Alert>
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
                    <BarChart2 className="mr-3 h-6 w-6" /> Subject Performance (Latest Term)
                </CardTitle>
                <CardDescription>
                    A breakdown of your scores in different subjects for {latestResult?.term} {latestResult?.year}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                    <BarChart
                        data={subjectScoreData}
                        margin={{ top: 5, right: 20, left: -10, bottom: 50 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="subject"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ top: -4, right: 0 }}/>
                        <Bar dataKey="score" fill="var(--color-score)" radius={4} name="Score"/>
                    </BarChart>
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
