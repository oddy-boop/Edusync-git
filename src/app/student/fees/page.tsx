
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Loader2, CalendarFold } from "lucide-react";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, TERMS_ORDER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  academic_year: string;
}

export default function StudentFeesPage() {
  const [student, setStudent] = useState<RegisteredStudentFromSupabase | null>(null);
  const [payments, setPayments] = useState<FeePaymentFromSupabase[]>([]);
  
  const [allYearlyFeeItems, setAllYearlyFeeItems] = useState<FeeItemFromSupabase[]>([]);
  const [allStudentPaymentsForYear, setAllStudentPaymentsForYear] = useState<FeePaymentFromSupabase[]>([]);

  const [selectedTerm, setSelectedTerm] = useState<string>(TERMS_ORDER[0]);
  
  // States for display in summary cards
  const [feesForSelectedTermState, setFeesForSelectedTermState] = useState<number>(0);
  const [balanceBroughtForwardState, setBalanceBroughtForwardState] = useState<number>(0);
  const [subtotalDueThisPeriodState, setSubtotalDueThisPeriodState] = useState<number>(0);
  const [displayTotalPaidState, setDisplayTotalPaidState] = useState<number>(0);
  const [overallOutstandingBalanceState, setOverallOutstandingBalanceState] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");


  useEffect(() => {
    isMounted.current = true;

    async function fetchInitialData() {
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
        const { data: appSettings, error: settingsError } = await supabase
          .from("app_settings")
          .select("current_academic_year")
          .eq("id", 1)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        const fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) setCurrentSystemAcademicYear(fetchedCurrentYear);

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

        const { data: feeStructureData, error: feeError } = await supabase
          .from("school_fee_items")
          .select("*") // Fetch all columns
          .eq("grade_level", studentData.grade_level)
          .eq("academic_year", fetchedCurrentYear); 

        if (feeError) throw feeError;
        if (isMounted.current) setAllYearlyFeeItems(feeStructureData || []);
        
        const { data: paymentsData, error: paymentsError } = await supabase
            .from("fee_payments")
            .select("*") 
            .eq("student_id_display", studentData.student_id_display)
            // Consider if payments should also be filtered by academic year if relevant
            .order("payment_date", { ascending: false });
        
        if (paymentsError) throw paymentsError;
        
        if (isMounted.current) {
          setPayments(paymentsData || []); // For display of payment history
          setAllStudentPaymentsForYear(paymentsData || []); // For calculation
        }

      } catch (e: any) {
        console.error("Error fetching initial fee data from Supabase:", e);
        if (isMounted.current) setError(`Failed to load initial fee details: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchInitialData();
    
    return () => { isMounted.current = false; };
  }, [supabase]);


  useEffect(() => {
    if (!student || isLoading || !currentSystemAcademicYear || allYearlyFeeItems.length === 0) {
        // Don't calculate if essential data isn't ready or no fee items for the year
        if(!isLoading && student && allYearlyFeeItems.length === 0 && currentSystemAcademicYear){
            // Reset states if no fee items for the year
            setFeesForSelectedTermState(0);
            setBalanceBroughtForwardState(0);
            setSubtotalDueThisPeriodState(0);
            const totalPaymentsMade = student.total_paid_override ?? allStudentPaymentsForYear.reduce((sum, p) => sum + p.amount_paid, 0);
            setDisplayTotalPaidState(totalPaymentsMade);
            setOverallOutstandingBalanceState(0 - totalPaymentsMade); // If no fees due, balance is negative of payments
        }
        return;
    }

    let calculatedFeesForSelectedTerm = 0;
    let calculatedBalanceBroughtForward = 0;
    let calculatedTotalFeesDueForYearUpToSelectedTerm = 0;

    const selectedTermIndex = TERMS_ORDER.indexOf(selectedTerm);

    for (let i = 0; i < TERMS_ORDER.length; i++) {
        const term = TERMS_ORDER[i];
        const feeItemsForThisTerm = allYearlyFeeItems.filter(item => item.term === term);
        const amountDueForThisTerm = feeItemsForThisTerm.reduce((sum, item) => sum + item.amount, 0);
        
        const paymentsForThisTerm = allStudentPaymentsForYear.filter(p => p.term_paid_for === term);
        const amountPaidForThisTerm = paymentsForThisTerm.reduce((sum, p) => sum + p.amount_paid, 0);

        if (i <= selectedTermIndex) {
            calculatedTotalFeesDueForYearUpToSelectedTerm += amountDueForThisTerm;
        }

        if (i < selectedTermIndex) { // Calculate B/F from terms before the selected one
            calculatedBalanceBroughtForward += (amountDueForThisTerm - amountPaidForThisTerm);
        }
        
        if (i === selectedTermIndex) {
            calculatedFeesForSelectedTerm = amountDueForThisTerm;
        }
    }
    
    // Balance brought forward should not be negative if overpayments don't reduce current term's specific bill
    const nonNegativeBalanceBf = Math.max(0, calculatedBalanceBroughtForward);
    const calculatedSubtotalDueThisPeriod = calculatedFeesForSelectedTerm + nonNegativeBalanceBf;
    
    const totalPaymentsMadeOverall = student.total_paid_override ?? allStudentPaymentsForYear.reduce((sum, p) => sum + p.amount_paid, 0);
    const calculatedOverallOutstanding = calculatedTotalFeesDueForYearUpToSelectedTerm - totalPaymentsMadeOverall;

    if(isMounted.current) {
        setFeesForSelectedTermState(calculatedFeesForSelectedTerm);
        setBalanceBroughtForwardState(calculatedBalanceBroughtForward); // Show actual B/F, could be negative
        setSubtotalDueThisPeriodState(calculatedSubtotalDueThisPeriod);
        setDisplayTotalPaidState(totalPaymentsMadeOverall);
        setOverallOutstandingBalanceState(calculatedOverallOutstanding);
    }

  }, [student, selectedTerm, currentSystemAcademicYear, allYearlyFeeItems, allStudentPaymentsForYear, isLoading]);


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
  
  const outstandingBalanceForStyling = overallOutstandingBalanceState; // Use the overall for styling

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <DollarSign className="mr-2 h-8 w-8" /> My Fee Statement
        </h2>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger id="term-select">
              <SelectValue placeholder="Select Term" />
            </SelectTrigger>
            <SelectContent>
              {TERMS_ORDER.map(term => (
                <SelectItem key={term} value={term}>{term}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <CardDescription>Displaying fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong>, for <strong>{selectedTerm}</strong>.</CardDescription>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Fee Summary for {student.full_name} ({student.student_id_display})</CardTitle>
          <CardDescription>Grade Level: {student.grade_level}. All data from Supabase for {currentSystemAcademicYear}, viewing {selectedTerm}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-secondary/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fees for {selectedTerm}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">GHS {feesForSelectedTermState.toFixed(2)}</p></CardContent>
            </Card>
            
            {balanceBroughtForwardState > 0 && (
              <Card className="bg-amber-100 dark:bg-amber-900/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Balance B/F from Prior Terms</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">GHS {balanceBroughtForwardState.toFixed(2)}</p></CardContent>
              </Card>
            )}
             {balanceBroughtForwardState < 0 && ( // Show if credit brought forward
                <Card className="bg-green-100 dark:bg-green-900/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Credit B/F from Prior Terms</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {Math.abs(balanceBroughtForwardState).toFixed(2)}</p></CardContent>
                </Card>
            )}

            <Card className="bg-secondary/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Subtotal Due for {selectedTerm} Period</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">GHS {subtotalDueThisPeriodState.toFixed(2)}</p></CardContent>
            </Card>

            <Card className="bg-green-100 dark:bg-green-900/30 lg:col-start-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Paid (Overall for Year)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  GHS {displayTotalPaidState.toFixed(2)}
                  {student.total_paid_override !== undefined && student.total_paid_override !== null && <span className="text-xs text-blue-500 ml-1 block">(Admin Override)</span>}
                </p>
              </CardContent>
            </Card>
            
            <Card className={outstandingBalanceForStyling <= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${outstandingBalanceForStyling <= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Overall Outstanding (End of {selectedTerm})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${outstandingBalanceForStyling <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  GHS {overallOutstandingBalanceState.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-xs text-muted-foreground">
              * Balance calculated based on Supabase payment records and fee structure for {currentSystemAcademicYear} up to {selectedTerm}.
              {student.total_paid_override !== undefined && student.total_paid_override !== null && " An admin override for total paid is currently active."}
          </div>
          {overallOutstandingBalanceState <= 0 && (
            <div className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2"/>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Your account appears to be up to date for the academic year as of the end of {selectedTerm}.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Payment History (All Payments from Supabase)
          </CardTitle>
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
    
