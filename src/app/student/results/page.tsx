
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookCheck, Lock, AlertCircle, Loader2, CheckCircle2, BarChartHorizontalBig, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSupabase } from "@/lib/supabaseClient";
import html2pdf from 'html2pdf.js';
import { ResultSlip } from "@/components/shared/ResultSlip";
import { useToast } from "@/hooks/use-toast";


interface StudentProfile {
  auth_user_id: string;
  student_id_display: string;
  full_name: string;
  grade_level: string;
  total_paid_override?: number | null;
}

interface SubjectResultDisplay {
  subjectName: string;
  classScore?: string;
  examScore?: string;
  totalScore?: string;
  grade: string;
  remarks?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
}

interface AcademicResultFromSupabase {
  id: string;
  class_id: string; 
  student_id_display: string;
  student_name: string; 
  term: string;
  year: string;
  subject_results: SubjectResultDisplay[]; 
  overall_average?: string | null;
  overall_grade?: string | null;
  overall_remarks?: string | null;
  teacher_name?: string | null; 
  published_at?: string | null; 
  approval_status?: string;
  created_at: string; 
  updated_at: string; 
  attendance_summary?: AttendanceSummary | null;
}

type FeeStatus = "checking" | "paid" | "unpaid" | "error";

interface SchoolBranding {
    school_name: string;
    school_address: string;
    school_logo_url: string;
}

const defaultBranding: SchoolBranding = {
    school_name: "St. Joseph's Montessori",
    school_address: "Accra, Ghana",
    school_logo_url: "",
};


export default function StudentResultsPage() {
  const { toast } = useToast();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [academicResults, setAcademicResults] = useState<AcademicResultFromSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(defaultBranding);
  
  const [resultToDownload, setResultToDownload] = useState<AcademicResultFromSupabase | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    isMounted.current = true;

    async function checkFeeStatusAndLoadData() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);
      setFeesPaidStatus("checking");

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Student not authenticated. Please log in.");
        }

        // Fetch School Branding
         const { data: appSettings, error: settingsError } = await supabase
          .from("app_settings")
          .select("current_academic_year, school_name, school_address, school_logo_url")
          .eq("id", 1)
          .single();
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        const fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) {
            setCurrentSystemAcademicYear(fetchedCurrentYear);
            setSchoolBranding({
                school_name: appSettings?.school_name || defaultBranding.school_name,
                school_address: appSettings?.school_address || defaultBranding.school_address,
                school_logo_url: appSettings?.school_logo_url || defaultBranding.school_logo_url,
            });
        }


        const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select('auth_user_id, student_id_display, full_name, grade_level, total_paid_override')
          .eq('auth_user_id', user.id)
          .single();
        if (profileError) throw new Error(`Could not load your student profile: ${profileError.message}`);
        if (isMounted.current) setStudentProfile(profileData);

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
            const today = format(new Date(), "yyyy-MM-dd HH:mm:ss");
            const { data: resultsData, error: resultsError } = await supabase
              .from('academic_results')
              .select('*')
              .eq('student_id_display', profileData.student_id_display)
              .eq('approval_status', ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED)
              .not('published_at', 'is', null)
              .lte('published_at', today)
              .order('year', { ascending: false })
              .order('term', { ascending: false }) 
              .order('created_at', { ascending: false });

            if (resultsError) throw resultsError;
            if(isMounted.current) setAcademicResults(resultsData || []);
            setIsLoadingResults(false);
          }
        }
      } catch (e: any) {
        console.error("Error checking fee status/loading results:", e);
        if (isMounted.current) { setError(e.message || "An unknown error occurred."); setFeesPaidStatus("error"); }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    checkFeeStatusAndLoadData();

    return () => { isMounted.current = false; };
  }, [supabase]);

  const handleDownloadResult = async (result: AcademicResultFromSupabase) => {
    if (isDownloading) return;
    setIsDownloading(result.id);

    // If attendance summary is already on the result object, use it.
    if (result.attendance_summary) {
        setResultToDownload(result);
        return;
    }

    // Fallback: If not present (for older records), fetch it on the fly.
    if (!supabase) {
        toast({ title: "Error", description: "Supabase client not available.", variant: "destructive" });
        setIsDownloading(null);
        return;
    }
    
    let summary: AttendanceSummary | null = null;
    toast({ title: "Fetching Attendance...", description: "Fetching attendance data for the result slip. This is a one-time process for older records.", duration: 4000 });
    
    try {
        const [startYearStr, endYearStr] = result.year.split('-');
        if (startYearStr && endYearStr) {
            const startDate = `${startYearStr}-08-01`;
            const endDate = `${endYearStr}-07-31`;

            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance_records')
                .select('status')
                .eq('student_id_display', result.student_id_display)
                .gte('date', startDate)
                .lte('date', endDate);
            
            if (attendanceError) {
                throw attendanceError;
            }

            const calculatedSummary: AttendanceSummary = { present: 0, absent: 0, late: 0 };
            (attendanceData || []).forEach(record => {
                if (record.status === 'present') calculatedSummary.present++;
                else if (record.status === 'absent') calculatedSummary.absent++;
                else if (record.status === 'late') calculatedSummary.late++;
            });
            summary = calculatedSummary;
        }
    } catch (e: any) {
        console.error("Failed to fetch attendance summary for PDF:", e);
        toast({ title: "Warning", description: `Could not fetch attendance summary. The PDF will be generated without it. Check RLS policies for 'attendance_records'.`, variant: "default", duration: 8000 });
    }

    const resultWithAttendance = { ...result, attendance_summary: summary };
    setResultToDownload(resultWithAttendance);
  };


  useEffect(() => {
    const generatePdf = async () => {
        if (resultToDownload && pdfRef.current) {
            const element = pdfRef.current;
            const opt = {
                margin: 0,
                filename: `Result_${resultToDownload.student_name.replace(/\s+/g, '_')}_${resultToDownload.term}_${resultToDownload.year}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().from(element).set(opt).save();

            if (isMounted.current) {
                setResultToDownload(null);
                setIsDownloading(null);
            }
        }
    };
    generatePdf();
  }, [resultToDownload]);


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Results</h2>

      {isLoading && (
        <Card className="shadow-md">
          <CardHeader><CardTitle className="flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying Access...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Please wait while we check your fee payment status and load results.</p></CardContent>
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
                <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-6 w-6 animate-spin"/>Loading results...</div>
            )}

            {!isLoadingResults && academicResults.length === 0 && (
                <PlaceholderContent
                    title="No Results Published Yet"
                    icon={BookCheck}
                    description="No academic results have been published for your account yet, or none are currently available for viewing. Please check back later or contact your teacher/administration."
                />
            )}

            {!isLoadingResults && academicResults.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChartHorizontalBig className="mr-2 h-6 w-6 text-primary"/>Published Academic Results</CardTitle>
                    <CardDescription>Displaying your results, most recent first. Only approved and currently published results are shown.</CardDescription>
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
                                    {(result.published_at) && ` (Published: ${format(new Date(result.published_at), "PPP")})`}
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
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1">
                                            <p><strong>Class Score:</strong> {sr.classScore || "-"}</p>
                                            <p><strong>Exams Score:</strong> {sr.examScore || "-"}</p>
                                            <p className="font-semibold"><strong>Total Score:</strong> {sr.totalScore || "-"}</p>
                                            <p><strong>Grade:</strong> {sr.grade}</p>
                                            <p className="col-span-full"><strong>Remarks:</strong> {sr.remarks || "-"}</p>
                                        </div>
                                    </div>
                                ))}
                                </div>
                                <div className="pt-4 text-right">
                                    <Button size="sm" onClick={() => handleDownloadResult(result)} disabled={!!isDownloading}>
                                        {isDownloading === result.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                        Download Result
                                    </Button>
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

      {/* Hidden container for PDF generation */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <div ref={pdfRef}>
          {resultToDownload && <ResultSlip result={resultToDownload} schoolBranding={schoolBranding} />}
        </div>
      </div>
    </div>
  );
}
