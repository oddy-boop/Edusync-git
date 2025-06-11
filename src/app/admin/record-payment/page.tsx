
"use client";

import { useState, useEffect } from "react";
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
import { Banknote, CalendarIcon, UserCircle2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { REGISTERED_STUDENTS_KEY, FEE_PAYMENTS_KEY, PAYMENT_METHODS, SCHOOL_FEE_STRUCTURE_KEY } from "@/lib/constants";
import { PaymentReceipt, type PaymentDetails } from "@/components/shared/PaymentReceipt";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase"; // Import Firestore instance
import { collection, addDoc, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore"; // Import Firestore functions

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  currentBalance?: number; 
  // other fields...
}

interface FeeItem {
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
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

export default function RecordPaymentPage() {
  const { toast } = useToast();
  const [lastPayment, setLastPayment] = useState<PaymentDetails | null>(null);

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

  // This function still uses localStorage for student balance and fee structure.
  // It's a known temporary state during migration.
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
    // Fetch student from Firestore to ensure it exists
    let student: RegisteredStudent | null = null;
    try {
        const studentDocRef = doc(db, "students", data.studentId);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
            student = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as RegisteredStudent;
        }
    } catch (error) {
        console.error("Error fetching student from Firestore:", error);
        toast({
            title: "Error",
            description: "Could not verify student ID. Please check connection or contact support.",
            variant: "destructive",
        });
        return;
    }
    
    if (!student) {
      toast({
        title: "Error",
        description: "Student ID not found in Firestore. Please verify and try again.",
        variant: "destructive",
      });
      form.setError("studentId", { type: "manual", message: "Student ID not found." });
      return;
    }

    const paymentId = `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Prepare payment record for localStorage (as before, for existing dependencies)
    const paymentRecordForLocalStorage: PaymentDetails = {
      paymentId,
      studentId: student.studentId,
      studentName: student.fullName,
      gradeLevel: student.gradeLevel,
      amountPaid: data.amountPaid,
      paymentDate: format(data.paymentDate, "PPP"), // Formatted string date
      paymentMethod: data.paymentMethod,
      termPaidFor: data.termPaidFor,
      notes: data.notes || "",
      schoolName: "St. Joseph's Montessori",
      schoolLocation: "Ghana",
      receivedBy: "Admin"
    };

    // Prepare payment document for Firestore
    const paymentDocumentForFirestore = {
      paymentId, // Store the receipt ID for reference
      studentId: student.studentId,
      studentName: student.fullName, // Denormalized for easier display if needed
      gradeLevel: student.gradeLevel, // Denormalized
      amountPaid: data.amountPaid,
      paymentTimestamp: Timestamp.fromDate(data.paymentDate), // Firestore Timestamp
      paymentMethod: data.paymentMethod,
      termPaidFor: data.termPaidFor,
      notes: data.notes || "",
      receivedBy: "Admin", // Or dynamically get current admin user
      createdAt: Timestamp.now(), // Record creation time
    };

    try {
      // Save to Firestore
      const paymentCollectionRef = collection(db, "payments");
      await addDoc(paymentCollectionRef, paymentDocumentForFirestore);
      console.log("Payment saved to Firestore successfully.");

      // Save to localStorage (temporary dual write)
      if (typeof window !== 'undefined') {
        let existingPayments: PaymentDetails[] = [];
        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        existingPayments = paymentsRaw ? JSON.parse(paymentsRaw) : [];
        existingPayments.push(paymentRecordForLocalStorage);
        localStorage.setItem(FEE_PAYMENTS_KEY, JSON.stringify(existingPayments));
        console.log("Payment saved to localStorage (temporary).");
      }

      // Calculate and update balance (still uses localStorage for payments for now)
      const newBalance = calculateAndUpdateBalance(student.studentId);

      toast({
        title: "Payment Recorded Successfully!",
        description: `Payment of GHS ${data.amountPaid.toFixed(2)} for ${student.fullName} recorded in Firestore. LocalStorage Balance (may differ): GHS ${newBalance?.toFixed(2) ?? 'N/A'}.`,
      });
      setLastPayment(paymentRecordForLocalStorage); // For receipt display
      form.reset({
        studentId: "",
        amountPaid: 0,
        paymentDate: new Date(),
        paymentMethod: "",
        termPaidFor: "",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to save payment:", error);
      toast({
        title: "Recording Failed",
        description: "Could not save payment data to Firestore. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <Banknote className="mr-2 h-6 w-6" /> Record Fee Payment
          </CardTitle>
          <CardDescription>
            Enter the details of the fee payment received. Payment will be saved to Firestore. A receipt will be generated.
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
