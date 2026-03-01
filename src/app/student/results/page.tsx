
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
import { createClient } from "@/lib/supabase/client";
import { ResultSlip } from "@/components/shared/ResultSlip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";


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
    school_name: "EduSync School",
    school_address: "Accra, Ghana",
    school_logo_url: "",
};


export default function StudentResultsPage() {
  const { toast } = useToast();
  const { user, schoolId, setHasNewResult, isLoading: authLoading } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [academicResults, setAcademicResults] = useState<AcademicResultFromSupabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = createClient();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(defaultBranding);
  
  const [resultToDownload, setResultToDownload] = useState<AcademicResultFromSupabase | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    isMounted.current = true;
    
    // Clear notification dot when page is visited
    if (typeof window !== 'undefined') {
        localStorage.setItem('student_last_checked_result', new Date().toISOString());
        setHasNewResult(false);
    }

    async function checkFeeStatusAndLoadData() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);
      setFeesPaidStatus("checking");

      try {
        // Wait for auth to finish loading before proceeding
        if (authLoading) {
          setIsLoading(false);
          return;
        }
        
        if (!user || !schoolId) {
          throw new Error("Student not authenticated. Please log in.");
        }

        // Fetch School Branding
         const { data: appSettings, error: settingsError } = await supabase
          .from("schools")
          .select("name, address, logo_url, current_academic_year")
          .eq("id", schoolId)
          .single();
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        const fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) {
            setCurrentSystemAcademicYear(fetchedCurrentYear);
            setSchoolBranding({
                school_name: appSettings?.name || defaultBranding.school_name,
                school_address: appSettings?.address || defaultBranding.school_address,
                school_logo_url: appSettings?.logo_url || defaultBranding.school_logo_url,
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
          .eq('school_id', schoolId)
          .eq('grade_level', profileData.grade_level)
          .eq('academic_year', fetchedCurrentYear);
        if (feeError) throw feeError;
        const totalFeesDue = (feeStructure || []).reduce((sum, item) => sum + item.amount, 0);
        
        console.log('Fee Calculation Debug:', {
          academicYear: fetchedCurrentYear,
          gradeLevel: profileData.grade_level,
          schoolId: schoolId,
          feeStructure: feeStructure,
          totalFeesDue: totalFeesDue
        });
        
        let academicYearStartDate = "";
        let academicYearEndDate = "";
        if (fetchedCurrentYear && /^\d{4}-\d{4}$/.test(fetchedCurrentYear)) {
          const startYear = fetchedCurrentYear.substring(0, 4);
          const endYear = fetchedCurrentYear.substring(5, 9);
          academicYearStartDate = `${startYear}-12-31`; 
          academicYearEndDate = `${endYear}-12-31`;     
        }

        let paymentsQuery = supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .eq('student_id_display', profileData.student_id_display);
        
        // Note: Date filtering removed - count ALL payments regardless of date
        // This ensures students can access results if they've paid fees at any time
        // if (academicYearStartDate && academicYearEndDate) {
        //     paymentsQuery = paymentsQuery
        //       .gte('payment_date', academicYearStartDate)
        //       .lte('payment_date', academicYearEndDate);
        // }

        console.log('Payment Query Debug:', {
          schoolId: schoolId,
          studentIdDisplay: profileData.student_id_display,
          academicYearStartDate: academicYearStartDate,
          academicYearEndDate: academicYearEndDate
        });

        const { data: payments, error: paymentError } = await paymentsQuery;
        if (paymentError) throw paymentError;

        // Debug: Check if ANY payments exist for this student (ignoring date range)
        const { data: allPayments, error: allPaymentsError } = await supabase
          .from('fee_payments')
          .select('amount_paid, payment_date')
          .eq('school_id', schoolId)
          .eq('student_id_display', profileData.student_id_display);
        
        console.log('All Payments Debug:', {
          allPaymentsFound: allPayments?.length || 0,
          allPayments: allPayments,
          academicYearRange: `${academicYearStartDate} to ${academicYearEndDate}`,
          paymentsWithinRange: allPayments?.filter(p => 
            p.payment_date >= academicYearStartDate && p.payment_date <= academicYearEndDate
          )
        });
        const totalPaidByPayments = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
        const overrideAmount = typeof profileData.total_paid_override === 'number' ? profileData.total_paid_override : 0;
        const finalTotalPaid = totalPaidByPayments + overrideAmount;

        console.log('Payment Calculation Debug:', {
          academicYearRange: `${academicYearStartDate} to ${academicYearEndDate}`,
          studentId: profileData.student_id_display,
          paymentsFound: payments?.length || 0,
          payments: payments,
          totalPaidByPayments: totalPaidByPayments,
          totalPaidOverride: profileData.total_paid_override,
          overrideAmount: overrideAmount,
          finalTotalPaid: finalTotalPaid,
          totalFeesDue: totalFeesDue,
          isPaid: totalFeesDue === 0 || finalTotalPaid >= totalFeesDue,
          studentProfile: profileData
        });

        if (isMounted.current) {
          const isPaid = totalFeesDue === 0 || finalTotalPaid >= totalFeesDue;
          setFeesPaidStatus(isPaid ? "paid" : "unpaid");

          if (isPaid) {
            setIsLoadingResults(true);
            const today = format(new Date(), "yyyy-MM-dd HH:mm:ss");
            const { data: resultsData, error: resultsError } = await supabase
              .from('student_results')
              .select('*')
              .eq('school_id', schoolId)
              .eq('student_id_display', profileData.student_id_display)
              .eq('approval_status', ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED)
              .not('published_at', 'is', null)
              .lte('published_at', today)
              .order('year', { ascending: false })
              .order('term', { ascending: false }) 
              .order('created_at', { ascending: false });

            if (resultsError) throw resultsError;
            
            // Parse the new student_results table format where subjects are stored in subjects_data JSONB
            if (isMounted.current) {
              const rows = (resultsData as any[]) || [];
              
              const normalized = rows.map(result => {
                // Extract subject data from subjects_data JSONB field
                const subjectsData = result.subjects_data || [];
                const subject_results = Array.isArray(subjectsData) ? subjectsData.map((subject: any) => ({
                  subjectName: subject.subject || 'N/A',
                  classScore: String(subject.class_score || ''),
                  examScore: String(subject.exam_score || ''),
                  totalScore: String(subject.total_score || ''),
                  grade: subject.grade || '',
                  remarks: subject.remarks || '',
                })) : [];

                return {
                  id: result.id,
                  class_id: result.class_id,
                  student_id_display: result.student_id_display,
                  student_name: result.student_name || result.student_id_display,
                  term: result.term || '',
                  year: result.year || '',
                  subject_results,
                  overall_average: result.average_score || null,
                  overall_grade: result.overall_grade || null,
                  overall_remarks: result.overall_remarks || null,
                  teacher_name: result.teacher_name || null,
                  published_at: result.published_at || null,
                  approval_status: result.approval_status || null,
                  created_at: result.created_at,
                  updated_at: result.updated_at,
                  attendance_summary: result.attendance_summary || null,
                };
              });
              
              setAcademicResults(normalized as AcademicResultFromSupabase[]);
            }
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
  }, [supabase, user, schoolId, setHasNewResult]);

  useEffect(() => {
    const generatePdf = async () => {
      // 1. Only run if there's a result to download and we are in a browser environment.
      if (!resultToDownload || typeof window === 'undefined') {
        return;
      }
  
      // Give React a moment to render the ResultSlip into the hidden div
      await new Promise(resolve => setTimeout(resolve, 100));
  
      const element = pdfRef.current;
      // 2. Check if the target element for PDF conversion exists and is not empty.
      if (!element || element.innerHTML.trim() === '') {
        console.error("PDF Generation Error: The printable area is empty. Aborting.");
        toast({ title: "Download Failed", description: "The content to be downloaded could not be found or rendered in time.", variant: "destructive" });
        if (isMounted.current) {
          setIsDownloadingId(null);
          setResultToDownload(null);
        }
        return;
      }
  
      // 3. Dynamically import the library only when needed.
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: 0,
        filename: `Result_${resultToDownload.student_name.replace(/\s+/g, '_')}_${resultToDownload.term}_${resultToDownload.year}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
  
      try {
        await html2pdf().from(element).set(opt).save();
      } catch (pdfError: any) {
        console.error("PDF Generation Error:", pdfError);
        toast({ title: "Download Failed", description: "Could not generate the PDF file.", variant: "destructive" });
      } finally {
        // 4. Reset state regardless of success or failure.
        if (isMounted.current) {
          setResultToDownload(null);
          setIsDownloadingId(null);
        }
      }
    };
  
    generatePdf();
    
  }, [resultToDownload, toast]); // Re-run only when resultToDownload changes
  

  const handleDownloadResult = (result: AcademicResultFromSupabase) => {
    if (isDownloadingId) return; // Prevent multiple clicks
    toast({ title: "Generating PDF", description: "Please wait while we prepare your result slip..."});
    setIsDownloadingId(result.id);
    setResultToDownload(result); // This will trigger the useEffect above
  };

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
                                    <Button size="sm" onClick={() => handleDownloadResult(result)} disabled={!!isDownloadingId}>
                                        {isDownloadingId === result.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
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
