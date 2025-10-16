
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle, AlertCircle, CameraOff, Loader2, Upload, UserX, RefreshCw, WifiOff } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
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

type ScanStatus = 'scanning' | 'processing' | 'success' | 'out_of_range' | 'error' | 'offline';
type AttendanceStatus = 'Present' | 'Absent' | 'On Leave' | 'Out of Range';

const OFFLINE_ATTENDANCE_QUEUE_KEY = 'offline_attendance_queue';

interface QueuedAttendanceRecord {
  school_id: number;
  teacher_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  marked_by_admin_id: string | null;
  timestamp: number;
}


const QRCodeScanner: React.FC = () => {
  const [scanState, setScanState] = useState<ScanStatus>("scanning");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const { toast } = useToast();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const html5QrCodeRef = React.useRef<Html5Qrcode | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const readerId = "qr-code-reader";
  const [isOnline, setIsOnline] = useState(true);

  // Function to sync queued attendance records
  const syncOfflineQueue = useCallback(async () => {
    const queuedItemsRaw = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    if (!queuedItemsRaw) return;

    const queuedItems: QueuedAttendanceRecord[] = JSON.parse(queuedItemsRaw);
    if (queuedItems.length === 0) return;

    toast({ title: "Syncing Offline Data", description: `Found ${queuedItems.length} attendance record(s) to sync.` });

    const { error } = await supabase.from('staff_attendance').upsert(queuedItems, { onConflict: 'school_id,teacher_id,date' });

    if (error) {
      toast({ title: "Sync Failed", description: "Could not sync offline records. They are still saved locally.", variant: "destructive" });
    } else {
      toast({ title: "Sync Complete!", description: "Offline attendance records have been successfully saved." });
      localStorage.removeItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
    }
  }, [supabase, toast]);

  useEffect(() => {
    // Check network status on mount
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "You are back online!", description: "Attempting to sync any pending offline data." });
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue, toast]);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
  const { data: teacher } = await supabase.rpc('get_my_teacher_profile');
        if (teacher) {
          setTeacherId(teacher.id);
          setSchoolId(teacher.school_id);
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
    if (scanState !== 'scanning' || (html5QrCodeRef.current && html5QrCodeRef.current.isScanning)) return;

    html5QrCodeRef.current = new Html5Qrcode(readerId, {
      verbose: false,
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    } as any);

    const startScanner = async () => {
        try {
            await html5QrCodeRef.current?.start(
              { facingMode: "environment" },
              {
                fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Compute ~70% of the smaller edge, but ensure the html5-qrcode
          // minimum dimension requirement (50px) is met to avoid runtime errors.
          const computed = Math.floor(minEdge * 0.7);
          const qrboxSize = Math.max(50, computed);
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
    if (!teacherId || !currentUser || !schoolId) {
        setStatusMessage("❌ Teacher profile not loaded.");
        setScanState('error');
        toast({ title: "Error", description: "Cannot record attendance without a teacher profile.", variant: "destructive" });
        return;
    }

    try {
      const parsedData = JSON.parse(data);

      if (parsedData.type !== "school_attendance_checkin" || parsedData.school_id !== schoolId) {
        throw new Error("Invalid or mismatched QR code.");
      }
      
      const checkInRadius = parsedData.radius || 100;

      const { data: schoolSettings, error: settingsError } = await supabase.from('schools')
        .select('school_latitude, school_longitude')
        .eq('id', schoolId)
        .single();
      
      if (settingsError || !schoolSettings?.school_latitude || !schoolSettings?.school_longitude) {
          throw new Error("School location is not configured by the administrator.");
      }
      
      const { school_latitude, school_longitude } = schoolSettings;
      const schoolLocation: [number, number] = [school_latitude, school_longitude];
      
      // Helper: promisified geolocation getCurrentPosition
      const getPosition = (options: PositionOptions) => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      };

      // Try high-accuracy first with a reasonable timeout, then fall back to a faster, low-accuracy attempt.
      try {
        // First attempt: high accuracy, 10s timeout
        const pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        const teacherLocation: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const distance = calculateDistance(schoolLocation, teacherLocation);
        const inRange = distance <= checkInRadius;

        if (inRange) {
          await recordAttendance('Present', 'Checked in via QR code (In Range)');
        } else {
          setScanState('out_of_range');
          setStatusMessage('❌ Out of Range');
          toast({ title: 'Location Mismatch', description: `You are too far from the school. Your location has been recorded.`, variant: 'destructive' });
        }
      } catch (firstErr: any) {
        // If first attempt times out or is unavailable, try a faster low-accuracy attempt before failing.
        if (firstErr && (firstErr.code === 3 || firstErr.code === 2)) {
          setStatusMessage('⚠️ Could not get a precise location; trying a faster fallback...');
          try {
            const pos2 = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
            const teacherLocation: [number, number] = [pos2.coords.latitude, pos2.coords.longitude];
            const distance = calculateDistance(schoolLocation, teacherLocation);
            const inRange = distance <= checkInRadius;
            if (inRange) {
              await recordAttendance('Present', 'Checked in via QR code (Fallback Location)');
            } else {
              setScanState('out_of_range');
              setStatusMessage('❌ Out of Range');
              toast({ title: 'Location Mismatch', description: `You are too far from the school. Your location has been recorded.`, variant: 'destructive' });
            }
            return;
          } catch (secondErr: any) {
            // fall through to final failure handling below
            console.warn('Fallback geolocation attempt failed', secondErr);
          }
        }

        // Final failure: don't show the harsh internal error string — show a helpful instruction instead and allow retry.
        let userMessage = 'Could not determine your location. Ensure location services are enabled and try again.';
        if (firstErr && firstErr.code === 1) {
          userMessage = 'Location permission denied. Please enable location access for this site and try again.';
        }
        setStatusMessage('⚠️ Location Unavailable');
        setScanState('error');
        // Use a non-destructive toast for this final failure so it doesn't alarm users unduly.
        toast({ title: 'Location Unavailable', description: userMessage, variant: 'default' });
      }
    } catch (e: any) {
      setStatusMessage("❌ Invalid QR code.");
      setScanState('error');
      toast({ title: "Scan Error", description: "The scanned QR code is not valid for attendance.", variant: "destructive" });
    }
  };

  const recordAttendance = async (status: AttendanceStatus, notes: string) => {
    if (!teacherId || !schoolId) return;
    setScanState('processing');

    const record: QueuedAttendanceRecord = {
        school_id: schoolId,
        teacher_id: teacherId,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: status,
        notes: notes,
        marked_by_admin_id: status === 'Absent' ? currentUser?.id ?? null : null,
        timestamp: Date.now(),
    };

    if (!isOnline) {
        const queuedItemsRaw = localStorage.getItem(OFFLINE_ATTENDANCE_QUEUE_KEY);
        const queue: QueuedAttendanceRecord[] = queuedItemsRaw ? JSON.parse(queuedItemsRaw) : [];
        // Prevent duplicate entries for the same day
        const existingIndex = queue.findIndex(item => item.date === record.date && item.teacher_id === record.teacher_id);
        if (existingIndex > -1) {
            queue[existingIndex] = record;
        } else {
            queue.push(record);
        }
        localStorage.setItem(OFFLINE_ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
        setStatusMessage(`✅ Attendance marked as ${status}. (Saved Offline)`);
        setScanState('success');
        toast({ title: "Saved Offline", description: "Your attendance has been saved and will sync when you're back online." });
        return;
    }

    const { error: dbError } = await supabase.from('staff_attendance').upsert(record, { onConflict: 'school_id,teacher_id,date' });
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
        {!isOnline && (
            <div className="p-2 bg-yellow-100 text-yellow-800 text-xs rounded-md flex items-center justify-center gap-2 mt-2">
                <WifiOff className="h-4 w-4"/>
                You are offline. Attendance will be saved locally and synced later.
            </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div id={readerId} className="w-full max-w-xs mx-auto rounded-lg overflow-hidden border"></div>
        
        {renderStatusContent()}

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            {scanState === 'scanning' && (
                 <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1" disabled={scanState !== 'scanning'}>
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
            title="Upload QR Code Image"
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
