
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Receipt } from "lucide-react"; 
import { useState, useEffect } from 'react';

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
  schoolName: string | null; 
  schoolLocation: string | null; 
  schoolLogoUrl?: string | null; 
  receivedBy: string; 
}

interface PaymentReceiptProps {
  paymentDetails: PaymentDetailsForReceipt;
}

// Function to convert an image URL to a Base64 Data URI
async function toDataURL(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch(e) {
        console.error("Failed to fetch image for data URL conversion:", e);
        // Fallback to placeholder if fetch fails (e.g., CORS issue)
        return "https://placehold.co/150x80.png?text=Logo+Unavailable";
    }
}

export function PaymentReceipt({ paymentDetails }: PaymentReceiptProps) {
  const [logoSrc, setLogoSrc] = useState<string>("https://placehold.co/150x80.png");

  useEffect(() => {
    let isMounted = true;
    if (paymentDetails.schoolLogoUrl) {
      toDataURL(paymentDetails.schoolLogoUrl)
        .then(dataUrl => {
          if (isMounted) {
            setLogoSrc(dataUrl);
          }
        })
        .catch(err => {
          console.error("Failed to convert receipt logo to Data URL, using placeholder.", err);
        });
    }
    return () => { isMounted = false; };
  }, [paymentDetails.schoolLogoUrl]);

  const handleDownload = async () => {
    if (typeof window !== "undefined") {
      const element = document.getElementById(`receipt-${paymentDetails.paymentId}`);
      if (!element) {
        console.error("Could not find printable area for receipt.");
        return;
      }
      
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin:       0.5,
        filename:     `Receipt-${paymentDetails.studentName.replace(/\s+/g, '_')}-${paymentDetails.paymentId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a5', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt).save();
    }
  };

  const handlePrint = () => {
    const printableArea = document.getElementById(`receipt-${paymentDetails.paymentId}`);
    if (printableArea) {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow?.document.write('<html><head><title>Print Receipt</title>');
        printWindow?.document.write('<style>body { font-family: sans-serif; font-size: 12px; } .receipt-details { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .text-primary { color: #2C3E50; } .text-muted-foreground { color: #666; } .mt-2 { margin-top: 8px; } .mb-2 { margin-bottom: 8px; } .my-3 { margin-top: 12px; margin-bottom: 12px; } .text-xl { font-size: 1.25rem; } .text-base { font-size: 1rem; } .py-3 { padding-top: 12px; padding-bottom: 12px; } .border-t { border-top: 1px solid #ccc; } .border-b { border-bottom: 1px solid #ccc; } .border-dashed { border-style: dashed; } .mx-auto { margin-left: auto; margin-right: auto; } .h-12 { height: 3rem; } .w-auto { width: auto; } .object-contain { object-fit: contain; } .grid { display: grid; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .gap-4 { gap: 1rem; } .items-end { align-items: flex-end; } .justify-between { justify-content: space-between; } .flex { display: flex; } .w-2/5 { width: 40%; } .mt-10 { margin-top: 2.5rem; } .mt-1 { margin-top: 0.25rem; }</style>');
        printWindow?.document.write('</head><body>');
        printWindow?.document.write(printableArea.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
    }
  };


  return (
    <Card className="shadow-xl mt-8">
      <CardHeader className="flex flex-row justify-between items-center no-print">
        <CardTitle className="flex items-center">
          <Receipt className="mr-2 h-6 w-6 text-primary" />
          Payment Receipt Preview
        </CardTitle>
        <div>
            <Button onClick={handlePrint} variant="outline" size="sm" className="mr-2">Print</Button>
            <Button onClick={handleDownload} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Download</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div id={`receipt-${paymentDetails.paymentId}`} className="bg-white p-4 text-black">
            <div className="receipt-header pt-4 text-center">
            {logoSrc && (
                <img src={logoSrc} alt={`${paymentDetails.schoolName || 'School'} Logo`} className="mx-auto mb-2 object-contain h-12 w-auto" data-ai-hint="school logo"/>
            )}
            <h1 className="text-xl font-bold text-primary">{paymentDetails.schoolName}</h1>
            <p className="text-xs text-muted-foreground">{paymentDetails.schoolLocation}</p>
            <p className="text-base font-semibold mt-2">OFFICIAL RECEIPT</p>
            </div>
            
            <Separator className="my-3" />

            <div className="receipt-details text-xs">
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
              <p className="text-center text-base">
                  AMOUNT PAID: <strong className="text-xl font-bold text-accent">GHS {paymentDetails.amountPaid.toFixed(2)}</strong>
              </p>
            </div>
            
            <div className="signature-section mt-6 text-xs text-muted-foreground grid grid-cols-2 gap-4">
                <div className="signature-block text-center">
                    <p>Received By: {paymentDetails.receivedBy}</p>
                    <div className="signature-line mt-10 border-t border-dashed border-gray-400"></div>
                    <p className="mt-1">(School Official Signature)</p>
                </div>
                <div className="signature-block text-center">
                    <p>Payer's Signature:</p>
                    <div className="signature-line mt-10 border-t border-dashed border-gray-400"></div>
                    <p className="mt-1">(Student/Guardian Signature)</p>
                </div>
            </div>
            <div className="footer-text mt-4 pt-3 border-t text-[10px] text-center text-muted-foreground">
                <p>Thank you for your payment!</p>
                <p>All payments are non-refundable. Please keep this receipt for your records.</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
