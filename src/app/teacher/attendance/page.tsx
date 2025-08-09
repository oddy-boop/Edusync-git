
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, AlertCircle, CameraOff } from 'lucide-react';
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Helper to check if the QR code is still valid
function isQRCodeFresh(timestamp: number, validitySeconds: number): boolean {
  return Date.now() < timestamp + validitySeconds * 1000;
}

// Haversine formula to calculate distance between two points
const calculateDistance = (
    [lat1, lon1]: [number, number],
    [lat2, lon2]: [number, number]
): number => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg: number) => deg * Math.PI / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const QRCodeScanner: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [scanResult, setScanResult] = useState<string>("");
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const supabase = getSupabase();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: teacher } = await supabase.from('teachers').select('id').eq('auth_user_id', user.id).single();
        if (teacher) {
          setTeacherId(teacher.id);
        }
      }
    }
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    if (!isScanning) return;

    const qrCodeScanner = new Html5QrcodeScanner(
      "qr-code-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedFormats: [Html5QrcodeSupportedFormats.QR_CODE]
      },
      false // verbose
    );

    scannerRef.current = qrCodeScanner;

    const onScanSuccess = (decodedText: string) => {
      qrCodeScanner.pause(true);
      setIsScanning(false);
      setIsProcessing(true);
      handleScan(decodedText);
    };

    const onScanFailure = (error: any) => {
      // This is called frequently, so we don't log it to avoid console spam.
    };

    qrCodeScanner.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
            console.error("Failed to clear html5-qrcode-scanner.", err);
        });
      }
    };
  }, [isScanning]);


  const handleScan = async (data: string | null) => {
    if (!data) {
      setIsProcessing(false);
      return;
    }

    if (!teacherId || !currentUser) {
        toast({ title: "Error", description: "Teacher profile not loaded. Cannot record attendance.", variant: "destructive" });
        setIsProcessing(false);
        return;
    }

    try {
      const { location: qrLocation, timestamp, validity } = JSON.parse(data);

      if (!isQRCodeFresh(timestamp, validity)) {
        setStatus("❌ Expired QR code");
        toast({ title: "Expired Code", description: "This QR code has expired. Please scan a new one.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { data: schoolSettings } = await supabase.from('app_settings').select('check_in_radius_meters').single();
          const checkInRadius = schoolSettings?.check_in_radius_meters || 100; // Default to 100m
          
          const distance = calculateDistance([qrLocation.lat, qrLocation.lng], [pos.coords.latitude, pos.coords.longitude]);
          const inRange = distance <= checkInRadius;
          const attendanceStatus = inRange ? "Present" : "Out of Range";
          
          setScanResult(`Scanned at: ${new Date(timestamp).toLocaleTimeString()}`);
          setStatus(inRange ? "✅ Check-in successful" : `❌ Out of range (${distance.toFixed(0)}m)`);

          const { error: dbError } = await supabase.from('staff_attendance').upsert(
            {
              teacher_id: teacherId,
              date: format(new Date(), 'yyyy-MM-dd'),
              status: attendanceStatus,
              notes: inRange ? 'Checked in via QR code' : `QR scan was out of range by ${distance.toFixed(0)}m.`,
              marked_by_admin_id: null,
            },
            { onConflict: 'teacher_id,date' }
          );

          if (dbError) {
              setStatus("❌ Database error");
              toast({ title: "Database Error", description: `Could not save attendance: ${dbError.message}`, variant: "destructive" });
          } else {
              toast({
                title: inRange ? "Success!" : "Location Mismatch",
                description: inRange ? "Your attendance has been marked." : "You were outside the allowed range.",
                variant: inRange ? "default" : "destructive"
              });
          }
          setIsProcessing(false);
        },
        (err) => {
          setStatus("❌ Location access denied.");
          toast({ title: "Location Error", description: "Could not get your location. Please enable location services for this site.", variant: "destructive" });
          setIsProcessing(false);
        }
      );
    } catch (e) {
      setStatus("❌ Invalid QR code");
      toast({ title: "Scan Error", description: "The scanned QR code is not valid for attendance.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-lg max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center">
          <QrCode className="mr-2 h-6 w-6" /> Scan Attendance QR Code
        </CardTitle>
        <CardDescription>Point your camera at the QR code displayed by the administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <div id="qr-code-reader" className="w-full max-w-xs mx-auto rounded-lg overflow-hidden border"></div>
        
        {isProcessing && (
          <div className="mt-4 text-center text-lg font-semibold flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin"/> Processing...
          </div>
        )}
        
        {status && !isProcessing && (
          <div className="mt-4 text-center text-lg font-semibold flex items-center justify-center gap-2">
            {status.includes('✅') ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
            {status}
          </div>
        )}
        
        {scanResult && <p className="text-center text-sm text-muted-foreground mt-2">{scanResult}</p>}
        
        {!isScanning && !isProcessing && (
          <div className="mt-4 text-center">
            <Button onClick={() => { setIsScanning(true); setStatus(''); setScanResult(''); }}>Scan Again</Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center">
          For a successful check-in, ensure you are at the correct location and the QR code is not expired.
        </p>
      </CardFooter>
    </Card>
  );
};

export default QRCodeScanner;
