
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookCheck, Lock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, SCHOOL_FEE_STRUCTURE_KEY } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt"; // Assuming this structure is suitable

interface StudentProfile {
  studentId: string;
  fullName:string;
  gradeLevel: string;
  totalPaidOverride?: number | null;
}

interface FeeItem { // From constants or local storage structure
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
}

type FeeStatus = "checking" | "paid" | "unpaid" | "error";

export default function StudentResultsPage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [feesPaidStatus, setFeesPaidStatus] = useState<FeeStatus>("checking");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function checkFeeStatusAndLoadResults() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);
      setFeesPaidStatus("checking");

      let studentId: string | null = null;
      if (typeof window !== "undefined") {
        studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      }

      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in.");
          setFeesPaidStatus("error");
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch student profile
        const studentDocRef = doc(db, "students", studentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
          if (isMounted.current) {
            setError("Student profile not found.");
            setFeesPaidStatus("error");
          }
          setIsLoading(false);
          return;
        }
        const profile = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as StudentProfile;
        if (isMounted.current) setStudentProfile(profile);

        // 2. Fetch fee structure (from localStorage for now)
        let feeStructure: FeeItem[] = [];
        if (typeof window !== 'undefined') {
            const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
            feeStructure = feeStructureRaw ? JSON.parse(feeStructureRaw) : [];
        }
        const totalFeesDue = feeStructure
          .filter(item => item.gradeLevel === profile.gradeLevel)
          .reduce((sum, item) => sum + item.amount, 0);

        // 3. Fetch payments for this student from Firestore
        const paymentsQuery = query(
          collection(db, "payments"),
          where("studentId", "==", studentId)
        );
        const paymentSnapshots = await getDocs(paymentsQuery);
        const totalPaidByPayments = paymentSnapshots.docs
          .reduce((sum, docSnap) => sum + (docSnap.data().amountPaid || 0), 0);
        
        // Determine final amount paid (override takes precedence)
        const finalTotalPaid = typeof profile.totalPaidOverride === 'number'
          ? profile.totalPaidOverride
          : totalPaidByPayments;

        if (isMounted.current) {
          if (totalFeesDue === 0) { // Edge case: No fees configured for this grade level
            setFeesPaidStatus("paid"); // Assume paid or N/A
          } else {
            setFeesPaidStatus(finalTotalPaid >= totalFeesDue ? "paid" : "unpaid");
          }
        }

      } catch (e: any) {
        console.error("Error checking fee status:", e);
        if (isMounted.current) {
          setError(`Failed to determine fee status: ${e.message}`);
          setFeesPaidStatus("error");
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    checkFeeStatusAndLoadResults();
    
    return () => {
      isMounted.current = false;
    };
  }, []);


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Results</h2>
      
      {isLoading && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking Fee Status...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please wait while we verify your fee payment status.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            {error.includes("Please log in") && (
                <Button variant="link" asChild className="p-0 h-auto ml-1 text-destructive hover:text-destructive/80">
                    <Link href="/student/login">Go to Login</Link>
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
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle className="font-semibold">Fee Status: Cleared</AlertTitle>
              <AlertDescription>
                Your fee payments are up to date. Your academic results will be displayed below once they are published by your teachers.
              </AlertDescription>
            </Alert>
            <PlaceholderContent 
                title="Academic Results Dashboard" 
                icon={BookCheck}
                description="This section will display your term-wise and subject-wise academic results, including scores, grades, and teacher remarks. You'll be able to download your report cards from here once they are available."
            />
        </>
      )}
      
      {!isLoading && !error && feesPaidStatus === "checking" && (
         <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Still checking your fee status. This should complete shortly.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
