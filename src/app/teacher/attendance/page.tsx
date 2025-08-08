
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Loader2, AlertCircle, Save, Wifi, WifiOff, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { format } from "date-fns";

interface TeacherProfile {
  id: string; 
  auth_user_id: string; 
  full_name: string;
}

interface SchoolLocationSettings {
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
}

type AttendanceStatus = "Present" | "Absent" | "On Leave" | "Out of Range";

export default function TeacherAttendancePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<SchoolLocationSettings | null>(null);
  const [todaysRecord, setTodaysRecord] = useState<{ status: AttendanceStatus, notes: string | null } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInAttempts, setCheckInAttempts] = useState(0); // New state for attempts
  const isMounted = useRef(true);
  const { toast } = useToast();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const todayDateString = format(new Date(), "yyyy-MM-dd");
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const loadInitialData = async () => {
        if (!isMounted.current || !supabaseRef.current) return;
        setIsLoading(true);

        const { data: { session } } = await supabaseRef.current.auth.getSession();
        if (!session?.user) {
            if (isMounted.current) setError("Teacher not authenticated. Please log in.");
            setIsLoading(false);
            return;
        }
        if(isMounted.current) setAuthUser(session.user);

        try {
            const { data: profileData, error: profileError } = await supabaseRef.current
                .from('teachers').select('id, auth_user_id, full_name').eq('auth_user_id', session.user.id).single();
            if (profileError) throw profileError;
            if (isMounted.current) setTeacherProfile(profileData || null);

            const { data: settingsData, error: settingsError } = await supabaseRef.current
                .from('app_settings').select('school_latitude, school_longitude, check_in_radius_meters').single();
            if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
            if (isMounted.current) setSchoolLocation({
                latitude: settingsData?.school_latitude || null,
                longitude: settingsData?.school_longitude || null,
                radius: settingsData?.check_in_radius_meters || null
            });

            if (profileData) {
                const { data: record, error: recordError } = await supabaseRef.current
                    .from('staff_attendance').select('status, notes').eq('teacher_id', profileData.id).eq('date', todayDateString).single();
                if (recordError && recordError.code !== 'PGRST116') throw recordError;
                if (isMounted.current) setTodaysRecord(record as any);
            }

        } catch (e: any) {
            if (isMounted.current) setError(`Failed to load data: ${e.message}`);
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    loadInitialData();

    return () => { isMounted.current = false; };
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
        toast({ title: "Geolocation not supported", description: "Your browser does not support location services.", variant: "destructive" });
        return;
    }
    if (!schoolLocation?.latitude || !schoolLocation?.longitude || !schoolLocation?.radius) {
        toast({ title: "Configuration Error", description: "School location is not set by the admin. Cannot check-in.", variant: "destructive" });
        return;
    }
    
    setIsCheckingIn(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(schoolLocation.latitude!, schoolLocation.longitude!, latitude, longitude);
        
        let status: AttendanceStatus = "Present";
        if (distance > schoolLocation.radius!) {
            const newAttemptCount = checkInAttempts + 1;
            setCheckInAttempts(newAttemptCount);
            
            if (newAttemptCount < MAX_ATTEMPTS) {
                toast({ title: "Out of Range", description: `You are ~${Math.round(distance)}m from school. Please move closer and try again. Attempt ${newAttemptCount} of ${MAX_ATTEMPTS}.`, variant: "destructive", duration: 7000 });
                setIsCheckingIn(false);
                return; // Stop here, do not save yet
            } else {
                status = "Out of Range";
                toast({ title: "Final Attempt Failed", description: `You are still out of range after ${MAX_ATTEMPTS} attempts. Your status will be recorded as 'Out of Range'.`, variant: "destructive", duration: 8000 });
            }
        } else {
            toast({ title: "Check-in Successful", description: "You are within the school premises." });
            setCheckInAttempts(0); // Reset on success
            status = "Present";
        }
        
        await saveAttendance(status, `Checked in from approx. ${Math.round(distance)}m away.`);
      },
      (error) => {
        let message = "Could not get your location. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message += "You denied the request for Geolocation.";
            break;
          case error.POSITION_UNAVAILABLE:
            message += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message += "The request to get user location timed out.";
            break;
          default:
            message += "An unknown error occurred.";
            break;
        }
        toast({ title: "Location Error", description: message, variant: "destructive" });
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveAttendance = async (status: AttendanceStatus, notes: string) => {
    if (!authUser || !teacherProfile || !supabaseRef.current) {
        toast({ title: "Error", description: "Authentication or profile data is missing.", variant: "destructive" });
        setIsCheckingIn(false);
        return;
    }
    
    const record = {
        teacher_id: teacherProfile.id,
        date: todayDateString,
        status: status,
        notes: notes,
        marked_by_admin_id: null,
    };
    
    try {
        const { error: upsertError } = await supabaseRef.current
            .from('staff_attendance').upsert(record, { onConflict: 'teacher_id,date' });

        if (upsertError) throw upsertError;

        if (isMounted.current) {
            setTodaysRecord({ status, notes });
        }

    } catch (e: any) {
        toast({ title: "Save Failed", description: `Could not save attendance record: ${e.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (error) {
    return <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>;
  }

  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <UserCheck className="mr-3 h-8 w-8" /> My Attendance
      </h2>
      <p className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md w-fit">Date: {todayDisplay}</p>
      
      <Card className="shadow-lg max-w-lg mx-auto">
        <CardHeader className="text-center">
            <CardTitle>Daily Check-in</CardTitle>
            <CardDescription>Mark your attendance for today by checking in with your location.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            {todaysRecord ? (
                <div className="space-y-2">
                    <p className="text-lg">You have already checked in today.</p>
                    <p className="text-2xl font-bold" style={{ color: todaysRecord.status === 'Present' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                        Status: {todaysRecord.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{todaysRecord.notes}</p>
                </div>
            ) : (
                 <Button onClick={handleCheckIn} disabled={isCheckingIn || !schoolLocation?.latitude} size="lg" className="w-full">
                    {isCheckingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <MapPin className="mr-2 h-5 w-5"/>}
                    {isCheckingIn ? "Getting Location..." : "Check In for Today"}
                </Button>
            )}
            {!schoolLocation?.latitude && <p className="text-xs text-destructive mt-2">Check-in is disabled because the school location has not been set by the administrator.</p>}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center text-center">
            <p>Ensure your browser has location permissions enabled for this site. If you are out of range, you have 5 attempts to get closer before your status is recorded.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

