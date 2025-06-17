
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

interface RegisteredStudentFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
  total_paid_override?: number | null; 
}

interface FeePaymentFromSupabase {
  id: string;
  payment_id_display: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: string;
  term_paid_for: string;
  notes?: string | null;
}

interface FeeItemFromSupabase {
  id: string; 
  grade_level: string;
  term: string;
  description: string;
  amount: number;
  academic_year: string; // Ensure this matches DB
}

export default function StudentFeesPage() {
  const [student, setStudent] = useState<RegisteredStudentFromSupabase | null>(null);
  const [payments, setPayments] = useState<FeePaymentFromSupabase[]>([]);
  const [totalFeesDue, setTotalFeesDue] = useState<number>(0);
  const [totalPaidByPayments, setTotalPaidByPayments] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");


  useEffect(() => {
    isMounted.current = true;

    async function fetchFeeData() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      setError(null);

      let studentIdDisplayFromStorage: string | null = null;
      studentIdDisplayFromStorage = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      
      if (!studentIdDisplayFromStorage) {
        if (isMounted.current) {
          setError("Student not identified. Please log in.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // 0. Fetch current academic year from app_settings
        const { data: appSettings, error: settingsError } = await supabase
          .from("app_settings")
          .select("current_academic_year")
          .eq("id", 1)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        const currentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) setCurrentSystemAcademicYear(currentYear);


        // 1. Fetch student profile from Supabase 'students' table
        const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select("student_id_display, full_name, grade_level, total_paid_override")
            .eq("student_id_display", studentIdDisplayFromStorage)
            .single();

        if (studentError && studentError.code !== 'PGRST116') throw studentError;
        if (!studentData) {
          if (isMounted.current) setError("Student profile not found in Supabase records.");
          setIsLoading(false);
          return;
        }
        if (isMounted.current) setStudent(studentData);

        // 2. Fetch fee structure from Supabase 'school_fee_items' table for current year and student's grade
        const { data: feeStructureData, error: feeError } = await supabase
          .from("school_fee_items")
          .select("grade_level, amount, academic_year")
          .eq("grade_level", studentData.grade_level)
          .eq("academic_year", currentYear); // Filter by current academic year

        if (feeError) throw feeError;
        
        const due = (feeStructureData || [])
          .reduce((sum, item) => sum + item.amount, 0);
        if (isMounted.current) setTotalFeesDue(due);

        // 3. Fetch payments for this student from Supabase 'fee_payments' table
        const { data: paymentsData, error: paymentsError } = await supabase
            .from("fee_payments")
            .select("*") // Fetch all columns for display
            .eq("student_id_display", studentData.student_id_display)
            .order("payment_date", { ascending: false });
        
        if (paymentsError) throw paymentsError;
        
        if (isMounted.current) setPayments(paymentsData || []);
        
        const paidSum = (paymentsData || []).reduce((sum, p) => sum + p.amount_paid, 0);
        if (isMounted.current) setTotalPaidByPayments(paidSum);

      } catch (e: any) {
        console.error("Error fetching fee data from Supabase:", e);
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
            <p className="text-muted-foreground">Loading your fee statement from Supabase...</p>
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
  
  const displayTotalPaid = student.total_paid_override !== undefined && student.total_paid_override !== null
    ? student.total_paid_override
    : totalPaidByPayments;
  
  const outstandingBalance = totalFeesDue - displayTotalPaid;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <DollarSign className="mr-2 h-8 w-8" /> My Fee Statement
      </h2>
      <CardDescription>Displaying fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong></CardDescription>


      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Fee Summary for {student.full_name} ({student.student_id_display})</CardTitle>
          <CardDescription>Grade Level: {student.grade_level}. All data from Supabase for {currentSystemAcademicYear}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees Due ({currentSystemAcademicYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">GHS {totalFeesDue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-100 dark:bg-green-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Amount Paid (Overall)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  GHS {displayTotalPaid.toFixed(2)}
                  {student.total_paid_override !== undefined && student.total_paid_override !== null && <span className="text-xs text-blue-500 ml-1 block">(Admin Override)</span>}
                </p>
              </CardContent>
            </Card>
            <Card className={outstandingBalance <= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${outstandingBalance <= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Outstanding Balance ({currentSystemAcademicYear})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${outstandingBalance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  GHS {outstandingBalance.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground">
              * Balance calculated based on Supabase payment records and fee structure for the current academic year ({currentSystemAcademicYear}).
              {student.total_paid_override !== undefined && student.total_paid_override !== null && " An admin override for total paid is currently active."}
          </div>
          {outstandingBalance <= 0 && (
            <div className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2"/>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Your account appears to be up to date for the current academic year. No outstanding balance.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Payment History (from Supabase)
          </CardTitle>
          <CardDescription>A record of all fee payments made, fetched from Supabase.</CardDescription>
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
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.payment_id_display}</TableCell>
                    <TableCell>{payment.term_paid_for}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell className="text-right font-medium">{payment.amount_paid.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{payment.notes || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No payment records found for your account in Supabase.</p>
          )}
        </CardContent>
         <CardFooter className="text-sm text-muted-foreground">
            For any discrepancies or questions regarding your fee statement, please contact the school administration.
        </CardFooter>
      </Card>
      
    </div>
  );
}
    
