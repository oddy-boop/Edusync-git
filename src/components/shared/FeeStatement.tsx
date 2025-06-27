
"use client";

import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TERMS_ORDER } from "@/lib/constants";
import React from 'react';

interface FeePayment {
  payment_id_display: string;
  amount_paid: number;
  payment_date: string;
  term_paid_for: string;
}

interface FeeItem {
  id: string;
  grade_level: string;
  term: string;
  description: string;
  amount: number;
  academic_year: string;
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
  feeStructureForYear: FeeItem[];
  currentAcademicYear: string;
}

export function FeeStatement({ student, payments, schoolBranding, feeStructureForYear, currentAcademicYear }: FeeStatementProps) {
  const logoSrc = schoolBranding.school_logo_url || "https://placehold.co/200x80.png";
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalDue = feeStructureForYear.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalDue - totalPaid;

  const feesByTerm: Record<string, FeeItem[]> = {};
  for (const term of TERMS_ORDER) {
    feesByTerm[term] = feeStructureForYear.filter(item => item.term === term);
  }

  return (
    <div className="bg-white text-black p-4 font-sans text-xs" style={{ width: '210mm', minHeight: '320mm', margin: 'auto' }}>
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
          ANNUAL FEE STATEMENT
        </h2>
      </header>

      <section className="student-details text-xs mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <p><strong>Student's Name:</strong> {student.full_name}</p>
          <p><strong>Student ID:</strong> {student.student_id_display}</p>
          <p><strong>Class:</strong> {student.grade_level}</p>
          <p><strong>Academic Year:</strong> {currentAcademicYear}</p>
          <p><strong>Statement Date:</strong> {format(new Date(), "PPP")}</p>
        </div>
      </section>

      <div>
        {/* Fee Bill Section */}
        <div>
          <div style={{ backgroundColor: '#F0F5FA', padding: '4px', color: '#2C3E50', fontWeight: 'bold', borderBottom: '1px solid #ddd', marginBottom: '8px' }}>
            Fee Bill for {currentAcademicYear}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-1 font-bold w-[20%]">Term</TableHead>
                <TableHead className="p-1 font-bold w-[50%]">Description</TableHead>
                <TableHead className="p-1 text-right font-bold w-[30%]">Amount (GHS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TERMS_ORDER.map(term => (
                  feesByTerm[term]?.length > 0 && (
                      <React.Fragment key={term}>
                        {feesByTerm[term].map((item, index) => (
                           <TableRow key={item.id}>
                            {index === 0 && <TableCell rowSpan={feesByTerm[term].length} className="p-1 align-top font-medium">{term}</TableCell>}
                            <TableCell className="p-1">{item.description}</TableCell>
                            <TableCell className="p-1 text-right">{item.amount.toFixed(2)}</TableCell>
                           </TableRow>
                        ))}
                      </React.Fragment>
                  )
              ))}
              <TableRow>
                <TableCell colSpan={2} className="p-1 text-right font-bold text-base">Total Bill for Year:</TableCell>
                <TableCell className="p-1 text-right font-bold text-base">{totalDue.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Payment History Section */}
        <div className="mt-4">
          <div style={{ backgroundColor: '#F0F5FA', padding: '4px', color: '#2C3E50', fontWeight: 'bold', borderBottom: '1px solid #ddd', marginBottom: '8px' }}>
            Payment History for {currentAcademicYear}
          </div>
          {payments.length > 0 ? (
            <Table>
               <TableHeader>
                <TableRow>
                    <TableHead className="p-1 font-bold w-[50%]">Date</TableHead>
                    <TableHead className="p-1 text-right font-bold w-[50%]">Amount (GHS)</TableHead>
                </TableRow>
               </TableHeader>
               <TableBody>
                 {payments.map((payment) => (
                    <TableRow key={payment.payment_id_display}>
                        <TableCell className="p-1">{format(new Date(payment.payment_date + 'T00:00:00'), "dd-MMM-yy")}</TableCell>
                        <TableCell className="p-1 text-right">{payment.amount_paid.toFixed(2)}</TableCell>
                    </TableRow>
                 ))}
                 <TableRow>
                    <TableCell colSpan={1} className="p-1 text-right font-bold text-base">Total Paid:</TableCell>
                    <TableCell className="p-1 text-right font-bold text-base">{totalPaid.toFixed(2)}</TableCell>
                </TableRow>
               </TableBody>
            </Table>
          ) : (
            <div className="text-center p-4 text-muted-foreground">No payments recorded for this academic year.</div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      <table style={{ width: '100%', marginTop: '16px', fontSize: '1.1em' }}>
          <tbody>
              <tr style={{ backgroundColor: '#eee' }}>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>Total Bill (GHS):</td>
                  <td style={{ textAlign: 'right', padding: '8px', width: '120px' }}>{totalDue.toFixed(2)}</td>
              </tr>
              <tr>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>Total Paid (GHS):</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>{totalPaid.toFixed(2)}</td>
              </tr>
              <tr style={{ backgroundColor: balance > 0 ? '#ffeded' : '#edffed', fontWeight: 'bold', borderTop: '2px solid black' }}>
                  <td style={{ textAlign: 'right', padding: '8px' }}>{balance > 0 ? 'Balance Due (GHS):' : 'Credit Balance (GHS):'}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>{Math.abs(balance).toFixed(2)}</td>
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
