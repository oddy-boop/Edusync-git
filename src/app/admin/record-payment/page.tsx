
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
import { Banknote, CalendarIcon, UserCircle2, Receipt, Loader2, AlertCircle, WifiOff, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_METHODS, TERMS_ORDER } from "@/lib/constants";
import { PaymentReceipt, type PaymentDetailsForReceipt } from "@/components/shared/PaymentReceipt";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { recordPaymentAction, getSchoolBrandingAction } from "@/lib/actions/payment.actions";

interface SchoolBranding {
  school_name: string | null;
  school_address: string | null;
  school_logo_url: string | null;
}

const onlinePaymentSchema = z.object({
  studentIdDisplay: z.string().min(1, "Student ID is required."),
  amountPaid: z.coerce.number().positive("Amount paid must be a positive number."),
  paymentDate: z.date({ required_error: "Payment date is required."}),
  paymentMethod: z.string().min(1, "Payment method is required."),
  termPaidFor: z.string().min(1, "Term/Period is required."),
  notes: z.string().optional(),
});

type OnlinePaymentFormData = z.infer<typeof onlinePaymentSchema>;

const offlineReceiptSchema = z.object({
  studentName: z.string().min(1, "Student Name is required."),
  studentId: z.string().optional(),
  gradeLevel: z.string().optional(),
  amountPaid: z.coerce.number().positive("Amount must be a positive number."),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, "Payment method is required."),
  termPaidFor: z.string().min(1, "Term/Period is required."),
  notes: z.string().optional(),
});

type OfflineReceiptFormData = z.infer<typeof offlineReceiptSchema>;

const defaultSchoolBranding: SchoolBranding = {
    school_name: "School",
    school_address: "Location not set",
    school_logo_url: "https://placehold.co/150x80.png"
};

export default function RecordPaymentPage() {
  const { toast } = useToast();
  const [lastPaymentForReceipt, setLastPaymentForReceipt] = useState<PaymentDetailsForReceipt | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(defaultSchoolBranding);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const { user: currentUser } = useAuth();
  const isMounted = useRef(true);

  // State for offline receipt generation
  const [offlineReceiptDetails, setOfflineReceiptDetails] = useState<PaymentDetailsForReceipt | null>(null);

  useEffect(() => {
    isMounted.current = true;
    async function fetchInitialData() {
        if (!isMounted.current) return;
        
        setIsLoadingBranding(true);
        const branding = await getSchoolBrandingAction();
        if (isMounted.current) {
            if(branding) {
                setSchoolBranding(branding);
            }
            setIsLoadingBranding(false);
        }
    }
    
    if (currentUser) {
        fetchInitialData();
    } else {
        setIsLoadingBranding(false);
    }
    return () => { isMounted.current = false; };
  }, [currentUser]);


  const onlineForm = useForm<OnlinePaymentFormData>({
    resolver: zodResolver(onlinePaymentSchema),
    defaultValues: { studentIdDisplay: "", amountPaid: 0, paymentDate: new Date(), paymentMethod: "", termPaidFor: "", notes: "" },
  });

  const offlineForm = useForm<OfflineReceiptFormData>({
    resolver: zodResolver(offlineReceiptSchema),
    defaultValues: { studentName: "", studentId: "", gradeLevel: "", amountPaid: 0, paymentDate: new Date(), paymentMethod: "", termPaidFor: "", notes: "" },
  });

  const onOnlineSubmit = async (data: OnlinePaymentFormData) => {
    const { dismiss } = toast({ title: "Processing Payment...", description: "Verifying student and saving record." });
    
    const result = await recordPaymentAction(data);
    dismiss();

    if(result.success) {
      toast({ title: "Payment Recorded Successfully!", description: result.message });
      if (isMounted.current && result.receiptData) {
          setOfflineReceiptDetails(null); // Clear offline receipt if an online one is generated
          setLastPaymentForReceipt(result.receiptData);
      }
      onlineForm.reset({ studentIdDisplay: "", amountPaid: 0, paymentDate: new Date(), paymentMethod: "", termPaidFor: "", notes: "" });
    } else {
      toast({ title: "Recording Failed", description: result.message, variant: "destructive" });
      if(result.errorField) {
        onlineForm.setError(result.errorField as any, { type: "manual", message: result.message });
      }
    }
  };

  const onOfflineGenerate = (data: OfflineReceiptFormData) => {
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "Admin user not found. Please re-login to ensure the receipt is valid.", variant: "destructive" });
        return;
    }
    const receiptData: PaymentDetailsForReceipt = {
        paymentId: `OFFLINE-${Date.now()}`,
        studentId: data.studentId || "N/A",
        studentName: data.studentName,
        gradeLevel: data.gradeLevel || "N/A",
        amountPaid: data.amountPaid,
        paymentDate: format(data.paymentDate, "PPP"),
        paymentMethod: data.paymentMethod,
        termPaidFor: data.termPaidFor,
        notes: data.notes || "",
        schoolName: schoolBranding.school_name,
        schoolLocation: schoolBranding.school_address,
        schoolLogoUrl: schoolBranding.school_logo_url,
        receivedBy: session.fullName || "Admin",
    };
    setLastPaymentForReceipt(null); // Clear online receipt
    setOfflineReceiptDetails(receiptData);
    toast({ title: "Offline Receipt Generated", description: "You can now print this receipt. Remember to record this payment online later." });
  };
  
  if (isLoadingBranding || !currentUser) {
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
          <CardTitle className="flex items-center text-2xl font-headline"><Banknote className="mr-2 h-6 w-6" /> Record Fee Payment (Online)</CardTitle>
          <CardDescription>Enter payment details to save to the database and generate an official receipt. Requires internet connection.</CardDescription>
        </CardHeader>
        <Form {...onlineForm}>
          <form onSubmit={onlineForm.handleSubmit(onOnlineSubmit)}>
            <CardContent className="space-y-6">
              <FormField control={onlineForm.control} name="studentIdDisplay" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center"><UserCircle2 className="mr-2 h-4 w-4" />Student ID</FormLabel><FormControl><Input placeholder="Enter Student ID" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={onlineForm.control} name="amountPaid" render={({ field }) => (
                  <FormItem><FormLabel>Amount Paid (GHS)</FormLabel><FormControl><Input type="number" placeholder="e.g., 500.00" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={onlineForm.control} name="paymentDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Payment Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent></Popover><FormMessage />
                  </FormItem>
                )}/>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={onlineForm.control} name="paymentMethod" render={({ field }) => (
                  <FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl><SelectContent>{PAYMENT_METHODS.map((method) => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={onlineForm.control} name="termPaidFor" render={({ field }) => (
                  <FormItem><FormLabel>Term/Period Paid For</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl><SelectContent>{TERMS_ORDER.map((term) => (<SelectItem key={term} value={term}>{term}</SelectItem>))}<SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={onlineForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details about the payment (e.g., part payment, specific fee item)" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={onlineForm.formState.isSubmitting}>
                {onlineForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Record Payment & Generate Receipt"}
                 <Receipt className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Separator />

      <Card className="shadow-lg border-amber-500 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-amber-800"><WifiOff className="mr-2 h-6 w-6" /> Offline Receipt Generator</CardTitle>
          <CardDescription className="text-amber-700">Use this form to generate a printable receipt when you have no internet. Remember to enter this payment online later.</CardDescription>
        </CardHeader>
        <Form {...offlineForm}>
          <form onSubmit={offlineForm.handleSubmit(onOfflineGenerate)}>
            <CardContent className="space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                 <FormField control={offlineForm.control} name="studentName" render={({ field }) => (
                    <FormItem><FormLabel>Student Full Name</FormLabel><FormControl><Input placeholder="Manually enter student name" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={offlineForm.control} name="studentId" render={({ field }) => (
                    <FormItem><FormLabel>Student ID (Optional)</FormLabel><FormControl><Input placeholder="Manually enter student ID" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
               </div>
               <div className="grid md:grid-cols-2 gap-6">
                 <FormField control={offlineForm.control} name="gradeLevel" render={({ field }) => (
                    <FormItem><FormLabel>Grade Level (Optional)</FormLabel><FormControl><Input placeholder="e.g., Basic 1" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                 <FormField control={offlineForm.control} name="amountPaid" render={({ field }) => (
                    <FormItem><FormLabel>Amount Paid (GHS)</FormLabel><FormControl><Input type="number" placeholder="500.00" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>
                  )}/>
               </div>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={offlineForm.control} name="paymentMethod" render={({ field }) => (
                    <FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl><SelectContent>{PAYMENT_METHODS.map((method) => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={offlineForm.control} name="termPaidFor" render={({ field }) => (
                    <FormItem><FormLabel>Term/Period Paid For</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger></FormControl><SelectContent>{TERMS_ORDER.map((term) => (<SelectItem key={term} value={term}>{term}</SelectItem>))}<SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="secondary" className="w-full sm:w-auto" disabled={offlineForm.formState.isSubmitting}>
                <Printer className="mr-2 h-4 w-4" /> Generate Offline Receipt
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {lastPaymentForReceipt && <PaymentReceipt paymentDetails={lastPaymentForReceipt} />}
      {offlineReceiptDetails && <PaymentReceipt paymentDetails={offlineReceiptDetails} />}
    </div>
  );
}
