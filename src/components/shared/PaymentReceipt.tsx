
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
        // Use a smaller paper size for a receipt, like 'a5'
        jsPDF:        { unit: 'in', format: 'a5', orientation: 'portrait' }
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
        {/* Added text-xs to the printable area */}
        <div id="receipt-printable-area" className="bg-white p-4 text-xs">
            <div className="receipt-header pt-4 text-center">
            <img 
                src={logoSrc} 
                alt={`${paymentDetails.schoolName} Logo`} 
                width="100" // smaller logo
                className="mx-auto mb-2 object-contain" 
                style={{maxHeight: '50px'}}
                data-ai-hint="school logo"
            />
            {/* Reduced header sizes */}
            <h1 className="text-xl font-bold text-primary">{paymentDetails.schoolName}</h1>
            <p className="text-xs text-muted-foreground">{paymentDetails.schoolLocation}</p>
            <p className="text-base font-semibold mt-2">OFFICIAL RECEIPT</p>
            </div>
            
            <Separator className="my-3" />

            <div className="receipt-details grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <p><strong>Receipt No:</strong> {paymentDetails.paymentId}</p>
            <p><strong>Payment Date:</strong> {paymentDetails.paymentDate}</p>
            <p><strong>Student Name:</strong> {paymentDetails.studentName}</p>
            <p><strong>Student ID:</strong> {paymentDetails.studentId}</p>
            <p><strong>Grade Level:</strong> {paymentDetails.gradeLevel}</p>
            <p><strong>Payment Method:</strong> {paymentDetails.paymentMethod}</p>
            </div>

            <Separator className="my-3" />
            
            <div className="payment-info text-xs">
            <p><strong>Term/Period Paid For:</strong> {paymentDetails.termPaidFor}</p>
            {paymentDetails.notes && <p><strong>Notes:</strong> {paymentDetails.notes}</p>}
            </div>

            <div className="amount-section my-4 py-3 border-t border-b border-dashed">
             {/* Reduced amount text size */}
            <p className="text-center text-base">
                AMOUNT PAID: <strong className="text-xl font-bold text-accent">GHS {paymentDetails.amountPaid.toFixed(2)}</strong>
            </p>
            </div>
            
            <div className="signature-section mt-6 text-xs text-muted-foreground grid grid-cols-2 gap-4">
                <div className="signature-block text-center">
                    <p>Received By: {paymentDetails.receivedBy}</p>
                    <div className="signature-line mt-8 border-t border-dashed border-gray-400"></div>
                    <p className="mt-1">(School Official Signature)</p>
                </div>
                <div className="signature-block text-center">
                    <p>Payer's Signature:</p>
                    <div className="signature-line mt-8 border-t border-dashed border-gray-400"></div>
                    <p className="mt-1">(Student/Guardian Signature)</p>
                </div>
            </div>
            <div className="footer-text mt-4 pt-3 border-t text-[10px] text-center text-muted-foreground">
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
