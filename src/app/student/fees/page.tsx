
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { REGISTERED_STUDENTS_KEY, SCHOOL_FEE_STRUCTURE_KEY, FEE_PAYMENTS_KEY } from "@/lib/constants";
import { type PaymentDetails } from "@/components/shared/PaymentReceipt"; // Using existing type
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
  currentBalance?: number;
  // other fields if needed
}

interface FeeItem {
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
}

export default function StudentFeesPage() {
  const [student, setStudent] = useState<RegisteredStudent | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [totalFeesDue, setTotalFeesDue] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Mocking logged-in student ID. In a real app, this would come from auth context.
  const MOCKED_STUDENT_ID = "224SJM1234"; // Replace with actual logic when auth is in place

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fetch student data
      const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      // In a real app, you'd get the logged-in student's ID dynamically
      // For now, we'll try to find a student. If your registration process creates a student with this ID, it will work.
      // Otherwise, you'll need to manually ensure a student with MOCKED_STUDENT_ID exists in localStorage.
      const currentStudent = allStudents.find(s => s.studentId === MOCKED_STUDENT_ID); // Example: use first student or a fixed ID
      
      if (currentStudent) {
        setStudent(currentStudent);

        // Fetch fee structure
        const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
        const feeStructure: FeeItem[] = feeStructureRaw ? JSON.parse(feeStructureRaw) : [];
        const due = feeStructure
          .filter(item => item.gradeLevel === currentStudent.gradeLevel)
          .reduce((sum, item) => sum + item.amount, 0);
        setTotalFeesDue(due);

        // Fetch payments for this student
        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
        const studentPayments = allPayments.filter(p => p.studentId === currentStudent.studentId);
        setPayments(studentPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())); // Sort by date desc
        
        const paid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        setTotalPaid(paid);
        
      } else {
        console.warn(`Mock student ID ${MOCKED_STUDENT_ID} not found. Please register this student or adjust the mock ID.`);
      }
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading fee details...</p></div>;
  }

  if (!student) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-6 w-6" /> Student Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Could not load fee details. Student information is not available. 
            Please ensure you are logged in correctly or contact administration if the issue persists.
            (Note: For testing, ensure student ID '{MOCKED_STUDENT_ID}' is registered).
          </p>
           <Button asChild className="mt-4">
            <Link href="/auth/student/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const calculatedBalance = totalFeesDue - totalPaid;
  // Prefer currentBalance from student record if available (updated by admin), otherwise use locally calculated one.
  const displayBalance = typeof student.currentBalance === 'number' ? student.currentBalance : calculatedBalance;


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <DollarSign className="mr-2 h-8 w-8" /> My Fee Statement
      </h2>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Fee Summary for {student.fullName} ({student.studentId})</CardTitle>
          <CardDescription>Grade Level: {student.gradeLevel}</CardDescription>
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
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">GHS {totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className={displayBalance <= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${displayBalance <= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${displayBalance <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  GHS {displayBalance.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
          {typeof student.currentBalance !== 'number' && (
             <div className="text-xs text-muted-foreground">
              * Balance calculated based on current records. It may be updated by administration.
            </div>
          )}
          {displayBalance <= 0 && (
            <div className="flex items-center p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2"/>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Your account is up to date. No outstanding balance.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Payment History
          </CardTitle>
          <CardDescription>A record of all fee payments made.</CardDescription>
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
            <p className="text-muted-foreground text-center py-8">No payment records found for your account.</p>
          )}
        </CardContent>
         <CardFooter className="text-sm text-muted-foreground">
            For any discrepancies or questions regarding your fee statement, please contact the school administration.
        </CardFooter>
      </Card>
      
    </div>
  );
}
