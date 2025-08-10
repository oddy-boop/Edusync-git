
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, AlertCircle, CameraOff, Loader2, Upload, UserX, RefreshCw } from 'lucide-react';
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

type ScanStatus = 'scanning' | 'processing' | 'success' | 'out_of_range' | 'error';

const QRCodeScanner: React.FC = () => {
  const [scanState, setScanState] = useState<ScanStatus>("scanning");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const { toast } = useToast();
  const supabase = getSupabase();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            setStatusMessage("❌ Teacher profile not found.");
            setScanState('error');
            toast({ title: "Error", description: "Your teacher profile is not linked to your account.", variant: "destructive" });
        }
      }
    }
    fetchUser();
  }, [supabase, toast]);

  useEffect(() => {
    if (scanState !== 'scanning' || html5QrCodeRef.current?.isScanning) return;

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
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current?.pause(true);
                    setScanState('processing');
                    handleScan(decodedText);
                }
              },
              (errorMessage) => {
                // Ignore 'QR code not found' errors
              }
            );
        } catch (err) {
            console.error("Failed to start QR scanner", err);
            setStatusMessage("❌ Camera Error. Please grant permission and refresh.");
            setScanState('error');
            toast({ title: "Camera Error", description: "Could not start the camera. Check permissions.", variant: "destructive" });
        }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => {
          console.warn("QR scanner stop error, likely due to fast refresh:", err);
        }).finally(() => {
            html5QrCodeRef.current = null;
        });
      }
    };
  }, [scanState]); // Re-run effect when we want to start scanning again


  const handleScan = async (data: string | null) => {
    if (!data) {
      setScanState('scanning');
      return;
    }
    if (!teacherId || !currentUser) {
        setStatusMessage("❌ Teacher profile not loaded.");
        setScanState('error');
        toast({ title: "Error", description: "Cannot record attendance without a teacher profile.", variant: "destructive" });
        return;
    }

    try {
      const parsedData = JSON.parse(data);

      if (parsedData.type !== "school_attendance_checkin") {
        throw new Error("Invalid QR code type.");
      }
      
      const checkInRadius = parsedData.radius || 100;

      const { data: schoolSettings, error: settingsError } = await supabase.from('app_settings')
        .select('school_latitude, school_longitude')
        .single();
      
      if (settingsError || !schoolSettings?.school_latitude || !schoolSettings?.school_longitude) {
          throw new Error("School location is not configured by the administrator.");
      }
      
      const { school_latitude, school_longitude } = schoolSettings;
      const schoolLocation: [number, number] = [school_latitude, school_longitude];
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const teacherLocation: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          const distance = calculateDistance(schoolLocation, teacherLocation);
          const inRange = distance <= checkInRadius;
          
          if (inRange) {
              await recordAttendance('Present', 'Checked in via QR code (In Range)');
              setStatusMessage(`✅ In Range. Check-in successful.`);
              setScanState('success');
              toast({ title: "Success!", description: "Your attendance has been marked as Present.", variant: "default" });
          } else {
              setScanState('out_of_range');
              setStatusMessage("❌ Out of Range");
              toast({ title: "Location Mismatch", description: `You are too far from the school. Your location has been recorded.`, variant: "destructive" });
              // Let the UI show options for 'out_of_range' state
          }
        },
        (err) => {
            let userMessage = "Could not verify your location. Please enable location access for this site.";
            if (err.code === err.PERMISSION_DENIED) {
              userMessage = "Location permission denied. You must allow location access in your browser settings to mark attendance.";
            } else if (err.code === err.TIMEOUT) {
              userMessage = "Could not get your location in time. Please try again in an area with a better GPS signal.";
            }
            setStatusMessage(`❌ Location Error`);
            setScanState('error');
            toast({ title: "Location Error", description: userMessage, variant: "destructive" });
        },
        { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
      );
    } catch (e: any) {
      setStatusMessage("❌ Invalid QR code.");
      setScanState('error');
      toast({ title: "Scan Error", description: "The scanned QR code is not valid for attendance.", variant: "destructive" });
    }
  };

  const recordAttendance = async (status: 'Present' | 'Absent' | 'Out of Range', notes: string) => {
    if (!teacherId) return;
    setScanState('processing');
    const { error: dbError } = await supabase.from('staff_attendance').upsert(
        {
          teacher_id: teacherId,
          date: format(new Date(), 'yyyy-MM-dd'),
          status: status,
          notes: notes,
          marked_by_admin_id: status === 'Absent' ? currentUser?.id : null
        },
        { onConflict: 'teacher_id,date' }
    );
     if (dbError) {
        setStatusMessage(`❌ Database error: ${dbError.message}`);
        setScanState('error');
        toast({ title: "Database Error", description: `Could not save attendance: ${dbError.message}`, variant: "destructive" });
    } else {
        setStatusMessage(`✅ Attendance marked as ${status}.`);
        setScanState('success');
    }
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanState('processing');

    const qrScanner = new Html5Qrcode(readerId, false);
    qrScanner.scanFile(file, true)
      .then((decodedText: string) => {
          handleScan(decodedText);
      })
      .catch(err => {
        setStatusMessage("❌ QR code not found in image.");
        setScanState('error');
        toast({ title: "Scan Error", description: "Could not find a valid QR code in the uploaded image.", variant: "destructive" });
      });
  };

  const resetScanner = () => {
    setStatusMessage('');
    setScanState('scanning');
  };

  const renderStatusContent = () => {
    switch (scanState) {
        case 'processing':
            return (
                <div className="mt-4 text-center text-lg font-semibold flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin"/> Processing...
                </div>
            );
        case 'success':
        case 'error':
             return (
                <div className="mt-4 text-center text-lg font-semibold flex items-center justify-center gap-2">
                    {statusMessage.includes('✅') ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
                    {statusMessage}
                </div>
            );
        case 'out_of_range':
            return (
                <div className="mt-4 text-center space-y-3">
                    <div className="text-lg font-semibold flex items-center justify-center gap-2 text-destructive">
                        <AlertCircle /> {statusMessage}
                    </div>
                    <p className="text-sm text-muted-foreground">You are not within the allowed check-in radius.</p>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <Card className="shadow-lg max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center">
          <QrCode className="mr-2 h-6 w-6" /> Scan Attendance QR Code
        </CardTitle>
        <CardDescription>Point your camera at the QR code or upload an image to mark your attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div id={readerId} className="w-full max-w-xs mx-auto rounded-lg overflow-hidden border"></div>
        
        {renderStatusContent()}

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            {scanState === 'scanning' && (
                 <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1" disabled={scanState === 'processing'}>
                    <Upload className="mr-2 h-4 w-4" /> Upload QR Code
                 </Button>
            )}
             {scanState === 'out_of_range' && (
                <>
                    <Button onClick={resetScanner} className="flex-1"><RefreshCw className="mr-2 h-4 w-4"/>Scan Again</Button>
                    <Button onClick={() => recordAttendance('Absent', 'Self-reported as absent after out-of-range scan')} variant="destructive" className="flex-1"><UserX className="mr-2 h-4 w-4"/>Mark as Absent</Button>
                </>
            )}
             {(scanState === 'success' || scanState === 'error') && (
                <Button onClick={resetScanner} className="flex-1 w-full"><RefreshCw className="mr-2 h-4 w-4"/>Start New Scan</Button>
            )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
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
