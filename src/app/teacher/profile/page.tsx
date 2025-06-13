
"use client";

import { useState, useEffect, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Mail, Save, Phone, BookOpen, Users as UsersIcon, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { REGISTERED_TEACHERS_KEY, TEACHER_LOGGED_IN_UID_KEY } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TeacherProfileData {
  uid: string;
  fullName: string;
  email: string;
  contactNumber: string;
  subjectsTaught: string;
  assignedClasses: string[];
  role?: string;
  createdAt?: string;
}

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function TeacherProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", contactNumber: "" },
  });

  useEffect(() => {
    isMounted.current = true;
    if (typeof window !== 'undefined') {
      const uidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (uidFromStorage) {
        setTeacherUid(uidFromStorage);
        try {
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          const allTeachers: TeacherProfileData[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          const profileDataFromStorage = allTeachers.find(t => t.uid === uidFromStorage);

          if (profileDataFromStorage) {
            if (isMounted.current) {
              setTeacherProfile(profileDataFromStorage);
              profileForm.reset({
                fullName: profileDataFromStorage.fullName,
                contactNumber: profileDataFromStorage.contactNumber || "",
              });
            }
          } else {
            if (isMounted.current) setError("Teacher profile details not found in local records. Please contact an administrator if this persists.");
          }
        } catch (e: any) {
          console.error("Error fetching teacher profile from localStorage:", e);
          if (isMounted.current) setError(`Failed to load profile data: ${e.message}`);
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated. Redirecting to login...");
          router.push('/auth/teacher/login');
        }
      }
    }
    if (isMounted.current) setIsLoading(false);
    
    return () => { isMounted.current = false; };
  }, [profileForm, router]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!teacherUid || typeof window === 'undefined') {
      toast({ title: "Error", description: "User not authenticated or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      let allTeachers: TeacherProfileData[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const teacherIndex = allTeachers.findIndex(t => t.uid === teacherUid);

      if (teacherIndex > -1) {
        allTeachers[teacherIndex] = {
          ...allTeachers[teacherIndex],
          fullName: data.fullName,
          contactNumber: data.contactNumber,
        };
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(allTeachers));
        if (isMounted.current) {
            setTeacherProfile(prev => prev ? {...prev, ...allTeachers[teacherIndex]} : allTeachers[teacherIndex]);
        }
        toast({ title: "Success", description: "Profile updated successfully in localStorage." });
      } else {
        toast({ title: "Error", description: "Could not find your profile in local records to update.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ title: "Update Failed", description: `Failed to update profile: ${error.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (error && !teacherProfile) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  const displayProfile = teacherProfile || {
    uid: teacherUid || "N/A",
    fullName: "N/A",
    email: "N/A",
    contactNumber: "",
    subjectsTaught: "Not specified",
    assignedClasses: [],
    role: "teacher"
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Teacher Profile</h2>
      
      {error && teacherProfile && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Loading Issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg lg:col-span-2">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <CardHeader>
                <CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Personal Information</CardTitle>
                <CardDescription>Update your name and contact number. Email is tied to your initial local registration. Profile details stored in localStorage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name</FormLabel>
                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Login Email</FormLabel>
                  <Input value={displayProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
                   <p className="text-xs text-muted-foreground pt-1">
                       Your email address is used for identification and cannot be changed here.
                   </p>
                </FormItem>
                <FormField control={profileForm.control} name="contactNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" />Contact Number</FormLabel>
                    <FormControl><Input placeholder="Enter your contact number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSavingProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingProfile ? "Saving Profile..." : "Save Profile Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><ShieldCheck className="mr-3 h-7 w-7 text-primary" /> Role & Assignments</CardTitle>
                <CardDescription>Your current role and teaching assignments (read-only from local data).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><UserCircle className="mr-2 h-4 w-4"/>Role</Label>
                    <p className="text-base font-medium p-2 bg-muted/30 rounded-md">{displayProfile.role || "Teacher"}</p>
                </div>
                <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><BookOpen className="mr-2 h-4 w-4"/>Subjects Taught</Label>
                    <p className="text-sm p-2 bg-muted/30 rounded-md whitespace-pre-wrap min-h-[40px]">{displayProfile.subjectsTaught || "Not specified"}</p>
                </div>
                 <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4"/>Assigned Classes</Label>
                    {displayProfile.assignedClasses && displayProfile.assignedClasses.length > 0 ? (
                        <ul className="list-disc list-inside pl-2 text-sm p-2 bg-muted/30 rounded-md">
                        {displayProfile.assignedClasses.map(cls => <li key={cls}>{cls}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm p-2 bg-muted/30 rounded-md">No classes currently assigned.</p>
                    )}
                </div>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Your subjects and assigned classes are managed by the school administrator.
                </p>
            </CardFooter>
        </Card>
      </div>

       <Card className="shadow-md border-blue-500/30 bg-blue-500/5 mt-8">
        <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                <ShieldCheck className="mr-2 h-5 w-5"/> Account Security
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-blue-600 dark:text-blue-300">
                Teacher login is currently managed via email identification with local records. 
                Password management is not available in this version. For any account access issues, please contact the school administration.
            </p>
        </CardContent>
      </Card>
    </div>
  );

    