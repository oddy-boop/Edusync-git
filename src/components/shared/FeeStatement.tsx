
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
    // Explicitly set text color to black for the entire container to ensure PDF rendering
    // Reduce main padding and overall font size
    <div className="bg-white text-black p-4 font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <header className="text-center mb-4">
        <img
          src={logoSrc}
          alt={`${schoolBranding.school_name} Logo`}
          width="100" // smaller logo
          className="mx-auto mb-2 object-contain"
          style={{ maxHeight: '50px' }}
          data-ai-hint="school logo"
        />
        {/* Using inline styles for colors to ensure they are picked by html2pdf */}
        <h1 className="text-xl font-bold" style={{ color: '#2C3E50' }}>{schoolBranding.school_name}</h1>
        <p className="text-xs">{schoolBranding.school_address}</p>
        <h2 className="text-lg font-semibold mt-3 border-b-2 border-t-2 py-1 inline-block" style={{ borderColor: '#2C3E50' }}>
          STUDENT FEE STATEMENT
        </h2>
      </header>

      <section className="student-details text-xs mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <p><strong>Student's Name:</strong> {student.full_name}</p>
          <p><strong>Student ID:</strong> {student.student_id_display}</p>
          <p><strong>Class:</strong> {student.grade_level}</p>
          <p><strong>Statement Date:</strong> {format(new Date(), "PPP")}</p>
        </div>
      </section>

      <section className="results-table">
        <Table className="text-xs">
          <TableHeader>
            {/* Using a simple background color instead of a complex hsl variable for PDF compatibility */}
            <TableRow style={{ backgroundColor: '#F0F5FA' }}>
              <TableHead className="font-bold py-1 px-2" style={{ color: '#2C3E50' }}>Payment Date</TableHead>
              <TableHead className="font-bold py-1 px-2" style={{ color: '#2C3E50' }}>Receipt ID</TableHead>
              <TableHead className="font-bold py-1 px-2" style={{ color: '#2C3E50' }}>Term/Period</TableHead>
              <TableHead className="font-bold py-1 px-2" style={{ color: '#2C3E50', textAlign: 'right' }}>Amount Paid (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length > 0 ? (
                payments.map((payment, index) => (
                    <TableRow key={index}>
                        <TableCell className="py-1 px-2">{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</TableCell>
                        <TableCell className="font-mono text-xs py-1 px-2">{payment.payment_id_display}</TableCell>
                        <TableCell className="py-1 px-2">{payment.term_paid_for}</TableCell>
                        {/* Using inline style for alignment and ensuring text is black */}
                        <TableCell className="font-medium text-black py-1 px-2" style={{ textAlign: 'right' }}>{payment.amount_paid.toFixed(2)}</TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-20 py-1 px-2" style={{ color: '#666' }}>No payment records found for this student.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Separator className="my-3" />

      {/* Replaced flexbox with a table for the summary to improve PDF rendering reliability */}
      <section className="summary-section mt-4 w-full">
         <div style={{ width: '50%', marginLeft: 'auto', marginRight: '0' }}>
            <table style={{ width: '100%' }} className="text-sm">
                <tbody>
                    <tr className="font-bold text-base">
                        <td style={{ padding: '4px 0', borderTop: '2px solid black' }}>Total Paid:</td>
                        <td style={{ padding: '4px 0', borderTop: '2px solid black', textAlign: 'right' }}>
                            GHS {totalPaid.toFixed(2)}
                        </td>
                    </tr>
                </tbody>
            </table>
         </div>
      </section>

      <footer className="absolute bottom-4 left-4 right-4 mt-12 text-[10px] text-center" style={{ color: '#666' }}>
        <p>Thank you for your continued partnership in your child's education.</p>
        <p>For any inquiries regarding this statement, please contact the school's accounts office.</p>
      </footer>
    </div>
  );
}
