
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
import { Banknote, CalendarIcon, UserCircle2, Receipt, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_METHODS, TERMS_ORDER } from "@/lib/constants";
import { PaymentReceipt, type PaymentDetailsForReceipt } from "@/components/shared/PaymentReceipt";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from '@/lib/supabaseClient';
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Student data structure from Supabase
interface StudentFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface AppSettingsForReceipt {
  school_name: string;
  school_address: string;
  school_logo_url: string;
}

const paymentSchema = z.object({
  studentIdDisplay: z.string().min(1, "Student ID is required."),
  amountPaid: z.coerce.number().positive("Amount paid must be a positive number."),
  paymentDate: z.date({ required_error: "Payment date is required."}),
  paymentMethod: z.string().min(1, "Payment method is required."),
  termPaidFor: z.string().min(1, "Term/Period is required."),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const defaultSchoolBranding: AppSettingsForReceipt = {
    school_name: "EduSync Platform",
    school_address: "Location not set",
    school_logo_url: "https://placehold.co/150x80.png"
};

export default function RecordPaymentPage() {
  const { toast } = useToast();
  const [lastPaymentForReceipt, setLastPaymentForReceipt] = useState<PaymentDetailsForReceipt | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<AppSettingsForReceipt>(defaultSchoolBranding);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isMounted = useRef(true);
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;
    async function fetchInitialData() {
        if (!isMounted.current || typeof window === 'undefined') return;
        
        // Fetch Admin User
        const { data: { session } } = await supabase.auth.getSession();
        if(isMounted.current) setCurrentUser(session?.user || null);

        // Fetch School Branding
        setIsLoadingBranding(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('school_name, school_address, school_logo_url')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("RecordPaymentPage: Error fetching app settings:", error);
                if (isMounted.current) setSchoolBranding(defaultSchoolBranding);
            } else if (data) {
                 if (isMounted.current) {
                    setSchoolBranding({
                        school_name: data.school_name || defaultSchoolBranding.school_name,
                        school_address: data.school_address || defaultSchoolBranding.school_address,
                        school_logo_url: data.school_logo_url || defaultSchoolBranding.school_logo_url,
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
    fetchInitialData();
    return () => { isMounted.current = false; };
  }, [supabase]);


  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentIdDisplay: "",
      amountPaid: 0,
      paymentDate: new Date(),
      paymentMethod: "",
      termPaidFor: "",
      notes: "",
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "Admin user not found. Please re-login.", variant: "destructive" });
        return;
    }
    
    const { dismiss } = toast({
      title: "Processing Payment...",
      description: "Verifying student and saving record.",
    });

    let student: StudentFromSupabase | null = null;
    try {
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('student_id_display, full_name, grade_level')
            .eq('student_id_display', data.studentIdDisplay)
            .single();

        if (studentError) {
            console.error("RecordPaymentPage: Error fetching student:", studentError);
            if (studentError.code === 'PGRST116') { 
                dismiss();
                toast({ title: "Error", description: "Student ID not found in records.", variant: "destructive" });
            } else {
                dismiss();
                toast({ title: "Database Error", description: `Could not verify student: ${studentError.message}`, variant: "destructive" });
            }
            form.setError("studentIdDisplay", { type: "manual", message: "Student ID not found or error fetching." });
            return;
        }
        student = studentData;
    } catch (e: any) {
        dismiss();
        toast({ title: "Error", description: `Failed to verify student: ${e.message}`, variant: "destructive" });
        return;
    }

    if (!student) { // Should be caught above, but as a safeguard
      dismiss();
      toast({ title: "Error", description: "Student ID not found. Please verify and try again.", variant: "destructive" });
      form.setError("studentIdDisplay", { type: "manual", message: "Student ID not found." });
      return;
    }

    const paymentIdDisplay = `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const receivedByName = currentUser.user_metadata?.full_name || currentUser.email || "Admin";
    
    const paymentToSaveToSupabase = {
      payment_id_display: paymentIdDisplay,
      student_id_display: student.student_id_display,
      student_name: student.full_name,
      grade_level: student.grade_level,
      amount_paid: data.amountPaid,
      payment_date: format(data.paymentDate, "yyyy-MM-dd"), // Store as YYYY-MM-DD
      payment_method: data.paymentMethod,
      term_paid_for: data.termPaidFor,
      notes: data.notes || null,
      received_by_name: receivedByName,
      received_by_user_id: currentUser.id,
    };

    try {
      const { data: insertedPayment, error: insertError } = await supabase
        .from('fee_payments')
        .insert([paymentToSaveToSupabase])
        .select()
        .single();

      if (insertError) {
        console.error("Error saving payment:", insertError);
        dismiss();
        toast({ title: "Database Error", description: `Could not record payment: ${insertError.message}`, variant: "destructive" });
        return;
      }
      
      dismiss();
      if (insertedPayment && isMounted.current) {
          const receiptData: PaymentDetailsForReceipt = {
            paymentId: insertedPayment.payment_id_display,
            studentId: insertedPayment.student_id_display,
            studentName: insertedPayment.student_name,
            gradeLevel: insertedPayment.grade_level,
            amountPaid: insertedPayment.amount_paid,
            paymentDate: format(new Date(insertedPayment.payment_date), "PPP"), // Format for display
            paymentMethod: insertedPayment.payment_method,
            termPaidFor: insertedPayment.term_paid_for,
            notes: insertedPayment.notes ?? "",
            schoolName: schoolBranding.school_name,
            schoolLocation: schoolBranding.school_address,
            schoolLogoUrl: schoolBranding.school_logo_url,
            receivedBy: insertedPayment.received_by_name,
          };
          setLastPaymentForReceipt(receiptData);
      }

      toast({
        title: "Payment Recorded Successfully!",
        description: `Payment of GHS ${data.amountPaid.toFixed(2)} for ${student.full_name} recorded.`,
      });
      form.reset({
        studentIdDisplay: "",
        amountPaid: 0,
        paymentDate: new Date(),
        paymentMethod: "",
        termPaidFor: "",
        notes: "",
      });
    } catch (error: any) {
      dismiss();
      console.error("Failed to save payment (general catch):", error);
      toast({
        title: "Recording Failed",
        description: `Could not save payment data: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  if (isLoadingBranding || !currentUser) { // Also wait for currentUser
      return (
        <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading school details and admin session...</p>
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
            Enter the details of the fee payment received. Payment will be saved to the database. A receipt will be generated. Student details are verified.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="studentIdDisplay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle2 className="mr-2 h-4 w-4" />Student ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Student ID" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TERMS_ORDER.map((term) => (
                            <SelectItem key={term} value={term}>
                              {term}
                            </SelectItem>
                          ))}
                           <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Record Payment & Generate Receipt"}
                 <Receipt className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {lastPaymentForReceipt && (
        <PaymentReceipt paymentDetails={lastPaymentForReceipt} />
      )}
    </div>
  );
}
