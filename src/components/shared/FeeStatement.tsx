"use client";

import React from 'react';
import { format } from "date-fns";
import { TERMS_ORDER } from "@/lib/constants";

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
  const logoSrc = schoolBranding.school_logo_url || "https://placehold.co/200x100.png";
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalDue = feeStructureForYear.reduce((sum, item) => sum + item.amount, 0);
  const balance = totalDue - totalPaid;

  const feesByTerm: Record<string, FeeItem[]> = {};
  for (const term of TERMS_ORDER) {
    feesByTerm[term] = feeStructureForYear.filter(item => item.term === term);
  }
  
  // Common CSS classes for table elements to reduce repetition
  const thClass = "p-2 font-bold text-left align-top";
  const tdClass = "p-2 align-top";
  const trClass = "border-b";
  const textRight = "text-right";

  return (
    <div className="bg-white text-black font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <div className="p-8 relative" style={{ minHeight: '297mm' }}>
        <header className="text-center mb-6">
          <img
            src={logoSrc}
            alt={`${schoolBranding.school_name} Logo`}
            className="mx-auto mb-2 object-contain h-16 w-auto"
            data-ai-hint="school logo"
          />
          <h1 className="text-2xl font-bold" style={{ color: '#2C3E50' }}>{schoolBranding.school_name}</h1>
          <p className="text-sm">{schoolBranding.school_address}</p>
          <h2 className="text-xl font-semibold mt-4 border-b-2 border-t-2 py-1 inline-block" style={{ borderColor: '#2C3E50' }}>
            ANNUAL FEE STATEMENT
          </h2>
        </header>

        <section className="text-sm mb-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3 border rounded-md">
            <p><strong>Student's Name:</strong></p><p>{student.full_name}</p>
            <p><strong>Student ID:</strong></p><p>{student.student_id_display}</p>
            <p><strong>Class:</strong></p><p>{student.grade_level}</p>
            <p><strong>Academic Year:</strong></p><p>{currentAcademicYear}</p>
            <p><strong>Statement Date:</strong></p><p>{format(new Date(), "PPP")}</p>
          </div>
        </section>

        {/* Fee Bill Section */}
        <div className="mt-4">
          <div className="text-lg font-semibold text-center py-2 bg-gray-100 border-y mb-2">Fee Bill for {currentAcademicYear}</div>
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b">
                <th className={thClass} style={{ width: '25%' }}>Term</th>
                <th className={thClass} style={{ width: '50%' }}>Description</th>
                <th className={`${thClass} `} style={{ width: '25%' }}>Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              {TERMS_ORDER.map(term => (
                  feesByTerm[term]?.length > 0 && (
                      <React.Fragment key={term}>
                        {feesByTerm[term].map((item, index) => (
                           <tr key={item.id} className={trClass}>
                            {index === 0 && <td rowSpan={feesByTerm[term].length} className={`${tdClass} font-medium`}>{term}</td>}
                            <td className={tdClass}>{item.description}</td>
                            <td className={`${tdClass} `}>{item.amount.toFixed(2)}</td>
                           </tr>
                        ))}
                      </React.Fragment>
                  )
              ))}
              <tr className="border-t-2 border-black">
                <td colSpan={2} className={`${tdClass}  font-bold text-base`}>Total Bill for Year:</td>
                <td className={`${tdClass}  font-bold text-base`}>{totalDue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment History Section */}
        <div className="mt-6">
          <div className="text-lg font-semibold text-center py-2 bg-gray-100 border-y mb-2">Payment History for {currentAcademicYear}</div>
          {payments.length > 0 ? (
            <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
               <thead>
                <tr className="border-b">
                    <th className={thClass} style={{ width: '50%' }}>Date</th>
                    <th className={`${thClass}`} style={{ width: '50%' }}>Amount Paid (GHS)</th>
                </tr>
               </thead>
               <tbody>
                 {payments.map((payment) => (
                    <tr key={payment.payment_id_display} className={trClass}>
                        <td className={tdClass}>{format(new Date(payment.payment_date + 'T00:00:00'), "dd-MMM-yyyy")}</td>
                        <td className={`${tdClass}`}>{payment.amount_paid.toFixed(2)}</td>
                    </tr>
                 ))}
                 <tr className="border-t-2 border-black">
                    <td className={`${tdClass} font-bold text-base`}>Total Paid:</td>
                    <td className={`${tdClass} font-bold text-base`}>{totalPaid.toFixed(2)}</td>
                </tr>
               </tbody>
            </table>
          ) : (
            <div className="text-center p-4 text-gray-500">No payments recorded for this academic year.</div>
          )}
        </div>
      
        <div className="h-4"></div>

        {/* Centered Final Summary */}
        <div className="mx-auto w-full max-w-md text-base mt-4">
          <div className="space-y-2 p-4 border-2 border-black rounded-lg bg-gray-50">
            <div className="flex justify-between">
              <span className="font-semibold">Total Bill (GHS):</span>
              <span className="font-mono">{totalDue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Paid (GHS):</span>
              <span className="font-mono">{totalPaid.toFixed(2)}</span>
            </div>
            <div className="border-t border-black my-2"></div>
            <div className={`flex justify-between font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>{balance > 0 ? 'Balance Due:' : 'Credit Balance:'}</span>
              <span className="font-mono">GHS {Math.abs(balance).toFixed(2)}</span>
            </div>
          </div>
          </div>
        </div>
        <div>
        <footer className="absolute bottom-4 left-8 right-8 text-[10px] text-center" style={{ color: '#666' }}>
          <p>Thank you for your continued partnership in your child's education.</p>
          <p>For any inquiries regarding this statement, please contact the school's accounts office.</p>
        </footer>
      </div>
  
    </div>
  );
}
