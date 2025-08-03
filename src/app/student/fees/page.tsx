
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Loader2, Library, CreditCard } from "lucide-react";
import { TERMS_ORDER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { verifyPaystackTransaction } from "@/lib/actions/payment.actions";
import { usePaystackPayment } from 'react-paystack';
import type { ComponentProps } from 'react';
import type { callback, PaystackProps } from "react-paystack/dist/types";

// For usePaystackPayment config type
type PaystackHookProps = Parameters<typeof usePaystackPayment>[0];

interface StudentProfile {
  auth_user_id: string;
  student_id_display: string;
  full_name: string;
  grade_level: string;
  contact_email?: string | null;
  total_paid_override?: number | null;
}

interface FeePaymentFromSupabase {
  id: string;
  payment_id_display: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; 
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

const paystackPublicKeyFromEnv = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

export default function StudentFeesPage() {
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [paymentHistoryDisplay, setPaymentHistoryDisplay] = useState<FeePaymentFromSupabase[]>([]);
  const [allYearlyFeeItems, setAllYearlyFeeItems] = useState<FeeItemFromSupabase[]>([]);
  const [paymentsForCurrentYear, setPaymentsForCurrentYear] = useState<FeePaymentFromSupabase[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>(TERMS_ORDER[0]);
  
  const [feesForSelectedTermState, setFeesForSelectedTermState] = useState<number>(0);
  const [balanceBroughtForwardState, setBalanceBroughtForwardState] = useState<number>(0);
  const [arrearsFromPreviousYear, setArrearsFromPreviousYear] = useState<number>(0);
  const [subtotalDueThisPeriodState, setSubtotalDueThisPeriodState] = useState<number>(0);
  const [displayTotalPaidState, setDisplayTotalPaidState] = useState<number>(0);
  const [overallOutstandingBalanceState, setOverallOutstandingBalanceState] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [amountToPay, setAmountToPay] = useState<string>('');
  const [paymentSuccessTrigger, setPaymentSuccessTrigger] = useState(0);

  const fetchInitialData = useCallback(async () => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Student not authenticated. Please log in.");

      const { data: studentData, error: studentError } = await supabase
          .from("students").select("auth_user_id, student_id_display, full_name, grade_level, contact_email, total_paid_override").eq("auth_user_id", user.id).single();
      if (studentError) throw new Error(`Could not find student profile: ${studentError.message}`);
      if (isMounted.current) setStudent(studentData);

      const { data: appSettings, error: settingsError } = await supabase
        .from("app_settings").select("current_academic_year").eq('id', 1).single();
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      const fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      if (isMounted.current) {
        setCurrentSystemAcademicYear(fetchedCurrentYear);
      }

      const { data: feeStructureData, error: feeStructureError } = await supabase
        .from("school_fee_items")
        .select("*")
        .eq("grade_level", studentData.grade_level)
        .eq("academic_year", fetchedCurrentYear);

      if (feeStructureError) throw feeStructureError;
      
      const { data: arrearsData, error: arrearsError } = await supabase
        .from("student_arrears")
        .select("amount")
        .eq("student_id_display", studentData.student_id_display)
        .eq("academic_year_to", fetchedCurrentYear)
        .in("status", ["outstanding", "partially_paid"]);
      
      if (arrearsError) throw arrearsError;

      const { data: allPaymentsData, error: allPaymentsError } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id_display", studentData.student_id_display)
        .order("payment_date", { ascending: false });
        
      if (allPaymentsError) throw allPaymentsError;

      let academicYearStartDate = "";
      let academicYearEndDate = "";
      if (fetchedCurrentYear && /^\d{4}-\d{4}$/.test(fetchedCurrentYear)) {
          const startYear = fetchedCurrentYear.substring(0, 4);
          const endYear = fetchedCurrentYear.substring(5, 9);
          academicYearStartDate = `${startYear}-08-01`; 
          academicYearEndDate = `${endYear}-07-31`;     
      }
      
      let currentYearPaymentsQuery = supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id_display", studentData.student_id_display)
        .order("payment_date", { ascending: false });

      if (academicYearStartDate && academicYearEndDate) {
        currentYearPaymentsQuery = currentYearPaymentsQuery
          .gte('payment_date', academicYearStartDate)
          .lte('payment_date', academicYearEndDate);
      }
      
      const { data: currentYearPaymentsData, error: currentYearPaymentsError } = await currentYearPaymentsQuery;

      if (currentYearPaymentsError) throw currentYearPaymentsError;

      if (isMounted.current) {
        setAllYearlyFeeItems(feeStructureData || []);
        setArrearsFromPreviousYear((arrearsData || []).reduce((sum, item) => sum + item.amount, 0));
        setPaymentHistoryDisplay(allPaymentsData || []);
        setPaymentsForCurrentYear(currentYearPaymentsData || []);
      }
    } catch (e: any) {
      console.error("Error fetching initial fee data:", e);
      if (isMounted.current) setError(`Failed to load fee details: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    isMounted.current = true;
    fetchInitialData();
    return () => { isMounted.current = false; };
  }, [fetchInitialData]);

  useEffect(() => {
    if (paymentSuccessTrigger > 0) {
      fetchInitialData();
    }
  }, [paymentSuccessTrigger, fetchInitialData]);

  useEffect(() => {
    if (!student || isLoading || !currentSystemAcademicYear) return;
    
    const selectedTermIndex = TERMS_ORDER.indexOf(selectedTerm);
    const totalPaymentsMadeForCurrentYear = paymentsForCurrentYear.reduce((sum, p) => sum + p.amount_paid, 0);
    
    let paymentPool = totalPaymentsMadeForCurrentYear;
    let feesDueInPreviousTermsInCurrentYear = 0;
    
    for(let i=0; i < selectedTermIndex; i++) {
        const termName = TERMS_ORDER[i];
        const feesForThisTerm = allYearlyFeeItems
            .filter(item => item.term === termName)
            .reduce((sum, item) => sum + item.amount, 0);

        feesDueInPreviousTermsInCurrentYear += feesForThisTerm;
        paymentPool -= Math.min(paymentPool, feesForThisTerm);
    }
    const calculatedBalanceBroughtForward = feesDueInPreviousTermsInCurrentYear - (totalPaymentsMadeForCurrentYear - paymentPool);

    const calculatedFeesForSelectedTerm = allYearlyFeeItems.filter(item => item.term === selectedTerm).reduce((sum, item) => sum + item.amount, 0);
    
    const nonNegativeBalanceBf = Math.max(0, calculatedBalanceBroughtForward); 
    const calculatedSubtotalDueThisPeriod = calculatedFeesForSelectedTerm + nonNegativeBalanceBf;

    const totalFeesDueForAllTermsThisYear = allYearlyFeeItems.reduce((sum, item) => sum + item.amount, 0);
    const calculatedOverallOutstanding = totalFeesDueForAllTermsThisYear + arrearsFromPreviousYear - totalPaymentsMadeForCurrentYear;

    if(isMounted.current) {
        setFeesForSelectedTermState(calculatedFeesForSelectedTerm);
        setBalanceBroughtForwardState(calculatedBalanceBroughtForward);
        setSubtotalDueThisPeriodState(calculatedSubtotalDueThisPeriod);
        setDisplayTotalPaidState(totalPaymentsMadeForCurrentYear);
        setOverallOutstandingBalanceState(calculatedOverallOutstanding);
        
        if (calculatedOverallOutstanding > 0) {
            setAmountToPay(calculatedOverallOutstanding.toFixed(2));
        } else {
            setAmountToPay('');
        }
    }
  }, [student, selectedTerm, currentSystemAcademicYear, allYearlyFeeItems, paymentsForCurrentYear, isLoading, arrearsFromPreviousYear]);
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountToPay(value);
  };
  
  const onPaystackSuccess = useCallback(async (reference: { reference: string }) => {
    if (!isMounted.current) return;
    setIsVerifyingPayment(true);
    toast({
        title: "Payment Submitted...",
        description: "Verifying your transaction. Please wait.",
    });

    try {
        const result = await verifyPaystackTransaction(reference.reference);

        if (result.success) {
            toast({
                title: "Payment Verified!",
                description: "Successfully recorded. Your balance will now update.",
            });
            if (isMounted.current) {
                setPaymentSuccessTrigger(c => c + 1);
            }
        } else {
            toast({
                title: "Verification Failed",
                description: result.message || "Could not verify payment. Please contact support.",
                variant: "destructive",
            });
        }
    } catch (error: any) {
        toast({
            title: "Verification Error",
            description: "An unexpected error occurred during payment verification. Please contact support.",
            variant: "destructive",
        });
    } finally {
        if (isMounted.current) {
            setIsVerifyingPayment(false);
        }
    }
  }, [toast]);
    
  const onPaystackClose = useCallback((reference?: any) => {
    toast({ title: "Payment Canceled", description: `The payment window was closed.${reference?.reference ? ` (Reference: ${reference.reference})` : ''}`, variant: "default" });
    console.log("Paystack payment closed", reference);
  }, [toast]);

  const parsedAmount = parseFloat(amountToPay);

  const paystackConfig: PaystackHookProps = useMemo(() => ({
    publicKey: paystackPublicKeyFromEnv,
    email: student?.contact_email || student?.auth_user_id || "",
    amount: isNaN(parsedAmount) || parsedAmount <= 0 ? 0 : Math.round(parsedAmount * 100),
    currency: 'GHS',
    metadata: {
      custom_fields: [
        {
          display_name: "Student Name",
          variable_name: "student_name",
          value: student?.full_name || "N/A",
        },
        {
          display_name: "Student ID",
          variable_name: "student_id_display",
          value: student?.student_id_display || "N/A",
        },
        {
          display_name: "Grade Level",
          variable_name: "grade_level",
          value: student?.grade_level || "N/A",
        }
      ]
    }
  }), [student, parsedAmount]);
  
  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePayButtonClick = () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount to pay.", variant: "destructive" });
      return;
    }
    initializePayment({
        onSuccess: onPaystackSuccess, 
        onClose: onPaystackClose
    });
  };
  
  const isPaystackDisabled = isVerifyingPayment || !paystackPublicKeyFromEnv || isNaN(parsedAmount) || parsedAmount <= 0;


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
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-6 w-6" /> Error Loading Fees</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Please log in") && ( <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button> )}
        </CardContent>
      </Card>
    );
  }

  if (!student) { 
    return (
      <Card>
        <CardHeader><CardTitle>Student Not Identified</CardTitle></CardHeader>
        <CardContent><p>Please log in to view fee details.</p><Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button></CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><DollarSign className="mr-2 h-8 w-8" /> My Fee Statement</h2>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger id="term-select"><SelectValue placeholder="Select Term" /></SelectTrigger>
            <SelectContent>{TERMS_ORDER.map(term => (<SelectItem key={term} value={term}>{term}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <CardDescription>Displaying fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong>, for <strong>{selectedTerm}</strong>.</CardDescription>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card className="shadow-xl h-full">
            <CardHeader>
                <CardTitle>Fee Summary for {student.full_name} ({student.student_id_display})</CardTitle>
                <CardDescription>Grade Level: {student.grade_level}. All data for {currentSystemAcademicYear}, viewing {selectedTerm}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-secondary/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fees for {selectedTerm}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">GHS {feesForSelectedTermState.toFixed(2)}</p></CardContent></Card>
                <Card className="bg-orange-100 dark:bg-orange-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center"><Library className="mr-2 h-4 w-4"/> Arrears from Previous Year(s)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">GHS {arrearsFromPreviousYear.toFixed(2)}</p></CardContent></Card>
                {balanceBroughtForwardState > 0 ? (<Card className="bg-amber-100 dark:bg-amber-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Balance B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">GHS {balanceBroughtForwardState.toFixed(2)}</p></CardContent></Card>)
                : balanceBroughtForwardState < 0 ? (<Card className="bg-green-100 dark:bg-green-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Credit B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {Math.abs(balanceBroughtForwardState).toFixed(2)}</p></CardContent></Card>)
                : (<Card className="bg-secondary/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Balance B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">GHS 0.00</p></CardContent></Card>)}
                <Card className="bg-green-100 dark:bg-green-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Paid (This Academic Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {displayTotalPaidState.toFixed(2)}</p></CardContent></Card>
                </div>
                <div className="text-xs text-muted-foreground">* Overall Outstanding is calculated as: (Total Fees for {currentSystemAcademicYear}) + (Arrears from Previous Years) - (Total Payments made within {currentSystemAcademicYear}).</div>
                {overallOutstandingBalanceState <= 0 && (<div className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2"/><p className="text-sm text-green-700 dark:text-green-300 font-medium">Your account appears to be up to date for the academic year.</p></div>)}
            </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card className="shadow-lg h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center"><CreditCard className="mr-2 h-6 w-6"/> Online Payment</CardTitle>
                    <CardDescription>Pay your fees securely with Paystack.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className={`p-4 rounded-lg ${overallOutstandingBalanceState > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        <Label className={`text-sm ${overallOutstandingBalanceState > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                            {overallOutstandingBalanceState > 0 ? 'Outstanding Balance:' : 'Account Credit:'}
                        </Label>
                        <p className={`text-3xl font-bold ${overallOutstandingBalanceState > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            GHS {Math.abs(overallOutstandingBalanceState).toFixed(2)}
                        </p>
                    </div>

                    {overallOutstandingBalanceState > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="amount-to-pay">Amount to Pay (GHS)</Label>
                            <Input
                                id="amount-to-pay"
                                type="number"
                                placeholder="Enter amount to pay"
                                value={amountToPay}
                                onChange={handleAmountChange}
                                max={overallOutstandingBalanceState.toFixed(2)}
                                min="0.01"
                                step="0.01"
                            />
                        </div>
                    )}
                    
                    {!paystackPublicKeyFromEnv && <p className="text-xs text-center text-destructive mt-2">Online payment is currently unavailable. Please contact administration.</p>}
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePayButtonClick} className="w-full" disabled={isPaystackDisabled}>
                        {isVerifyingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {isVerifyingPayment ? "Verifying Payment..." : `Pay GHS ${isNaN(parsedAmount) || parsedAmount <= 0 ? '0.00' : parsedAmount.toFixed(2)} Now`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fee Breakdown for {selectedTerm}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Description</TableHead>
                <TableHead className="text-right">Amount (GHS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allYearlyFeeItems.filter(item => item.term === selectedTerm).length > 0 ? (
                allYearlyFeeItems.filter(item => item.term === selectedTerm).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No fee items configured for this term.
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-secondary/50">
                <TableCell className="text-right">Total for {selectedTerm}</TableCell>
                <TableCell className="text-right">
                  GHS {feesForSelectedTermState.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6" /> Payment History (All Payments)</CardTitle></CardHeader>
        <CardContent>
          {paymentHistoryDisplay.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Receipt ID</TableHead><TableHead>Term Paid For</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount (GHS)</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>{paymentHistoryDisplay.map((payment) => (<TableRow key={payment.id}><TableCell>{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</TableCell><TableCell className="font-mono text-xs">{payment.payment_id_display}</TableCell><TableCell>{payment.term_paid_for}</TableCell><TableCell>{payment.payment_method}</TableCell><TableCell className="text-right font-medium">{payment.amount_paid.toFixed(2)}</TableCell><TableCell className="text-xs text-muted-foreground">{payment.notes || "N/A"}</TableCell></TableRow>))}</TableBody>
            </Table>
          ) : (<p className="text-muted-foreground text-center py-8">No payment records found for your account.</p>)}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">For any discrepancies or questions regarding your fee statement, please contact the school administration.</CardFooter>
      </Card>
    </div>
  );
}

    