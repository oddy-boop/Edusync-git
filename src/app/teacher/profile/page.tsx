
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
import { TEACHER_LOGGED_IN_UID_KEY } from '@/lib/constants'; // Using the new key
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfileData {
  id: string; // PK of 'teachers' table
  auth_user_id: string; // FK to auth.users.id
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
  role?: string; // This might not be directly on teachers table, can be inferred or set
  created_at?: string; // From Supabase table
}

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\\+?[0-9\\s()\\-]+$/, "Invalid phone number format."),
  // Email and password changes are handled by Supabase Auth directly, not here.
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function TeacherProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null);
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
    supabaseRef.current = getSupabase();

    const fetchProfile = async () => {
      if (!supabaseRef.current || typeof window === 'undefined') return;
      
      const authUid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (authUid) {
        setTeacherAuthUid(authUid);
        try {
          const { data: profileData, error: profileError } = await supabaseRef.current
            .from('teachers')
            .select('id, auth_user_id, full_name, email, contact_number, subjects_taught, assigned_classes')
            .eq('auth_user_id', authUid) // Query using auth_user_id
            .single();

          if (profileError) throw profileError;

          if (isMounted.current) {
            if (profileData) {
              setTeacherProfile(profileData as TeacherProfileData);
              profileForm.reset({
                fullName: profileData.full_name,
                contactNumber: profileData.contact_number || "",
              });
            } else {
              setError("Teacher profile details not found in Supabase. Please contact an administrator.");
            }
          }
        } catch (e: any) {
          console.error("Error fetching teacher profile from Supabase:", e);
          if (isMounted.current) setError(`Failed to load profile data: ${e.message}`);
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated. Redirecting to login...");
          router.push('/auth/teacher/login');
        }
      }
      if (isMounted.current) setIsLoading(false);
    };
    
    fetchProfile();
    
    return () => { isMounted.current = false; };
  }, [profileForm, router]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!teacherAuthUid || !teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "User not authenticated or profile data missing.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      // Update full_name in Supabase Auth user_metadata
      const { data: authUpdateData, error: authUpdateError } = await supabaseRef.current.auth.updateUser({
        data: { full_name: data.fullName }
      });
      if (authUpdateError) throw authUpdateError;

      // Update full_name and contact_number in 'teachers' table
      const { data: profileUpdateData, error: profileUpdateError } = await supabaseRef.current
        .from('teachers')
        .update({ 
            full_name: data.fullName, 
            contact_number: data.contactNumber,
            updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', teacherAuthUid) // Use auth_user_id for update
        .select()
        .single();
      
      if (profileUpdateError) throw profileUpdateError;

      if (isMounted.current && profileUpdateData) {
        setTeacherProfile(profileUpdateData as TeacherProfileData);
        toast({ title: "Success", description: "Profile updated successfully in Supabase." });
      } else if (isMounted.current) {
        toast({ title: "Notice", description: "Display name updated in Auth, profile details might require refresh." });
      }

    } catch (error: any) {
      console.error("Profile update error (Supabase):", error);
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
    id: "N/A",
    auth_user_id: teacherAuthUid || "N/A",
    full_name: "N/A",
    email: "N/A",
    contact_number: "",
    subjects_taught: "Not specified",
    assigned_classes: [],
    role: "Teacher"
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
                <CardDescription>Update your display name and contact number. Email & Password are managed by Supabase Auth.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name (Display Name)</FormLabel>
                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Login Email</FormLabel>
                  <Input value={displayProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
                   <p className="text-xs text-muted-foreground pt-1">
                       Your email address is tied to your Supabase Auth account. To change it, use Supabase's email change process if available, or contact an admin.
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
                <CardDescription>Your current role and teaching assignments (from Supabase).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><UserCircle className="mr-2 h-4 w-4"/>Role</Label>
                    <p className="text-base font-medium p-2 bg-muted/30 rounded-md">{displayProfile.role || "Teacher"}</p>
                </div>
                <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><BookOpen className="mr-2 h-4 w-4"/>Subjects Taught</Label>
                    <p className="text-sm p-2 bg-muted/30 rounded-md whitespace-pre-wrap min-h-[40px]">{displayProfile.subjects_taught || "Not specified"}</p>
                </div>
                 <div>
                    <Label className="flex items-center text-sm text-muted-foreground"><UsersIcon className="mr-2 h-4 w-4"/>Assigned Classes</Label>
                    {displayProfile.assigned_classes && displayProfile.assigned_classes.length > 0 ? (
                        <ul className="list-disc list-inside pl-2 text-sm p-2 bg-muted/30 rounded-md">
                        {displayProfile.assigned_classes.map(cls => <li key={cls}>{cls}</li>)}
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
                Your account is managed by Supabase Authentication. You can change your password through Supabase's standard password reset flow if initiated by an admin or if self-service password reset is enabled for your Supabase project.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
