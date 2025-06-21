
"use client";

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
    <div className="bg-white text-black p-4 font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <header className="text-center mb-4">
        <img
          src={logoSrc}
          alt={`${schoolBranding.school_name} Logo`}
          width="100"
          className="mx-auto mb-2 object-contain"
          style={{ maxHeight: '50px' }}
          data-ai-hint="school logo"
        />
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="text-xs">
          <thead>
            <tr style={{ backgroundColor: '#F0F5FA' }}>
              <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #ddd', color: '#2C3E50', width: '25%' }}>Payment Date</th>
              <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #ddd', color: '#2C3E50', width: '35%' }}>Receipt ID</th>
              <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #ddd', color: '#2C3E50', width: '20%' }}>Term/Period</th>
              <th style={{ textAlign: 'right', padding: '4px', borderBottom: '1px solid #ddd', color: '#2C3E50', width: '20%' }}>Amount Paid (GHS)</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
                payments.map((payment, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px' }}>{format(new Date(payment.payment_date + 'T00:00:00'), "PPP")}</td>
                        <td style={{ padding: '4px' }}><span className="font-mono">{payment.payment_id_display}</span></td>
                        <td style={{ padding: '4px' }}>{payment.term_paid_for}</td>
                        <td style={{ textAlign: 'right', padding: '4px', fontWeight: '500' }}>{payment.amount_paid.toFixed(2)}</td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={4} style={{ textAlign: 'center', height: '80px', padding: '4px', color: '#666' }}>No payment records found for this student.</td>
                </tr>
            )}
          </tbody>
        </table>
      </section>

      <table style={{ width: '100%', marginTop: '16px' }}>
          <tbody>
              <tr>
                  <td style={{ textAlign: 'right', padding: '8px 4px', borderTop: '2px solid black', fontWeight: 'bold', fontSize: '1.1em' }}>
                      Total Paid: GHS {totalPaid.toFixed(2)}
                  </td>
              </tr>
          </tbody>
      </table>

      <footer className="absolute bottom-4 left-4 right-4 mt-12 text-[10px] text-center" style={{ color: '#666' }}>
        <p>Thank you for your continued partnership in your child's education.</p>
        <p>For any inquiries regarding this statement, please contact the school's accounts office.</p>
      </footer>
    </div>
  );
}
