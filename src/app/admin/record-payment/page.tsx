
"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, CalendarIcon, UserCircle2, Receipt, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { REGISTERED_STUDENTS_KEY, FEE_PAYMENTS_KEY, PAYMENT_METHODS, SCHOOL_FEE_STRUCTURE_KEY } from "@/lib/constants";
import { PaymentReceipt, type PaymentDetails } from "@/components/shared/PaymentReceipt";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from '@/lib/supabaseClient';

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  currentBalance?: number; 
}

interface FeeItem {
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
}

interface AppSettingsForReceipt { // For school branding
  schoolName: string;
  schoolAddress: string; 
  schoolLogoUrl: string;
}

const paymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required.").regex(/^\d{3}SJM\d{4}$/, { message: "Student ID format is invalid (e.g., 224SJM1234)." }),
  amountPaid: z.coerce.number().positive("Amount paid must be a positive number."),
  paymentDate: z.date({ required_error: "Payment date is required."}),
  paymentMethod: z.string().min(1, "Payment method is required."),
  termPaidFor: z.string().min(1, "Term/Period is required."),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const defaultSchoolBranding: AppSettingsForReceipt = {
    schoolName: "St. Joseph's Montessori",
    schoolAddress: "Location not set", // Changed from schoolLocation to schoolAddress
    schoolLogoUrl: "https://placehold.co/150x80.png"
};

export default function RecordPaymentPage() {
  const { toast } = useToast();
  const [lastPayment, setLastPayment] = useState<PaymentDetails | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<AppSettingsForReceipt>(defaultSchoolBranding);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;
    async function fetchSchoolBranding() {
        if (!isMounted.current || typeof window === 'undefined') return;
        setIsLoadingBranding(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('schoolName, schoolAddress, schoolLogoUrl')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
                console.error("RecordPaymentPage: Error fetching app settings:", error);
                if (isMounted.current) setSchoolBranding(defaultSchoolBranding);
            } else if (data) {
                 if (isMounted.current) {
                    setSchoolBranding({
                        schoolName: data.schoolName || defaultSchoolBranding.schoolName,
                        schoolAddress: data.schoolAddress || defaultSchoolBranding.schoolAddress,
                        schoolLogoUrl: data.schoolLogoUrl || defaultSchoolBranding.schoolLogoUrl,
                    });
                 }
            } else {
                 if (isMounted.current) setSchoolBranding(defaultSchoolBranding);
            }
        } catch (e) {
            console.error("RecordPaymentPage: Exception fetching app settings:", e);
            if (isMounted.current) setSchoolBranding(defaultSchoolBranding);
        } finally {
            if (isMounted.current) setIsLoadingBranding(false);
        }
    }
    fetchSchoolBranding();
    return () => { isMounted.current = false; };
  }, [supabase]);


  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: "",
      amountPaid: 0,
      paymentDate: new Date(),
      paymentMethod: "",
      termPaidFor: "",
      notes: "",
    },
  });

  const calculateAndUpdateBalance = (studentId: string) => {
    if (typeof window === 'undefined') return;

    const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
    let allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
    const studentIndex = allStudents.findIndex(s => s.studentId === studentId);
    if (studentIndex === -1) return;

    const student = allStudents[studentIndex];

    const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
    const feeStructure: FeeItem[] = feeStructureRaw ? JSON.parse(feeStructureRaw) : [];

    const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
    const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];

    const studentFeesDue = feeStructure
      .filter(item => item.gradeLevel === student.gradeLevel)
      .reduce((sum, item) => sum + item.amount, 0);

    const studentTotalPaid = allPayments
      .filter(p => p.studentId === studentId)
      .reduce((sum, p) => sum + p.amountPaid, 0);
      
    const newBalance = studentFeesDue - studentTotalPaid;
    allStudents[studentIndex] = { ...student, currentBalance: newBalance };
    localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(allStudents));
    
    return newBalance;
  };


  const onSubmit = async (data: PaymentFormData) => {
    if (typeof window === 'undefined') {
        toast({ title: "Error", description: "LocalStorage not available.", variant: "destructive" });
        return;
    }
    
    const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
    const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
    const student = allStudents.find(s => s.studentId === data.studentId);
    
    if (!student) {
      toast({
        title: "Error",
        description: "Student ID not found in localStorage. Please verify and try again.",
        variant: "destructive",
      });
      form.setError("studentId", { type: "manual", message: "Student ID not found." });
      return;
    }

    const paymentId = `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const paymentRecord: PaymentDetails = {
      paymentId,
      studentId: student.studentId,
      studentName: student.fullName,
      gradeLevel: student.gradeLevel,
      amountPaid: data.amountPaid,
      paymentDate: format(data.paymentDate, "PPP"), 
      paymentMethod: data.paymentMethod,
      termPaidFor: data.termPaidFor,
      notes: data.notes || "",
      schoolName: schoolBranding.schoolName,
      schoolLocation: schoolBranding.schoolAddress, // Using schoolAddress as schoolLocation
      schoolLogoUrl: schoolBranding.schoolLogoUrl,
      receivedBy: "Admin", // Assuming Admin is recording
    };

    try {
      const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
      const existingPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
      existingPayments.push(paymentRecord);
      localStorage.setItem(FEE_PAYMENTS_KEY, JSON.stringify(existingPayments));

      const newBalance = calculateAndUpdateBalance(student.studentId);

      toast({
        title: "Payment Recorded Successfully!",
        description: `Payment of GHS ${data.amountPaid.toFixed(2)} for ${student.fullName} recorded in localStorage. Balance: GHS ${newBalance?.toFixed(2) ?? 'N/A'}.`,
      });
      if (isMounted.current) setLastPayment(paymentRecord); 
      form.reset({
        studentId: "",
        amountPaid: 0,
        paymentDate: new Date(),
        paymentMethod: "",
        termPaidFor: "",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to save payment to localStorage:", error);
      toast({
        title: "Recording Failed",
        description: "Could not save payment data to localStorage. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoadingBranding) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading school details for receipt...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <Banknote className="mr-2 h-6 w-6" /> Record Fee Payment
          </CardTitle>
          <CardDescription>
            Enter the details of the fee payment received. Payment will be saved to local browser storage. A receipt will be generated.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle2 className="mr-2 h-4 w-4" />Student ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter 10-digit Student ID (e.g., 224SJM1234)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (GHS)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 500.00" {...field} step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termPaidFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term/Period Paid For</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Term 1, 2023/2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional details about the payment (e.g., part payment, specific fee item)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recording..." : "Record Payment & Generate Receipt"}
                 <Receipt className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {lastPayment && (
        <PaymentReceipt paymentDetails={lastPayment} />
      )}
    </div>
  );
}
