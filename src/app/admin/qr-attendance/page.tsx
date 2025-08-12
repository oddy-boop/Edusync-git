
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth-context';

const QRCodeGenerator: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const supabase = getSupabase();
  const { schoolId } = useAuth();

  const generateQRCode = useCallback(async () => {
    if (!schoolId) {
        setError("Could not determine your school to generate a QR code. Please refresh.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('schools')
        .select('check_in_radius_meters')
        .eq('id', schoolId)
        .single();
      
      if (settingsError) throw new Error(`Could not fetch settings: ${settingsError.message}`);

      const dataToEncode = JSON.stringify({
        type: "school_attendance_checkin",
        school_id: schoolId,
        radius: settings?.check_in_radius_meters || 100, // Embed radius, default to 100
      });

      const url = await QRCode.toDataURL(dataToEncode, { errorCorrectionLevel: 'H', width: 500 });
      setQrCode(url);

    } catch (err: any) {
      console.error("QR Code generation error:", err);
      setError(`Failed to generate QR code: ${err.message}`);
      toast({ title: "Error", description: `Could not generate the QR code: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast, schoolId]);

  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

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
            Display this QR code for teachers to scan for check-in. If you change the check-in radius in settings, regenerate a new code.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
        {error && (
          <div className="text-destructive text-center p-4 border border-destructive/20 bg-destructive/5 rounded-md">
            <AlertCircle className="mx-auto h-8 w-8 mb-2"/>
            <p>{error}</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin mb-2" />
            <p>Generating secure QR code...</p>
          </div>
        ) : qrCode && (
          <img src={qrCode} alt="Attendance QR Code" width={300} height={300} className="border-4 border-primary p-2 rounded-lg"/>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button onClick={handleDownload} disabled={!qrCode || isLoading} className="flex-1">
                <Download className="mr-2 h-4 w-4"/>
                Download QR Code
            </Button>
            <Button onClick={generateQRCode} disabled={isLoading} variant="outline" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4"/>
                Regenerate
            </Button>
        </div>
      </CardContent>
      <CardFooter className="text-center text-xs text-muted-foreground">
        <p>Teachers will scan this code to verify their location and mark their attendance for the day.</p>
      </CardFooter>
    </Card>
  );
};

export default QRCodeGenerator;
