
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
    // The main A4-sized container
    <div className="bg-white text-black font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      {/* A padded wrapper for all content to create margins */}
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
          <div className="text-lg font-semibold text-center py-2 bg-gray-100 border-y">Fee Bill for {currentAcademicYear}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2 font-bold w-[25%]">Term</TableHead>
                <TableHead className="p-2 font-bold w-[50%]">Description</TableHead>
                <TableHead className="p-2 text-right font-bold w-[25%]">Amount (GHS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TERMS_ORDER.map(term => (
                  feesByTerm[term]?.length > 0 && (
                      <React.Fragment key={term}>
                        {feesByTerm[term].map((item, index) => (
                           <TableRow key={item.id} className="border-b">
                            {index === 0 && <TableCell rowSpan={feesByTerm[term].length} className="p-2 align-top font-medium">{term}</TableCell>}
                            <TableCell className="p-2">{item.description}</TableCell>
                            <TableCell className="p-2 text-right">{item.amount.toFixed(2)}</TableCell>
                           </TableRow>
                        ))}
                      </React.Fragment>
                  )
              ))}
              <TableRow className="border-t-2 border-black">
                <TableCell colSpan={2} className="p-2 text-right font-bold text-base">Total Bill for Year:</TableCell>
                <TableCell className="p-2 text-right font-bold text-base">{totalDue.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Payment History Section */}
        <div className="mt-6">
          <div className="text-lg font-semibold text-center py-2 bg-gray-100 border-y">Payment History for {currentAcademicYear}</div>
          {payments.length > 0 ? (
            <Table>
               <TableHeader>
                <TableRow>
                    <TableHead className="p-2 font-bold w-[50%]">Date</TableHead>
                    <TableHead className="p-2 text-right font-bold w-[50%]">Amount (GHS)</TableHead>
                </TableRow>
               </TableHeader>
               <TableBody>
                 {payments.map((payment) => (
                    <TableRow key={payment.payment_id_display} className="border-b">
                        <TableCell className="p-2">{format(new Date(payment.payment_date + 'T00:00:00'), "dd-MMM-yyyy")}</TableCell>
                        <TableCell className="p-2 text-right">{payment.amount_paid.toFixed(2)}</TableCell>
                    </TableRow>
                 ))}
                 <TableRow className="border-t-2 border-black">
                    <TableCell className="p-2 text-right font-bold text-base">Total Paid:</TableCell>
                    <TableCell className="p-2 text-right font-bold text-base">{totalPaid.toFixed(2)}</TableCell>
                </TableRow>
               </TableBody>
            </Table>
          ) : (
            <div className="text-center p-4 text-muted-foreground">No payments recorded for this academic year.</div>
          )}
        </div>
      
        <Separator className="my-6" />

        {/* Centered Final Summary */}
        <div className="mx-auto w-full max-w-md text-base">
          <div className="space-y-2 p-4 border-2 border-black rounded-lg bg-gray-50">
            <div className="flex justify-between">
              <span className="font-semibold">Total Bill (GHS):</span>
              <span className="font-mono">{totalDue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Total Paid (GHS):</span>
              <span className="font-mono">{totalPaid.toFixed(2)}</span>
            </div>
            <Separator className="bg-black"/>
            <div className={`flex justify-between font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>{balance > 0 ? 'Balance Due:' : 'Credit Balance:'}</span>
              <span className="font-mono">GHS {Math.abs(balance).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <footer className="absolute bottom-8 left-8 right-8 text-[10px] text-center" style={{ color: '#666' }}>
          <p>Thank you for your continued partnership in your child's education.</p>
          <p>For any inquiries regarding this statement, please contact the school's accounts office.</p>
        </footer>
      </div>
    </div>
  );
}
