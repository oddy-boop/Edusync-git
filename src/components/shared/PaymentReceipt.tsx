
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Receipt } from "lucide-react"; 
import Image from 'next/image';

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
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      const printArea = document.getElementById("receipt-printable-area");
      if (!printArea) {
        console.error("Could not find printable area for receipt.");
        return;
      }
      const printContents = printArea.innerHTML;

      const htmlToPrint = `
        <html>
          <head>
            <title>Payment Receipt - ${paymentDetails.paymentId}</title>
            <style>
              body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; }
              .receipt-container { border: 1px solid #ccc; padding: 20px; max-width: 700px; margin: auto; }
              .receipt-header { text-align: center; margin-bottom: 20px; }
              .receipt-header img { max-height: 60px; margin-bottom: 10px; object-fit: contain; }
              .receipt-header h1 { margin: 0; font-size: 1.5em; color: #2C3E50; }
              .receipt-header p { margin: 2px 0; font-size: 0.9em; }
              .receipt-details, .payment-info { margin-bottom: 15px; }
              .receipt-details p, .payment-info p { margin: 5px 0; font-size: 0.95em; }
              .receipt-details strong, .payment-info strong { display: inline-block; min-width: 140px; color: #555; }
              .amount-section { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc; }
              .amount-section p { text-align: center; font-size: 1.3em; }
              .amount-section strong { font-size: 1.15em; color: #C0392B; } /* Accent color for amount */
              .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
              .signature-block { width: 45%; text-align: center; }
              .signature-line { border-top: 1px solid #555; margin-top: 30px; width: 80%; display: inline-block;}
              .footer-text { margin-top: 30px; text-align: center; font-size: 0.8em; color: #777; }
              @media print {
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .receipt-container { border: none; box-shadow: none; margin: 0; max-width: 100%;}
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              ${printContents}
              <div class="footer-text no-print" style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #777;">
                  <p>This is a computer-generated receipt.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'Print Frame');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlToPrint);
        iframeDoc.close();
        
        const images = iframeDoc.getElementsByTagName('img');
        let imagesLoaded = 0;
        const totalImages = images.length;
        let printTriggered = false;

        const attemptPrint = () => {
          if (printTriggered) return;
          printTriggered = true;
          if (iframe.contentWindow) {
            iframe.contentWindow.focus(); 
            iframe.contentWindow.print();
          }
          // Delay removal slightly to ensure print dialog is fully processed
          setTimeout(() => {
            if (document.body.contains(iframe)) {
                 document.body.removeChild(iframe);
            }
          }, 500);
        };

        if (totalImages === 0) {
          setTimeout(attemptPrint, 250); 
        } else {
          for (let i = 0; i < totalImages; i++) {
            const img = images[i];
            if (img.complete && img.naturalHeight !== 0) {
              imagesLoaded++;
            } else {
              img.onload = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                  attemptPrint();
                }
              };
              img.onerror = () => {
                imagesLoaded++;
                console.warn("An image failed to load for printing:", img.src);
                if (imagesLoaded === totalImages) {
                  attemptPrint();
                }
              };
            }
          }
          if (imagesLoaded === totalImages) { // All images were already complete
            attemptPrint();
          } else {
            // Fallback timeout in case onload events don't fire for all images (e.g. cached or network issues)
            setTimeout(() => {
              if (!printTriggered) {
                console.warn("Not all images confirmed loaded before printing timeout, proceeding anyway.");
                attemptPrint();
              }
            }, 3000); // Max wait 3 seconds
          }
        }
      } else {
        console.error("Could not access iframe document for printing.");
        if (document.body.contains(iframe)) {
             document.body.removeChild(iframe);
        }
      }
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
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </CardHeader>
      <CardContent> {/* This CardContent's direct children become the printable area */}
        <div id="receipt-printable-area">
            <div className="receipt-header pt-4">
            {paymentDetails.schoolLogoUrl ? (
                <Image 
                    src={logoSrc} 
                    alt={`${paymentDetails.schoolName} Logo`} 
                    width={150} 
                    height={80} 
                    className="mx-auto mb-3 object-contain" 
                    style={{maxHeight: '80px'}}
                    data-ai-hint="school logo"
                    // For printing, ensure browser handles image loading, next/image optimizations are client-side
                    unoptimized={true} 
                />
            ) : (
              <div className="mx-auto mb-3" style={{width: '150px', height: '80px', backgroundColor: '#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', color: '#777', fontSize:'12px'}}>Logo Placeholder</div>
            )}
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
         <Button onClick={handlePrint} variant="default">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </CardFooter>
    </Card>
  );
}

