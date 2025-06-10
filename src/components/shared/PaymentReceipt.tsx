
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Download } from "lucide-react";
import Image from 'next/image'; // For school logo

export interface PaymentDetails {
  paymentId: string;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  amountPaid: number;
  paymentDate: string; // Expected to be pre-formatted string
  paymentMethod: string;
  termPaidFor: string;
  notes?: string;
  schoolName: string;
  schoolLocation: string;
  receivedBy: string;
}

interface PaymentReceiptProps {
  paymentDetails: PaymentDetails;
}

export function PaymentReceipt({ paymentDetails }: PaymentReceiptProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      const printContents = document.getElementById("receipt-printable-area")?.innerHTML;
      const originalContents = document.body.innerHTML;
      
      if (printContents) {
        // Temporarily hide non-printable elements or apply print-specific styles via a class
        const nonPrintable = document.querySelectorAll('.no-print');
        nonPrintable.forEach(el => el.classList.add('hidden-for-print'));
        
        document.body.innerHTML = `
          <html>
            <head>
              <title>Payment Receipt - ${paymentDetails.paymentId}</title>
              <style>
                body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; }
                .receipt-container { border: 1px solid #ccc; padding: 20px; max-width: 700px; margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .receipt-header { text-align: center; margin-bottom: 20px; }
                .receipt-header img { max-height: 60px; margin-bottom: 10px; }
                .receipt-header h1 { margin: 0; font-size: 1.5em; color: #2C3E50; }
                .receipt-header p { margin: 2px 0; font-size: 0.9em; }
                .receipt-details, .payment-info { margin-bottom: 15px; }
                .receipt-details p, .payment-info p { margin: 5px 0; font-size: 0.95em; }
                .receipt-details strong, .payment-info strong { display: inline-block; width: 150px; color: #555; }
                .amount-section { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc; }
                .amount-section h2 { text-align: center; font-size: 1.3em; color: #C0392B; }
                .footer-section { margin-top: 30px; text-align: center; font-size: 0.8em; color: #777; }
                .signature-line { border-top: 1px solid #555; margin-top: 40px; width: 200px; display: inline-block;}
                @media print {
                  body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .receipt-container { border: none; box-shadow: none; margin: 0; max-width: 100%;}
                  .no-print-on-actual-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div class="receipt-container">
                ${printContents}
                 <div class="footer-section no-print-on-actual-print" style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #777;">
                    <p>This is a computer-generated receipt.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        window.print();
        document.body.innerHTML = originalContents;
        // Re-initialize any scripts or re-attach event listeners if needed after restoring body
        window.location.reload(); // Simple way to restore state, might be disruptive.
      }
       nonPrintable.forEach(el => el.classList.remove('hidden-for-print'));
    }
  };

  return (
    <Card className="shadow-xl mt-8">
      <CardHeader className="flex flex-row justify-between items-center no-print">
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 h-6 w-6 text-primary" />
          Payment Receipt Preview
        </CardTitle>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </CardHeader>
      <CardContent id="receipt-printable-area">
        <div className="receipt-header pt-4">
          <Image src="/images/school_logo.png" alt="School Logo" width={80} height={80} className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary">{paymentDetails.schoolName}</h1>
          <p className="text-sm text-muted-foreground">{paymentDetails.schoolLocation}</p>
          <p className="text-lg font-semibold mt-2">OFFICIAL RECEIPT</p>
        </div>
        
        <Separator className="my-4" />

        <div className="receipt-details grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p><strong>Receipt No:</strong> {paymentDetails.paymentId}</p>
          <p><strong>Payment Date:</strong> {paymentDetails.paymentDate}</p>
          <p><strong>Student Name:</strong> {paymentDetails.studentName}</p>
          <p><strong>Student ID:</strong> {paymentDetails.studentId}</p>
          <p><strong>Grade Level:</strong> {paymentDetails.gradeLevel}</p>
          <p><strong>Payment Method:</strong> {paymentDetails.paymentMethod}</p>
        </div>

        <Separator className="my-4" />
        
        <div className="payment-info text-sm">
          <p><strong>Term/Period Paid For:</strong> {paymentDetails.termPaidFor}</p>
          {paymentDetails.notes && <p><strong>Notes:</strong> {paymentDetails.notes}</p>}
        </div>

        <div className="amount-section my-6 py-4 border-t border-b border-dashed">
          <p className="text-center text-lg">
            AMOUNT PAID: <strong className="text-2xl font-bold text-accent">GHS {paymentDetails.amountPaid.toFixed(2)}</strong>
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-8 text-sm text-muted-foreground">
            <div>
                <p>Received By: {paymentDetails.receivedBy}</p>
                <div className="mt-12 border-t border-foreground w-4/5"></div>
                <p className="mt-1">(School Official Signature)</p>
            </div>
            <div className="text-right">
                <p>Payer's Signature:</p>
                 <div className="mt-12 border-t border-foreground w-4/5 ml-auto"></div>
                 <p className="mt-1">(Student/Guardian Signature)</p>
            </div>
        </div>
        <div className="footer-section mt-6 pt-4 border-t text-xs text-center text-muted-foreground">
            <p>Thank you for your payment!</p>
            <p>All payments are non-refundable. Please keep this receipt for your records.</p>
        </div>

      </CardContent>
      <CardFooter className="justify-end no-print">
         <Button onClick={handlePrint} variant="default">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </CardFooter>
    </Card>
  );
}

// Add this to your globals.css or a print-specific stylesheet
/*
@media print {
  .no-print {
    display: none !important;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
.hidden-for-print {
  display: none !important;
}
*/
