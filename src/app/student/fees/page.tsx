
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2, Loader2, Library, CreditCard } from "lucide-react";
import { TERMS_ORDER } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from '@/lib/auth-context';
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PaymentGatewaySelection from "@/components/shared/PaymentGatewaySelection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StudentProfile {
  auth_user_id: string;
  student_id_display: string;
  full_name: string;
  grade_level: string;
  contact_email?: string | null;
  total_paid_override?: number | null;
  school_id?: number;
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
  school_id?: number;
  name?: string;
  grade_level?: string | null;
  term?: string | null;
  description?: string | null;
  total_amount: number;
  platform_fee?: number;
  total_fee?: number;
  academic_year?: string | null;
  created_at?: string | null;
}

// Helper to format currency consistently and guard non-number values
const formatGhs = (value: unknown) => Number((value as any) ?? 0).toFixed(2);

export default function StudentFeesPage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
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
  const supabase = createClient();
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [amountToPay, setAmountToPay] = useState<string>('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setIsLoading(true);
    setError(null);

    try {
      // Wait for auth to finish loading before proceeding
      if (authLoading) {
        setIsLoading(false);
        return;
      }
      
      if (!user) throw new Error("Student not authenticated. Please log in.");

    const { data: studentData, error: studentError } = await supabase
      .from("students").select("auth_user_id, student_id_display, full_name, grade_level, contact_email, total_paid_override, school_id").eq("auth_user_id", user.id).single();
      if (studentError) throw new Error(`Could not find student profile: ${studentError.message}`);
      if (isMounted.current) setStudent(studentData);

      // Determine current academic year from the student's school settings.
      // Some deployments don't have a global `app_settings` table; read from `schools` instead.
      let fetchedCurrentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      try {
        const { data: schoolSettings, error: schoolSettingsError } = await supabase
          .from('schools')
          .select('current_academic_year')
          .eq('id', studentData.school_id)
          .maybeSingle();
        if (schoolSettingsError) {
          console.warn('Could not read school settings, falling back to default academic year', schoolSettingsError);
        } else if (schoolSettings?.current_academic_year) {
          fetchedCurrentYear = schoolSettings.current_academic_year;
        }
      } catch (e) {
        // keep fallback
      }
      if (isMounted.current) {
        setCurrentSystemAcademicYear(fetchedCurrentYear);
      }

      // Fetch fee items for this school. Some deployments store term/grade_level
      // on the fee items, while others store simple name/amount rows.
      const { data: feeStructureData, error: feeStructureError } = await supabase
        .from("school_fees")
        .select("*")
        .eq("school_id", studentData.school_id);

      if (feeStructureError) throw feeStructureError;
      
      const { data: arrearsData, error: arrearsError } = await supabase
        .from("student_arrears")
        .select("amount_owed")
        .eq("student_id_display", studentData.student_id_display)
        .eq("academic_year", fetchedCurrentYear)
        .in("status", ["outstanding", "partially_paid"]);
      
      if (arrearsError) throw arrearsError;

      const { data: allPaymentsData, error: allPaymentsError } = await supabase
        .from("fee_payments")
        .select("*, amount_paid")
        .eq("student_id_display", studentData.student_id_display)
        .order("payment_date", { ascending: false });
        
      if (allPaymentsError) {
        console.error("Critical Error: Failed to fetch fee payments for student.", allPaymentsError);
        throw new Error(`Could not load your payment history. This is often due to a database security policy (RLS). Error: ${allPaymentsError.message}`);
      }

      let academicYearStartDate = "";
      let academicYearEndDate = "";
      if (fetchedCurrentYear && /^\d{4}-\d{4}$/.test(fetchedCurrentYear)) {
          const startYear = fetchedCurrentYear.split('-')[0];
          const endYear = fetchedCurrentYear.split('-')[1];
          academicYearStartDate = `${startYear}-08-01`; 
          academicYearEndDate = `${endYear}-07-31`;     
      }
      
      // Normalize payment amounts to numbers to avoid runtime errors when rendering
      const normalizedAllPayments = (allPaymentsData || []).map((p: any) => ({
        ...p,
        amount_paid: Number(p?.amount_paid ?? 0),
      }));

      let currentYearPaymentsData = (normalizedAllPayments || []).filter(p => {
        if (!academicYearStartDate || !academicYearEndDate) return true;
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= new Date(academicYearStartDate) && paymentDate <= new Date(academicYearEndDate);
      });

      // If there are no payments inside the academic-year window (data drift),
      // fall back to using all payments for this student so totals render.
      if (currentYearPaymentsData.length === 0) {
        console.warn('[StudentFeesPage] No payments in academic year for', studentData.student_id_display, 'falling back to all-time payments');
        currentYearPaymentsData = normalizedAllPayments || [];
      }

      // Normalize fee items: ensure numeric amounts and canonical fields
      const normalizedFeeItems = (feeStructureData || []).map((it: any) => ({
        ...it,
        amount: Number(it?.amount ?? 0),
      }));

      if (isMounted.current) {
        setAllYearlyFeeItems(normalizedFeeItems);
  setArrearsFromPreviousYear((arrearsData || []).reduce((sum, item) => sum + (item.amount_owed ?? 0), 0));
  setPaymentHistoryDisplay(normalizedAllPayments || []);
        setPaymentsForCurrentYear(currentYearPaymentsData || []);
      }
    } catch (e: any) {
      console.error("Error fetching initial fee data:", e);
      if (isMounted.current) setError(`Failed to load fee details: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [supabase, user, authLoading]);

  useEffect(() => {
    isMounted.current = true;
    fetchInitialData();
    return () => { isMounted.current = false; };
  }, [fetchInitialData]);


  useEffect(() => {
    if (!student || isLoading || !currentSystemAcademicYear) return;
    
    // Total payments for the current year
    const totalPaymentsMadeForCurrentYear = paymentsForCurrentYear.reduce((sum, p) => sum + p.amount_paid, 0);

    // Only consider fee items that apply to this student (grade level and academic year)
    const studentGradeNorm = String(student.grade_level || '').toLowerCase();
    const applicableFeeItems = allYearlyFeeItems.filter(item => {
      const itemGrade = (item.grade_level ?? '').toString().trim().toLowerCase();
      const gradeOk = !itemGrade || itemGrade === 'all' || itemGrade === 'any' || itemGrade === studentGradeNorm;
      const yearOk = !item.academic_year || item.academic_year === currentSystemAcademicYear;
      return gradeOk && yearOk;
    });

    // Total fees for the entire current year (for this student)
    const totalFeesDueForAllTermsThisYear = applicableFeeItems.reduce((sum, item) => sum + (Number(item.total_fee) || Number(item.total_amount) || 0), 0);
    
    // --- New Balance B/F Logic ---
    const selectedTermIndex = TERMS_ORDER.indexOf(selectedTerm);
    let feesDueBeforeThisTerm = 0;
    let paymentsMadeForPriorTerms = 0;

    for (let i = 0; i < selectedTermIndex; i++) {
        const termName = TERMS_ORDER[i];
    feesDueBeforeThisTerm += applicableFeeItems
      .filter(item => item.term === termName)
      .reduce((sum, item) => sum + (Number(item.total_fee) || Number(item.total_amount) || 0), 0);

    paymentsMadeForPriorTerms += paymentsForCurrentYear
      .filter(p => p.term_paid_for === termName)
      .reduce((sum, p) => sum + p.amount_paid, 0);
    }
    const balanceBf = feesDueBeforeThisTerm - paymentsMadeForPriorTerms;
    // --- End New Logic ---
    
    // Fees for the currently selected term
  // For the selected term include items explicitly assigned to the term
  // as well as general items with no term specified (treat as applicable to the selected term)
    // Primary: items explicitly for the term or with no term (general fees)
    let calculatedFeesForSelectedTerm = applicableFeeItems
        .filter(item => (item.term && String(item.term) === selectedTerm) || !item.term)
        .reduce((sum, item) => sum + (Number(item.total_fee) || Number(item.total_amount) || 0), 0);

    // Fallback 1: look for items whose name/description mention the term
    if (calculatedFeesForSelectedTerm === 0) {
      const termLower = selectedTerm.toString().toLowerCase();
      calculatedFeesForSelectedTerm = applicableFeeItems
        .filter(item => (item.name && item.name.toString().toLowerCase().includes(termLower)) || (item.description && item.description.toString().toLowerCase().includes(termLower)))
        .reduce((sum, item) => sum + (Number(item.total_fee) || Number(item.total_amount) || 0), 0);
    }

    // Fallback 2: if still zero, distribute general (no-term) items evenly across terms
    if (calculatedFeesForSelectedTerm === 0) {
      const generalItems = applicableFeeItems.filter(item => !item.term);
      if (generalItems.length > 0) {
        const totalGeneral = generalItems.reduce((s, it) => s + (Number(it.total_fee) || Number(it.total_amount) || 0), 0);
        const perTerm = totalGeneral / Math.max(1, TERMS_ORDER.length);
        calculatedFeesForSelectedTerm = perTerm;
      }
    }
    
    // Subtotal for the statement
    const calculatedSubtotalDueThisPeriod = calculatedFeesForSelectedTerm + balanceBf;
    
    // The overall account balance
    const calculatedOverallOutstanding = totalFeesDueForAllTermsThisYear + arrearsFromPreviousYear - totalPaymentsMadeForCurrentYear;

    if(isMounted.current) {
        setFeesForSelectedTermState(calculatedFeesForSelectedTerm);
        setBalanceBroughtForwardState(balanceBf);
        setSubtotalDueThisPeriodState(calculatedSubtotalDueThisPeriod);
        setDisplayTotalPaidState(totalPaymentsMadeForCurrentYear);
        setOverallOutstandingBalanceState(calculatedOverallOutstanding);
        
    if (calculatedOverallOutstanding > 0) {
      setAmountToPay(formatGhs(calculatedOverallOutstanding));
    } else {
      setAmountToPay('');
    }
    }
  }, [student, selectedTerm, currentSystemAcademicYear, allYearlyFeeItems, paymentsForCurrentYear, isLoading, arrearsFromPreviousYear]);
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountToPay(value);
  };
  
  // Handle payment initiation with Paystack
  const handlePaymentInitiated = useCallback(async (gateway: 'paystack', paymentUrl: string) => {
    toast({
      title: "Payment Initiated",
      description: "Redirecting to Paystack for secure payment...",
    });
    
    // Open payment URL in new window/tab
    window.open(paymentUrl, '_blank', 'width=500,height=700');
    
    // Close the payment dialog
    setIsPaymentDialogOpen(false);
    
    // Start polling for payment verification after a short delay
    setTimeout(() => {
      pollForPaymentCompletion();
    }, 3000);
  }, [toast]);

  // Poll for payment completion
  const pollForPaymentCompletion = useCallback(() => {
    toast({
      title: "Payment in Progress",
      description: "We'll automatically refresh your balance once payment is complete.",
    });
    
    // In a real implementation, you'd poll an endpoint to check payment status
    // For now, we'll refresh the data after a delay
    setTimeout(() => {
      fetchInitialData();
    }, 10000);
  }, [fetchInitialData, toast]);

  const parsedAmount = parseFloat(amountToPay);
  
  const handlePayButtonClick = () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ 
        title: "Invalid Amount", 
        description: "Please enter a valid positive amount to pay.", 
        variant: "destructive" 
      });
      return;
    }
    setIsPaymentDialogOpen(true);
  };


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
                <Card className="bg-secondary/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fees for {selectedTerm}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">GHS {formatGhs(feesForSelectedTermState)}</p></CardContent></Card>
                <Card className="bg-orange-100 dark:bg-orange-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center"><Library className="mr-2 h-4 w-4"/> Arrears from Previous Year(s)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">GHS {formatGhs(arrearsFromPreviousYear)}</p></CardContent></Card>
                {balanceBroughtForwardState > 0 ? (<Card className="bg-amber-100 dark:bg-amber-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Balance B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">GHS {formatGhs(balanceBroughtForwardState)}</p></CardContent></Card>)
                : balanceBroughtForwardState < 0 ? (<Card className="bg-green-100 dark:bg-green-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Credit B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {formatGhs(Math.abs(balanceBroughtForwardState))}</p></CardContent></Card>)
                : (<Card className="bg-secondary/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Balance B/F from Prior Terms (This Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">GHS 0.00</p></CardContent></Card>)}
                <Card className="bg-green-100 dark:bg-green-900/30"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Paid (This Academic Year)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {formatGhs(displayTotalPaidState)}</p></CardContent></Card>
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
                    <CardDescription>Pay your fees securely with multiple payment options.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className={`p-4 rounded-lg ${overallOutstandingBalanceState > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        <Label className={`text-sm ${overallOutstandingBalanceState > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                            {overallOutstandingBalanceState > 0 ? 'Outstanding Balance:' : 'Account Credit:'}
                        </Label>
                        <p className={`text-3xl font-bold ${overallOutstandingBalanceState > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            GHS {formatGhs(Math.abs(overallOutstandingBalanceState))}
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
                                max={formatGhs(overallOutstandingBalanceState)}
                                min="0.01"
                                step="0.01"
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                onClick={handlePayButtonClick} 
                                className="w-full" 
                                disabled={isNaN(parsedAmount) || parsedAmount <= 0 || overallOutstandingBalanceState <= 0}
                            >
                                Pay GHS {isNaN(parsedAmount) || parsedAmount <= 0 ? '0.00' : parsedAmount.toFixed(2)} Now
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Secure Payment with Paystack</DialogTitle>
                            </DialogHeader>
                            {student && (
                                <PaymentGatewaySelection
                                    amount={parsedAmount}
                                    studentId={student.student_id_display}
                                    schoolId={student.school_id?.toString() || ''}
                                    feeType="School Fees"
                                    onPaymentInitiated={handlePaymentInitiated}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
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
                <TableHead className="text-right">School Fee (GHS)</TableHead>
                <TableHead className="text-right">Total (GHS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allYearlyFeeItems.filter(item => item.term === selectedTerm).length > 0 ? (
                allYearlyFeeItems.filter(item => item.term === selectedTerm).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{formatGhs(item?.total_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatGhs(item?.total_fee || item?.total_amount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No fee items configured for this term.
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold bg-secondary/50">
                <TableCell colSpan={2} className="text-right">Total for {selectedTerm}</TableCell>
                <TableCell className="text-right">
                  GHS {formatGhs(feesForSelectedTermState)}
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
              <TableBody>{paymentHistoryDisplay.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.payment_id_display}</TableCell>
                  <TableCell>{payment.term_paid_for}</TableCell>
                  <TableCell>{payment.payment_method}</TableCell>
                  <TableCell className="text-right font-medium">{formatGhs(payment?.amount_paid)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{payment.notes || "N/A"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : (<p className="text-muted-foreground text-center py-8">No payment records found for your account.</p>)}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">For any discrepancies or questions regarding your fee statement, please contact the school administration.</CardFooter>
      </Card>
    </div>
  );
}
