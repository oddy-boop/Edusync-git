
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, AlertCircle, CameraOff, Loader2 } from 'lucide-react';
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Haversine formula to calculate distance
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
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const supabase = getSupabase();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerId = "qr-code-reader";

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: teacher } = await supabase.from('teachers').select('id').eq('auth_user_id', user.id).single();
        if (teacher) {
          setTeacherId(teacher.id);
        } else {
            setStatus("❌ Teacher profile not found.");
            toast({ title: "Error", description: "Your teacher profile is not linked to your account.", variant: "destructive" });
        }
      }
    }
    fetchUser();
  }, [supabase, toast]);

  useEffect(() => {
    if (!isScanning || html5QrCodeRef.current) return;

    html5QrCodeRef.current = new Html5Qrcode(readerId, {
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    });

    const startScanner = async () => {
        try {
            await html5QrCodeRef.current?.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.floor(minEdge * 0.7);
                    return { width: qrboxSize, height: qrboxSize };
                }
              },
              (decodedText: string) => {
                if (isScanning) {
                    html5QrCodeRef.current?.pause(true);
                    setIsScanning(false);
                    setIsProcessing(true);
                    handleScan(decodedText);
                }
              },
              (errorMessage) => {
                // Ignore 'QR code not found' errors
              }
            );
        } catch (err) {
            console.error("Failed to start QR scanner", err);
            setStatus("❌ Camera Error. Please grant permission and refresh.");
            toast({ title: "Camera Error", description: "Could not start the camera. Check permissions.", variant: "destructive" });
        }
    };

    startScanner();

    return () => {
      html5QrCodeRef.current?.stop().catch(err => {
        console.error("Failed to stop QR scanner.", err);
      }).finally(() => {
        html5QrCodeRef.current = null;
      });
    };
  }, [isScanning]);


  const handleScan = async (data: string | null) => {
    if (!data) {
      setIsProcessing(false);
      setIsScanning(true); // Allow scanning again
      return;
    }
    if (!teacherId || !currentUser) {
        setStatus("❌ Teacher profile not loaded.");
        toast({ title: "Error", description: "Cannot record attendance without a teacher profile.", variant: "destructive" });
        setIsProcessing(false);
        return;
    }

    try {
      const parsedData = JSON.parse(data);

      if (parsedData.type !== "school_attendance_checkin") {
        throw new Error("Invalid QR code type.");
      }

      // Fetch school's location settings
      const { data: schoolSettings, error: settingsError } = await supabase.from('app_settings')
        .select('school_latitude, school_longitude, check_in_radius_meters')
        .single();
      
      if (settingsError || !schoolSettings?.school_latitude || !schoolSettings?.school_longitude) {
          throw new Error("School location is not configured by the administrator.");
      }
      
      const { school_latitude, school_longitude, check_in_radius_meters } = schoolSettings;
      const checkInRadius = check_in_radius_meters || 100; // Default to 100m
      const schoolLocation: [number, number] = [school_latitude, school_longitude];
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const teacherLocation: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          const distance = calculateDistance(schoolLocation, teacherLocation);
          const inRange = distance <= checkInRadius;
          const attendanceStatus = inRange ? "Present" : "Out of Range";
          
          setStatus(inRange ? `✅ In range (${distance.toFixed(0)}m). Check-in successful.` : `❌ Out of range (${distance.toFixed(0)}m).`);

          const { error: dbError } = await supabase.from('staff_attendance').upsert(
            {
              teacher_id: teacherId,
              date: format(new Date(), 'yyyy-MM-dd'),
              status: attendanceStatus,
              notes: inRange ? 'Checked in via QR code' : `QR scan was out of range by ${distance.toFixed(0)}m.`,
            },
            { onConflict: 'teacher_id,date' }
          );

          if (dbError) {
              setStatus(`❌ Database error: ${dbError.message}`);
              toast({ title: "Database Error", description: `Could not save attendance: ${dbError.message}`, variant: "destructive" });
          } else {
              toast({
                title: inRange ? "Success!" : "Location Mismatch",
                description: `Your attendance has been marked as ${attendanceStatus}.`,
                variant: inRange ? "default" : "destructive"
              });
          }
          setIsProcessing(false);
        },
        (err) => {
          setStatus("❌ Location access denied.");
          toast({ title: "Location Error", description: "Could not get your location. Please enable location services for this site.", variant: "destructive" });
          setIsProcessing(false);
        },
        { enableHighAccuracy: true }
      );
    } catch (e: any) {
      setStatus("❌ Invalid QR code.");
      toast({ title: "Scan Error", description: "The scanned QR code is not valid for attendance.", variant: "destructive" });
      setIsProcessing(false);
      setIsScanning(true); // Allow scanning again after invalid code
    }
  };

  const resetScanner = () => {
    setStatus('');
    setIsProcessing(false);
    setIsScanning(true);
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
        <div id={readerId} className="w-full max-w-xs mx-auto rounded-lg overflow-hidden border"></div>
        
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
        
        {!isScanning && !isProcessing && (
          <div className="mt-4 text-center">
            <Button onClick={resetScanner}>Scan Again</Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center">
          For a successful check-in, ensure you are at the correct location and have granted location permissions.
        </p>
      </CardFooter>
    </Card>
  );
};

export default QRCodeScanner;
