
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Receipt } from "lucide-react"; 
import html2pdf from 'html2pdf.js';

export interface PaymentDetailsForReceipt {
  paymentId: string;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  amountPaid: number;
  paymentDate: string; 
  paymentMethod: string;
  termPaidFor: string;
  notes?: string;
  schoolName: string; 
  schoolLocation: string; 
  schoolLogoUrl?: string; 
  receivedBy: string; 
}

interface PaymentReceiptProps {
  paymentDetails: PaymentDetailsForReceipt;
}

export function PaymentReceipt({ paymentDetails }: PaymentReceiptProps) {
  const handleDownload = () => {
    if (typeof window !== "undefined") {
      const element = document.getElementById("receipt-printable-area");
      if (!element) {
        console.error("Could not find printable area for receipt.");
        return;
      }
      
      const opt = {
        margin:       0.5,
        filename:     `Receipt-${paymentDetails.paymentId}-${paymentDetails.studentName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt).save();
    }
  };

  const logoSrc = paymentDetails.schoolLogoUrl || "https://placehold.co/150x80.png"; 

  return (
    <Card className="shadow-xl mt-8">
      <CardHeader className="flex flex-row justify-between items-center no-print">
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 h-6 w-6 text-primary" />
          Payment Receipt Preview
        </CardTitle>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Download Receipt
        </Button>
      </CardHeader>
      <CardContent>
        <div id="receipt-printable-area" className="bg-white p-4">
            <div className="receipt-header pt-4">
            <img 
                src={logoSrc} 
                alt={`${paymentDetails.schoolName} Logo`} 
                width="150" 
                className="mx-auto mb-3 object-contain" 
                style={{maxHeight: '80px', width: '150px'}}
                data-ai-hint="school logo"
            />
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
            
            <div className="signature-section mt-8 text-sm text-muted-foreground">
                <div className="signature-block">
                    <p>Received By: {paymentDetails.receivedBy}</p>
                    <div className="signature-line"></div>
                    <p className="mt-1">(School Official Signature)</p>
                </div>
                <div className="signature-block">
                    <p>Payer's Signature:</p>
                    <div className="signature-line"></div>
                    <p className="mt-1">(Student/Guardian Signature)</p>
                </div>
            </div>
            <div className="footer-text mt-6 pt-4 border-t text-xs text-center text-muted-foreground">
                <p>Thank you for your payment!</p>
                <p>All payments are non-refundable. Please keep this receipt for your records.</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end no-print">
         <Button onClick={handleDownload} variant="default">
          <Download className="mr-2 h-4 w-4" /> Download Receipt
        </Button>
      </CardFooter>
    </Card>
  );
}
