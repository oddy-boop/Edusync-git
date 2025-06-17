
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UserCircle, CalendarDays, Users, ShieldAlert, Loader2, AlertCircle, Mail } from "lucide-react";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface StudentProfileDataFromSupabase {
  student_id_display: string;
  full_name: string;
  date_of_birth: string; // Expecting YYYY-MM-DD string
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string | null;
  // Supabase also has created_at, updated_at if needed
}

export default function StudentProfilePage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfileDataFromSupabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const router = useRouter();
  const supabase = getSupabase();

  useEffect(() => {
    isMounted.current = true;

    async function fetchStudentProfileFromSupabase() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      setError(null);

      let studentIdFromStorage: string | null = null;
      studentIdFromStorage = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);

      if (!studentIdFromStorage) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view your profile.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('students')
          .select('student_id_display, full_name, date_of_birth, grade_level, guardian_name, guardian_contact, contact_email')
          .eq('student_id_display', studentIdFromStorage)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw fetchError;
        }

        if (!data) {
          if (isMounted.current) {
            setError("Student profile not found in Supabase records. Please contact administration if this seems incorrect.");
          }
        } else {
          if (isMounted.current) {
            setStudentProfile(data as StudentProfileDataFromSupabase);
          }
        }
      } catch (e: any) {
        console.error("Error fetching student profile from Supabase:", e);
        if (isMounted.current) {
          setError(`Failed to load your profile data: ${e.message}. Please try refreshing or contact support.`);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    fetchStudentProfileFromSupabase();

    return () => {
      isMounted.current = false;
    };
  }, [router, supabase]);

  const ProfileDetailItem = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) => (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground flex items-center">
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {label}
      </Label>
      <p className="text-base font-medium p-2 bg-muted/30 rounded-md min-h-[40px] break-words">
        {value || "N/A"}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Please log in") && (
             <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!studentProfile) {
     return (
      <Card>
        <CardHeader><CardTitle>Profile Not Available</CardTitle></CardHeader>
        <CardContent>
          <p>Your profile details could not be loaded. Please try logging in again or contact support if the issue persists.</p>
         <Button asChild className="mt-4"><Link href="/auth/student/login">Go to Login</Link></Button>
        </CardContent>
      </Card>
     );
  }

  let formattedDateOfBirth = "N/A";
  if (studentProfile.date_of_birth) {
    try {
      // Ensure date is treated as UTC by adding T00:00:00 if not already a full ISO string
      const dateString = studentProfile.date_of_birth.includes('T') ? studentProfile.date_of_birth : studentProfile.date_of_birth + "T00:00:00";
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        formattedDateOfBirth = format(parsedDate, "do MMMM, yyyy");
      } else {
        formattedDateOfBirth = studentProfile.date_of_birth; // Fallback if parsing fails
      }
    } catch (e) {
      console.warn("Could not format date of birth:", studentProfile.date_of_birth, e);
      formattedDateOfBirth = studentProfile.date_of_birth; // Show raw if formatting fails
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserCircle className="mr-3 h-8 w-8 text-primary" />
            My Profile
          </CardTitle>
          <CardDescription>
            Your personal and academic information from Supabase. This information is read-only. For any changes, please contact the school administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <ProfileDetailItem label="Full Name" value={studentProfile.full_name} icon={UserCircle} />
          <ProfileDetailItem label="Student ID" value={studentProfile.student_id_display} icon={ShieldAlert} />
          <ProfileDetailItem label="Grade Level" value={studentProfile.grade_level} icon={Users} />
          <ProfileDetailItem label="Date of Birth" value={formattedDateOfBirth} icon={CalendarDays} />
          <ProfileDetailItem label="Guardian's Name" value={studentProfile.guardian_name} />
          <ProfileDetailItem label="Guardian's Contact" value={studentProfile.guardian_contact} />
          <ProfileDetailItem label="Contact Email" value={studentProfile.contact_email} icon={Mail} />
        </CardContent>
      </Card>
    </div>
  );
}
