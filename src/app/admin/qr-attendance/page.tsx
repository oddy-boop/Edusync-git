
"use client";

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QRCodeGenerator: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Generate a static QR code with a simple payload.
    // The security check is now handled on the teacher's device.
    const data = JSON.stringify({
      type: "school_attendance_checkin",
      school_id: "edusync_main_campus" // A static identifier
    });

    QRCode.toDataURL(data, { errorCorrectionLevel: 'H', width: 500 }, (err, url) => {
      if (err) {
        console.error("QR Code generation error:", err);
        setError("Failed to generate QR code.");
        toast({ title: "Error", description: "Could not generate the QR code.", variant: "destructive" });
      } else {
        setQrCode(url);
      }
    });
  }, [toast]);

  const handleDownload = () => {
    if (!qrCode) {
        toast({ title: "Error", description: "QR code not available for download.", variant: "destructive"});
        return;
    }
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'school-attendance-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline flex items-center justify-center">
            <QrCode className="mr-2 h-7 w-7"/> Staff Attendance QR Code
        </CardTitle>
        <CardDescription>
            Display this QR code for teachers to scan for check-in. This code is static and does not need to be refreshed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        {error ? (
          <div className="text-destructive text-center">
            <p>{error}</p>
          </div>
        ) : qrCode ? (
          <img src={qrCode} alt="Attendance QR Code" width={300} height={300} className="border-4 border-primary p-2 rounded-lg"/>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin mb-2" />
            <p>Generating secure QR code...</p>
          </div>
        )}
        <Button onClick={handleDownload} disabled={!qrCode} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4"/>
            Download QR Code
        </Button>
      </CardContent>
      <CardFooter className="text-center text-xs text-muted-foreground">
        <p>Teachers will scan this code to verify their location and mark their attendance for the day.</p>
      </CardFooter>
    </Card>
  );
};

export default QRCodeGenerator;
