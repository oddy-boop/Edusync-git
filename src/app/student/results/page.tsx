
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookCheck, Lock, AlertCircle, Loader2, CheckCircle2, BarChartHorizontalBig } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface StudentProfileFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  total_paid_override?: number | null;
}

interface FeeItemFromSupabase {
  grade_level: string;
  amount: number;
  academic_year: string;
}

interface FeePaymentFromSupabase {
  amount_paid: number;
}

interface SubjectResultDisplay {
  subjectName: string;
  score?: string;
  grade: string;
  remarks?: string;
}

interface AcademicResultFromSupabase {
  id: string;
  class_id: string; // Grade Level
  student_id_display: string;
  student_name: string; // Denormalized
  term: string;
  year: string;
  subject_results: SubjectResultDisplay[]; // Assuming JSONB
  overall_average?: string | null;
  overall_grade?: string | null;
  overall_remarks?: string | null;
  teacher_id?: string | null; // UUID of teacher from teachers table
  teacher_name?: string | null; // Denormalized
  published_at?: string | null; // ISO Date string
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
}

type FeeStatus = "checking" | "paid" | "unpaid" | "error";

export default function StudentResultsPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfileFromSupabase | null>(null);
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [academicResults, setAcademicResults] = useState<AcademicResultFromSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");


  useEffect(() => {
    isMounted.current = true;

    async function checkFeeStatusAndLoadData() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      setError(null);
      setFeesPaidStatus("checking");

      let studentId: string | null = null;
      studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);

      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in.");
          setFeesPaidStatus("error");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch app settings for current academic year
        const { data: appSettings, error: settingsError } = await supabase
          .from("app_settings")
          .select("current_academic_year")
          .eq("id", 1)
          .single();
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        const fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) setCurrentSystemAcademicYear(fetchedCurrentYear);

        // Fetch student profile
        const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select('student_id_display, full_name, grade_level, total_paid_override')
          .eq('student_id_display', studentId)
          .single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        if (!profileData) {
          if (isMounted.current) { setError("Student profile not found."); setFeesPaidStatus("error"); }
          setIsLoading(false); return;
        }
        if (isMounted.current) setStudentProfile(profileData as StudentProfileFromSupabase);

        // Fetch fee structure for student's grade and current year
        const { data: feeStructure, error: feeError } = await supabase
          .from('school_fee_items')
          .select('grade_level, amount, academic_year')
          .eq('grade_level', profileData.grade_level)
          .eq('academic_year', fetchedCurrentYear);
        if (feeError) throw feeError;
        const totalFeesDue = (feeStructure || []).reduce((sum, item) => sum + item.amount, 0);
        
        // Determine date range for the current academic year
        let academicYearStartDate = "";
        let academicYearEndDate = "";
        if (fetchedCurrentYear && /^\d{4}-\d{4}$/.test(fetchedCurrentYear)) {
          const startYear = fetchedCurrentYear.substring(0, 4);
          const endYear = fetchedCurrentYear.substring(5, 9);
          academicYearStartDate = `${startYear}-08-01`; 
          academicYearEndDate = `${endYear}-07-31`;     
        }

        // Fetch payments for student within the current academic year
        let paymentsQuery = supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('student_id_display', studentId);
        
        if (academicYearStartDate && academicYearEndDate) {
            paymentsQuery = paymentsQuery
              .gte('payment_date', academicYearStartDate)
              .lte('payment_date', academicYearEndDate);
        }

        const { data: payments, error: paymentError } = await paymentsQuery;
        if (paymentError) throw paymentError;
        const totalPaidByPayments = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
        const finalTotalPaid = typeof profileData.total_paid_override === 'number' ? profileData.total_paid_override : totalPaidByPayments;

        if (isMounted.current) {
          const isPaid = totalFeesDue === 0 || finalTotalPaid >= totalFeesDue;
          setFeesPaidStatus(isPaid ? "paid" : "unpaid");

          if (isPaid) {
            setIsLoadingResults(true);
            const { data: resultsData, error: resultsError } = await supabase
              .from('academic_results')
              .select('*')
              .eq('student_id_display', studentId)
              .order('year', { ascending: false })
              .order('term', { ascending: false }) // Assuming terms have a sortable order or will be handled client-side
              .order('created_at', { ascending: false });

            if (resultsError) throw resultsError;
            if(isMounted.current) setAcademicResults(resultsData as AcademicResultFromSupabase[] || []);
            setIsLoadingResults(false);
          }
        }
      } catch (e: any) {
        console.error("Error checking fee status/loading results:", e);
        if (isMounted.current) { setError(`Operation failed: ${e.message}`); setFeesPaidStatus("error"); }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    checkFeeStatusAndLoadData();

    return () => { isMounted.current = false; };
  }, [supabase]);


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Results</h2>

      {isLoading && (
        <Card className="shadow-md">
          <CardHeader><CardTitle className="flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying Access...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Please wait while we check your fee payment status and load results from Supabase.</p></CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" /><AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            {error.includes("Please log in") && (
                <Button variant="link" asChild className="p-0 h-auto ml-1 text-destructive hover:text-destructive/80">
                    <Link href="/auth/student/login">Go to Login</Link>
                </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && feesPaidStatus === "unpaid" && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <Lock className="h-5 w-5" />
          <AlertTitle className="font-semibold">Access Denied: Outstanding Fees</AlertTitle>
          <AlertDescription>
            Your results are currently unavailable due to outstanding fee payments for {currentSystemAcademicYear}.
            Please clear your balance to access your academic records.
            <Button variant="link" asChild className="p-0 h-auto ml-2 text-destructive hover:text-destructive/80">
                <Link href="/student/fees">View Fee Statement</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && feesPaidStatus === "paid" && (
        <>
            <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-700 dark:border-green-500 [&>svg]:text-green-600">
              <CheckCircle2 className="h-5 w-5" /><AlertTitle className="font-semibold">Fee Status: Cleared for {currentSystemAcademicYear}</AlertTitle>
              <AlertDescription>
                Your fee payments appear to be up to date. Your academic results are displayed below.
              </AlertDescription>
            </Alert>

            {isLoadingResults && (
                <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-6 w-6 animate-spin"/>Loading results from Supabase...</div>
            )}

            {!isLoadingResults && academicResults.length === 0 && (
                <PlaceholderContent
                    title="No Results Published Yet"
                    icon={BookCheck}
                    description="No academic results have been published for your account in Supabase yet. Please check back later or contact your teacher/administration."
                />
            )}

            {!isLoadingResults && academicResults.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChartHorizontalBig className="mr-2 h-6 w-6 text-primary"/>Published Academic Results</CardTitle>
                    <CardDescription>Displaying your results from Supabase, most recent first.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                    {academicResults.map((result) => (
                        <AccordionItem value={result.id} key={result.id}>
                        <AccordionTrigger className="hover:bg-muted/50 px-2 rounded-md">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full text-left">
                                <span className="font-semibold text-primary">{result.term} - {result.year}</span>
                                <span className="text-xs text-muted-foreground mt-1 sm:mt-0">
                                    Class: {result.class_id} | Overall: {result.overall_grade || "N/A"}
                                    {(result.published_at || result.created_at) && ` (Published: ${format(new Date(result.published_at || result.created_at), "PPP")})`}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pt-2 pb-4">
                            <div className="space-y-3 p-3 bg-background rounded-md border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm">
                                    <p><strong>Overall Average:</strong> {result.overall_average || "Not Available"}</p>
                                    <p><strong>Overall Grade:</strong> {result.overall_grade || "Not Available"}</p>
                                    <p className="md:col-span-2"><strong>Overall Remarks:</strong> {result.overall_remarks || "No overall remarks."}</p>
                                    <p className="md:col-span-2 text-xs text-muted-foreground"><strong>Recorded by:</strong> {result.teacher_name || "N/A"}</p>
                                </div>
                                <h4 className="font-semibold text-md text-primary border-b pb-1 mb-2">Subject Details:</h4>
                                <div className="space-y-2">
                                {result.subject_results.map((sr, index) => (
                                    <div key={index} className="p-2 border rounded-md bg-secondary/30 text-xs sm:text-sm">
                                        <p className="font-medium">{sr.subjectName}</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
                                            <p><strong>Score:</strong> {sr.score || "-"}</p>
                                            <p><strong>Grade:</strong> {sr.grade}</p>
                                            <p className="sm:col-span-1"><strong>Remarks:</strong> {sr.remarks || "-"}</p>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">If you have any questions about your results, please contact your class teacher or the school administration.</p>
                </CardFooter>
              </Card>
            )}
        </>
      )}

      {!isLoading && !error && feesPaidStatus === "checking" && (
         <Card className="shadow-md">
          <CardHeader><CardTitle className="flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Still checking your fee status. This should complete shortly.</p></CardContent>
        </Card>
      )}
    </div>
  );
}
