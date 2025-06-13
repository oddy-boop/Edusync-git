
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookCheck, Lock, AlertCircle, Loader2, CheckCircle2, BarChartHorizontalBig } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  CURRENTLY_LOGGED_IN_STUDENT_ID, 
  SCHOOL_FEE_STRUCTURE_KEY, 
  REGISTERED_STUDENTS_KEY, 
  FEE_PAYMENTS_KEY, 
  ACADEMIC_RESULTS_KEY 
} from "@/lib/constants";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt";


interface StudentProfile {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  totalPaidOverride?: number | null;
}

interface FeeItem { 
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
}

interface SubjectResultDisplay {
  subjectName: string;
  score?: string; 
  grade: string;
  remarks?: string;
}

interface AcademicResultDisplay {
  id: string; 
  classId: string; // Added from schema, might be useful for display
  studentId: string;
  studentName: string;
  term: string; 
  year: string; 
  subjectResults: SubjectResultDisplay[];
  overallAverage?: string;
  overallGrade?: string;
  overallRemarks?: string;
  teacherId: string;
  teacherName?: string;
  publishedAt?: string; // ISO Date string
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  gradeLevel?: string; // Added for consistency if needed, derived from studentProfile though
}

type FeeStatus = "checking" | "paid" | "unpaid" | "error";

export default function StudentResultsPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [academicResults, setAcademicResults] = useState<AcademicResultDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

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
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: StudentProfile[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const profile = allStudents.find(s => s.studentId === studentId);

        if (!profile) {
          if (isMounted.current) { setError("Student profile not found in local records."); setFeesPaidStatus("error"); }
          setIsLoading(false); return;
        }
        if (isMounted.current) setStudentProfile(profile);

        const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
        const feeStructure: FeeItem[] = feeStructureRaw ? JSON.parse(feeStructureRaw) : [];
        const totalFeesDue = feeStructure.filter(item => item.gradeLevel === profile.gradeLevel).reduce((sum, item) => sum + item.amount, 0);

        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
        const studentPayments = allPayments.filter(p => p.studentId === studentId);
        const totalPaidByPayments = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        
        const finalTotalPaid = typeof profile.totalPaidOverride === 'number' ? profile.totalPaidOverride : totalPaidByPayments;

        if (isMounted.current) {
          const isPaid = totalFeesDue === 0 || finalTotalPaid >= totalFeesDue;
          setFeesPaidStatus(isPaid ? "paid" : "unpaid");

          if (isPaid) {
            setIsLoadingResults(true);
            const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
            const allStoredResults: AcademicResultDisplay[] = resultsRaw ? JSON.parse(resultsRaw) : [];
            
            const fetchedResults = allStoredResults
              .filter(r => r.studentId === studentId)
              .sort((a, b) => {
                // Sort by year (desc), then term (desc - need a term order), then createdAt (desc)
                if (a.year !== b.year) return b.year.localeCompare(a.year);
                // Basic term sort, can be improved if terms have a defined order
                if (a.term !== b.term) return b.term.localeCompare(a.term);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });

            if(isMounted.current) setAcademicResults(fetchedResults);
            setIsLoadingResults(false);
          }
        }
      } catch (e: any) {
        console.error("Error checking fee status/loading results from localStorage:", e);
        if (isMounted.current) { setError(`Operation failed: ${e.message}`); setFeesPaidStatus("error"); }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    checkFeeStatusAndLoadData();
    
    return () => { isMounted.current = false; };
  }, []);


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
            Your results are currently unavailable due to outstanding fee payments. 
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
              <CheckCircle2 className="h-5 w-5" /><AlertTitle className="font-semibold">Fee Status: Cleared</AlertTitle>
              <AlertDescription>
                Your fee payments are up to date. Your academic results are displayed below.
              </AlertDescription>
            </Alert>
            
            {isLoadingResults && (
                <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-6 w-6 animate-spin"/>Loading results...</div>
            )}

            {!isLoadingResults && academicResults.length === 0 && (
                <PlaceholderContent 
                    title="No Results Published Yet" 
                    icon={BookCheck}
                    description="No academic results have been published for your account yet. Please check back later or contact your teacher/administration."
                />
            )}

            {!isLoadingResults && academicResults.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChartHorizontalBig className="mr-2 h-6 w-6 text-primary"/>Published Academic Results</CardTitle>
                    <CardDescription>Displaying your results, most recent first. Data from LocalStorage.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                    {academicResults.map((result) => (
                        <AccordionItem value={result.id} key={result.id}>
                        <AccordionTrigger className="hover:bg-muted/50 px-2 rounded-md">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full text-left">
                                <span className="font-semibold text-primary">{result.term} - {result.year}</span>
                                <span className="text-xs text-muted-foreground mt-1 sm:mt-0">
                                    Class: {result.classId} | Overall: {result.overallGrade || "N/A"}
                                    {result.publishedAt && ` (Published: ${format(new Date(result.publishedAt), "PPP")})`}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pt-2 pb-4">
                            <div className="space-y-3 p-3 bg-background rounded-md border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm">
                                    <p><strong>Overall Average:</strong> {result.overallAverage || "Not Available"}</p>
                                    <p><strong>Overall Grade:</strong> {result.overallGrade || "Not Available"}</p>
                                    <p className="md:col-span-2"><strong>Overall Remarks:</strong> {result.overallRemarks || "No overall remarks."}</p>
                                    <p className="md:col-span-2 text-xs text-muted-foreground"><strong>Recorded by:</strong> {result.teacherName || "N/A"}</p>
                                </div>
                                <h4 className="font-semibold text-md text-primary border-b pb-1 mb-2">Subject Details:</h4>
                                <div className="space-y-2">
                                {result.subjectResults.map((sr, index) => (
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
