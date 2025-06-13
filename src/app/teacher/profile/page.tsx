
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
import { Label } from "@/components/ui/label"; // Added Label import
import { UserCircle, Mail, KeyRound, Save, Phone, BookOpen, Users as UsersIcon, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile as updateAuthProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { REGISTERED_TEACHERS_KEY } from '@/lib/constants';
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

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function TeacherProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", contactNumber: "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;
      if (user) {
        setCurrentUser(user);
        try {
          if (typeof window !== 'undefined') {
            const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
            const allTeachers: TeacherProfileData[] = teachersRaw ? JSON.parse(teachersRaw) : [];
            const profileDataFromStorage = allTeachers.find(t => t.uid === user.uid);

            if (profileDataFromStorage) {
              const fullProfile: TeacherProfileData = {
                ...profileDataFromStorage,
                fullName: user.displayName || profileDataFromStorage.fullName || "", 
                email: user.email || profileDataFromStorage.email || "", 
              };
              setTeacherProfile(fullProfile);
              profileForm.reset({
                fullName: fullProfile.fullName,
                contactNumber: fullProfile.contactNumber || "",
              });
            } else {
              setError("Teacher profile details not found in local records. Some information might be unavailable. Please contact an administrator if this persists.");
              // Create a minimal profile if not found in localStorage but user is authenticated
              setTeacherProfile({
                uid: user.uid,
                fullName: user.displayName || "N/A",
                email: user.email || "N/A",
                contactNumber: "",
                subjectsTaught: "Not specified (admin setup needed)",
                assignedClasses: [],
                role: "teacher"
              });
               profileForm.reset({
                fullName: user.displayName || "",
                contactNumber: "",
              });
            }
          } else {
            setError("localStorage not available to load profile details.");
          }
        } catch (e: any) {
          console.error("Error fetching teacher profile from localStorage:", e);
          setError(`Failed to load profile data: ${e.message}`);
        }
      } else {
        setCurrentUser(null);
        setTeacherProfile(null);
        setError("Not authenticated. Redirecting to login...");
        router.push('/auth/teacher/login');
      }
      setIsLoading(false);
    });
    return () => { isMounted.current = false; unsubscribe(); };
  }, [profileForm, router]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!currentUser || typeof window === 'undefined') {
      toast({ title: "Error", description: "User not authenticated or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      // Update Firebase Auth display name if it differs
      if (currentUser.displayName !== data.fullName) {
        await updateAuthProfile(currentUser, { displayName: data.fullName });
      }

      // Update localStorage
      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      let allTeachers: TeacherProfileData[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const teacherIndex = allTeachers.findIndex(t => t.uid === currentUser.uid);

      if (teacherIndex > -1) {
        // Update existing profile
        allTeachers[teacherIndex] = {
          ...allTeachers[teacherIndex], // Keep existing fields like email, subjects, classes, role, createdAt
          fullName: data.fullName, // Update from form
          contactNumber: data.contactNumber, // Update from form
        };
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(allTeachers));
        // Update local component state to reflect changes
        setTeacherProfile(prev => prev ? {...prev, ...allTeachers[teacherIndex]} : allTeachers[teacherIndex]);
        toast({ title: "Success", description: "Profile updated successfully in localStorage." });
      } else {
        // If profile didn't exist in localStorage (e.g., first-time setup after auth creation or data loss)
        // Create a new profile entry.
        const newTeacherProfile: TeacherProfileData = {
            uid: currentUser.uid,
            fullName: data.fullName,
            email: currentUser.email || "", // Get email from auth
            contactNumber: data.contactNumber,
            subjectsTaught: teacherProfile?.subjectsTaught || "Not specified", // Preserve if already set, else default
            assignedClasses: teacherProfile?.assignedClasses || [], // Preserve if already set, else default
            role: "teacher", // Default role
            createdAt: new Date().toISOString() // Set creation timestamp
        };
        allTeachers.push(newTeacherProfile);
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(allTeachers));
        setTeacherProfile(newTeacherProfile); // Update local component state
        toast({ title: "Profile Created & Updated", description: "New local profile record created and updated." });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ title: "Update Failed", description: `Failed to update profile: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!currentUser || !currentUser.email) {
      toast({ title: "Error", description: "Not authenticated or email missing.", variant: "destructive" });
      return;
    }
    setIsSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, data.newPassword);
      toast({ title: "Success", description: "Password updated successfully." });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update error:", error);
      let description = "Failed to update password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Incorrect current password.";
        passwordForm.setError("currentPassword", { message: "Incorrect current password." });
      } else if (error.code === 'auth/weak-password') {
        description = "The new password is too weak.";
        passwordForm.setError("newPassword", { message: "Password is too weak." });
      }
      toast({ title: "Password Update Failed", description: description, variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
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

  if (error && !teacherProfile) { // Only show critical error if profile completely failed to load
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
  
  // Fallback if teacherProfile is still null after loading and no critical error
  const displayProfile = teacherProfile || {
    uid: currentUser?.uid || "N/A",
    fullName: currentUser?.displayName || "N/A",
    email: currentUser?.email || "N/A",
    contactNumber: "",
    subjectsTaught: "Not specified",
    assignedClasses: [],
    role: "teacher"
  };


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Teacher Profile</h2>
      
      {error && teacherProfile && ( // Display non-critical error if profile is still somewhat loaded
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
                <CardDescription>Update your name and contact number. Email is tied to your login. Profile details stored in localStorage.</CardDescription>
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
        </Card>
      </div>

      <Card className="shadow-lg">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center"><KeyRound className="mr-3 h-7 w-7 text-primary" /> Change Password</CardTitle>
              <CardDescription>Update your login password. Requires your current password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter your current password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter new password (min. 6 characters)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSavingPassword}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
