
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, FEE_PAYMENTS_KEY, REGISTERED_STUDENTS_KEY } from "@/lib/constants";
import { type PaymentDetails } from "@/components/shared/PaymentReceipt";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

interface RegisteredStudent {
  studentId: string; 
  fullName: string;
  gradeLevel: string;
  totalPaidOverride?: number | null; 
}

interface FeeItemFromSupabase { // For fee structure from Supabase
  id: string; // UUID
  grade_level: string; // Matches DB column
  term: string;
  description: string;
  amount: number;
}

export default function StudentFeesPage() {
  const [student, setStudent] = useState<RegisteredStudent | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [totalFeesDue, setTotalFeesDue] = useState<number>(0);
  const [totalPaidByPayments, setTotalPaidByPayments] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;

    async function fetchFeeData() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      setError(null);

      let studentId: string | null = null;
      studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      
      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch student profile from LocalStorage
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const studentData = allStudents.find(s => s.studentId === studentId);

        if (!studentData) {
          if (isMounted.current) setError("Student profile not found in local records.");
          setIsLoading(false);
          return;
        }
        if (isMounted.current) setStudent(studentData);

        // 2. Fetch fee structure from Supabase
        const { data: feeStructureData, error: feeError } = await supabase
          .from("school_fee_items")
          .select("grade_level, amount")
          .eq("grade_level", studentData.gradeLevel); // Filter by student's grade level

        if (feeError) throw feeError;
        
        const due = (feeStructureData || [])
          .reduce((sum, item) => sum + item.amount, 0);
        if (isMounted.current) setTotalFeesDue(due);

        // 3. Fetch payments for this student from LocalStorage
        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
        
        const studentPayments = allPayments
          .filter(p => p.studentId === studentId)
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        
        if (isMounted.current) setPayments(studentPayments);
        
        const paidSum = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        if (isMounted.current) setTotalPaidByPayments(paidSum);

      } catch (e: any) {
        console.error("Error fetching fee data:", e);
        if (isMounted.current) setError(`Failed to load fee details: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchFeeData();
    
    return () => { isMounted.current = false; };
  }, [supabase]);


  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your fee statement...</p>
        </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-6 w-6" /> Error Loading Fees
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

  if (!student) { 
    return (
      <Card>
        <CardHeader><CardTitle>Student Not Identified</CardTitle></CardHeader>
        <CardContent>
            <p>Please log in with your Student ID to view fee details.</p>
            <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  const displayTotalPaid = student.totalPaidOverride !== undefined && student.totalPaidOverride !== null
    ? student.totalPaidOverride
    : totalPaidByPayments;
  
  const outstandingBalance = totalFeesDue - displayTotalPaid;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <DollarSign className="mr-2 h-8 w-8" /> My Fee Statement
      </h2>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Fee Summary for {student.fullName} ({student.studentId})</CardTitle>
          <CardDescription>Grade Level: {student.gradeLevel}. Fee structure from Supabase, payments from LocalStorage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees Due</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">GHS {totalFeesDue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-100 dark:bg-green-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Amount Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  GHS {displayTotalPaid.toFixed(2)}
                  {student.totalPaidOverride !== undefined && student.totalPaidOverride !== null && <span className="text-xs text-blue-500 ml-1 block">(Admin Override)</span>}
                </p>
              </CardContent>
            </Card>
            <Card className={outstandingBalance <= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${outstandingBalance <= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${outstandingBalance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  GHS {outstandingBalance.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
          {(student.totalPaidOverride === undefined || student.totalPaidOverride === null) && totalFeesDue > 0 && (
             <div className="text-xs text-muted-foreground">
              * Balance calculated based on local payment records and fee structure from Supabase.
            </div>
          )}
          {outstandingBalance <= 0 && (
            <div className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2"/>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Your account appears to be up to date. No outstanding balance.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Payment History (from LocalStorage)
          </CardTitle>
          <CardDescription>A record of all fee payments made, fetched from your browser's local storage.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Receipt ID</TableHead>
                  <TableHead>Term Paid For</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount (GHS)</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.paymentId}>
                    <TableCell>{payment.paymentDate}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.paymentId}</TableCell>
                    <TableCell>{payment.termPaidFor}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium">{payment.amountPaid.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{payment.notes || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No payment records found for your account in local storage.</p>
          )}
        </CardContent>
         <CardFooter className="text-sm text-muted-foreground">
            For any discrepancies or questions regarding your fee statement, please contact the school administration.
        </CardFooter>
      </Card>
      
    </div>
  );
}
    
