
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface FeePayment {
  payment_id_display: string;
  amount_paid: number;
  payment_date: string;
  term_paid_for: string;
}

interface Student {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface SchoolBranding {
  school_name: string;
  school_address: string;
  school_logo_url: string;
}

interface FeeStatementProps {
  student: Student;
  payments: FeePayment[];
  schoolBranding: SchoolBranding;
}

export function FeeStatement({ student, payments, schoolBranding }: FeeStatementProps) {
  const logoSrc = schoolBranding.school_logo_url || "https://placehold.co/150x80.png";
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);

  return (
    <div className="bg-white text-black p-6 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <header className="text-center mb-6">
        <img
          src={logoSrc}
          alt={`${schoolBranding.school_name} Logo`}
          width="120"
          className="mx-auto mb-2 object-contain"
          style={{ maxHeight: '60px' }}
          data-ai-hint="school logo"
        />
        <h1 className="text-2xl font-bold text-primary">{schoolBranding.school_name}</h1>
        <p className="text-sm">{schoolBranding.school_address}</p>
        <h2 className="text-xl font-semibold mt-4 border-b-2 border-t-2 border-primary py-1 inline-block">
          STUDENT FEE STATEMENT
        </h2>
      </header>

      <section className="student-details text-sm mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <p><strong>Student's Name:</strong> {student.full_name}</p>
          <p><strong>Student ID:</strong> {student.student_id_display}</p>
          <p><strong>Class:</strong> {student.grade_level}</p>
          <p><strong>Statement Date:</strong> {format(new Date(), "PPP")}</p>
        </div>
      </section>

      <section className="results-table">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="font-bold text-primary">Payment Date</TableHead>
              <TableHead className="font-bold text-primary">Receipt ID</TableHead>
              <TableHead className="font-bold text-primary">Term/Period</TableHead>
              <TableHead className="text-right font-bold text-primary">Amount Paid (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length > 0 ? (
                payments.map((payment, index) => (
                    <TableRow key={index}>
                        <TableCell>{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.payment_id_display}</TableCell>
                        <TableCell>{payment.term_paid_for}</TableCell>
                        <TableCell className="text-right font-medium">{payment.amount_paid.toFixed(2)}</TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No payment records found for this student.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Separator className="my-4" />

      <section className="summary-section flex justify-end text-sm mt-4">
        <div className="w-1/2">
            <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                <span>Total Paid:</span>
                <span>GHS {totalPaid.toFixed(2)}</span>
            </div>
        </div>
      </section>

      <footer className="absolute bottom-6 left-6 right-6 mt-12 text-xs text-center text-muted-foreground">
        <p>Thank you for your continued partnership in your child's education.</p>
        <p>For any inquiries regarding this statement, please contact the school's accounts office.</p>
      </footer>
    </div>
  );
}
