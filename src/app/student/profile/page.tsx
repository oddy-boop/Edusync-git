
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // For consistent styling, though read-only
import { UserCircle, CalendarDays, Users, ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StudentProfileData {
  studentId: string;
  fullName: string;
  dateOfBirth: string; // Expecting YYYY-MM-DD string from Firestore
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
  contactEmail?: string;
  // Add other fields if they exist in your Firestore student document
}

export default function StudentProfilePage() {
  const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const router = useRouter();

  useEffect(() => {
    isMounted.current = true;

    async function fetchStudentProfile() {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      let studentId: string | null = null;
      if (typeof window !== "undefined") {
        studentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      }

      if (!studentId) {
        if (isMounted.current) {
          setError("Student not identified. Please log in to view your profile.");
          setIsLoading(false);
        }
        // Optionally redirect to login:
        // router.push("/auth/student/login");
        return;
      }

      try {
        const studentDocRef = doc(db, "students", studentId);
        const studentDocSnap = await getDoc(studentDocRef);

        if (!studentDocSnap.exists()) {
          if (isMounted.current) {
            setError("Student profile not found. Please contact administration if this seems incorrect.");
            setIsLoading(false);
          }
          return;
        }
        
        const profileData = { studentId: studentDocSnap.id, ...studentDocSnap.data() } as StudentProfileData;
        if (isMounted.current) {
          setStudentProfile(profileData);
        }
      } catch (e: any) {
        console.error("Error fetching student profile:", e);
        if (isMounted.current) {
          setError(`Failed to load your profile data: ${e.message}. Please try refreshing or contact support.`);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }

    fetchStudentProfile();

    return () => {
      isMounted.current = false;
    };
  }, [router]);

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
  if (studentProfile.dateOfBirth) {
    try {
      // Assuming dateOfBirth is "YYYY-MM-DD"
      const [year, month, day] = studentProfile.dateOfBirth.split('-').map(Number);
      if (year && month && day) {
        formattedDateOfBirth = format(new Date(year, month - 1, day), "do MMMM, yyyy");
      }
    } catch (e) {
      console.warn("Could not format date of birth:", studentProfile.dateOfBirth, e);
      formattedDateOfBirth = studentProfile.dateOfBirth; // Show raw if formatting fails
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
            Your personal and academic information. This information is read-only. For any changes, please contact the school administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <ProfileDetailItem label="Full Name" value={studentProfile.fullName} icon={UserCircle} />
          <ProfileDetailItem label="Student ID" value={studentProfile.studentId} icon={ShieldAlert} />
          <ProfileDetailItem label="Grade Level" value={studentProfile.gradeLevel} icon={Users} />
          <ProfileDetailItem label="Date of Birth" value={formattedDateOfBirth} icon={CalendarDays} />
          <ProfileDetailItem label="Guardian's Name" value={studentProfile.guardianName} />
          <ProfileDetailItem label="Guardian's Contact" value={studentProfile.guardianContact} />
          <ProfileDetailItem label="Contact Email" value={studentProfile.contactEmail} />
        </CardContent>
      </Card>
    </div>
  );
}
