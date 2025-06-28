
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
import { UserCircle, Mail, Save, Phone, BookOpen, Users as UsersIcon, Loader2, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TEACHER_LOGGED_IN_UID_KEY } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TeacherProfileData {
  id: string; 
  auth_user_id: string; 
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
  role?: string; 
  created_at?: string;
}

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  contactNumber: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const startsWithPlusRegex = /^\+\d{11,14}$/; 
        const startsWithZeroRegex = /^0\d{9}$/;     
        return startsWithPlusRegex.test(val) || startsWithZeroRegex.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX (12-15 digits total) or 0XXXXXXXXX (10 digits total)."
      }
    ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function TeacherProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUser, setTeacherAuthUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", contactNumber: "" },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const fetchProfile = async () => {
      if (!supabaseRef.current || typeof window === 'undefined') return;
      
      const { data: { user: authUser } } = await supabaseRef.current.auth.getUser();
      const authUidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);

      if (authUser && authUser.id === authUidFromStorage) {
        if(isMounted.current) setTeacherAuthUser(authUser);
        try {
          const { data: profileData, error: profileError } = await supabaseRef.current
            .from('teachers')
            .select('id, auth_user_id, full_name, email, contact_number, subjects_taught, assigned_classes')
            .eq('auth_user_id', authUser.id)
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
          setError("Not authenticated or session mismatch. Redirecting to login...");
          localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY); // Clear invalid stored UID
          router.push('/auth/teacher/login');
        }
      }
      if (isMounted.current) setIsLoading(false);
    };
    
    fetchProfile();
    
    return () => { isMounted.current = false; };
  }, [profileForm, router]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!teacherAuthUser || !teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "User not authenticated or profile data missing.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const { data: authUpdateData, error: authUpdateError } = await supabaseRef.current.auth.updateUser({
        data: { full_name: data.fullName }
      });
      if (authUpdateError) throw authUpdateError;

      const { data: profileUpdateData, error: profileUpdateError } = await supabaseRef.current
        .from('teachers')
        .update({ 
            full_name: data.fullName, 
            contact_number: data.contactNumber,
            updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', teacherAuthUser.id)
        .select()
        .single();
      
      if (profileUpdateError) throw profileUpdateError;

      if (isMounted.current) {
        if (profileUpdateData) {
          setTeacherProfile(profileUpdateData as TeacherProfileData);
          setTeacherAuthUser(prev => prev ? {...prev, user_metadata: {...prev.user_metadata, full_name: data.fullName}} : null);
        }
        toast({ title: "Success", description: "Profile updated successfully in Supabase." });
      }

    } catch (error: any) {
      console.error("Profile update error (Supabase):", error);
      let userMessage = `Failed to update profile: ${error.message}`;
       if (error.message && error.message.toLowerCase().includes("for security purposes, you can only request this after")) {
        userMessage = "You are attempting to make changes too quickly. Please wait a moment and try again.";
      }
      toast({ title: "Update Failed", description: userMessage, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSavingProfile(false);
    }
  };

  const onPasswordChangeSubmit = async (data: PasswordChangeFormData) => {
    if (!teacherAuthUser || !supabaseRef.current) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error: passwordUpdateError } = await supabaseRef.current.auth.updateUser({
        password: data.newPassword,
      });

      if (passwordUpdateError) throw passwordUpdateError;

      toast({ title: "Success", description: "Password updated successfully." });
      passwordForm.reset();

    } catch (error: any) {
      console.error("Password change error (Supabase):", error);
      let errorMessage = "Failed to update password.";
      if (error.message && error.message.toLowerCase().includes("new password should be different")) {
        errorMessage = "New password must be different from the old password.";
      } else if (error.message && error.message.toLowerCase().includes("weak password")) {
        errorMessage = "Password is too weak. Please choose a stronger one.";
      } else if (error.message && error.message.toLowerCase().includes("for security purposes, you can only request this after")) {
        errorMessage = "You are attempting to change your password too quickly. Please wait a moment and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Password Change Failed", description: errorMessage, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsChangingPassword(false);
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
    auth_user_id: teacherAuthUser?.id || "N/A",
    full_name: teacherAuthUser?.user_metadata?.full_name || "N/A",
    email: teacherAuthUser?.email || "N/A",
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

      <Tabs defaultValue="personalInfo" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-6">
          <TabsTrigger value="personalInfo">Edit Profile</TabsTrigger>
          <TabsTrigger value="changePassword">Change Password</TabsTrigger>
        </TabsList>

        <TabsContent value="personalInfo">
          <Card className="shadow-lg max-w-2xl mx-auto">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardHeader>
                  <CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Personal Information</CardTitle>
                  <CardDescription>Update your display name and contact number. Email is managed by Supabase Auth.</CardDescription>
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
                         Your email address is tied to your Supabase Auth account and cannot be changed here.
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
        </TabsContent>

        <TabsContent value="changePassword">
          <Card className="shadow-lg max-w-md mx-auto">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordChangeSubmit)}>
                <CardHeader>
                  <CardTitle className="flex items-center"><KeyRound className="mr-3 h-7 w-7 text-primary" /> Change Password</CardTitle>
                  <CardDescription>Update your account password. Ensure it is strong and memorable.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />New Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Confirm New Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isChangingPassword}>
                    <Save className="mr-2 h-4 w-4" />
                    {isChangingPassword ? "Updating Password..." : "Update Password"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="shadow-lg max-w-2xl mx-auto mt-8">
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
  );
}
