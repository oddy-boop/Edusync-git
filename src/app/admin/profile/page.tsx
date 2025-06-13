
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
import { UserCircle, Mail, ShieldCheck, Save, Loader2, KeyRound, AlertTriangle, AlertCircle as AlertCircleIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_LOGGED_IN_KEY, ADMIN_PROFILE_DETAILS_KEY } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, type User } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  currentPassword: z.string().optional(),
  newEmail: z.string().email("Invalid email address.").optional().or(z.literal("")),
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal("")),
  confirmNewPassword: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if ((data.newEmail && data.newEmail.length > 0) || (data.newPassword && data.newPassword.length > 0)) {
    if (!data.currentPassword || data.currentPassword.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to change email or password.",
        path: ["currentPassword"],
      });
    }
  }
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "New passwords do not match.",
      path: ["confirmNewPassword"],
    });
  }
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AdminProfileDisplayData {
  fullName: string;
  email: string;
}

export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [adminProfile, setAdminProfile] = useState<AdminProfileDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      currentPassword: "",
      newEmail: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMounted.current) {
        if (user) { // Firebase authenticated user
          const isAdminSessionFlagPresent = localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true";
          if (!isAdminSessionFlagPresent) {
            // Firebase user exists, but app-level session flag is missing.
            // This is an inconsistent state. Log out from Firebase and redirect.
            auth.signOut().then(() => {
              if(isMounted.current) {
                toast({ title: "Session Mismatch", description: "Admin session flag invalid. Please log in again.", variant: "destructive" });
                router.push('/auth/admin/login');
              }
            }).catch(err => {
              console.error("Sign out error during session mismatch:", err);
              if(isMounted.current) {
                toast({ title: "Logout Error", description: "Failed to clear session. Please log in again.", variant: "destructive" });
                router.push('/auth/admin/login');
              }
            });
            setIsLoading(false);
            return;
          }
          
          // Both Firebase user and local flag are good.
          setFirebaseUser(user);
          let currentFullName = user.displayName || "Administrator";
          try {
            const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
            if (storedProfileRaw) {
              const storedProfile = JSON.parse(storedProfileRaw);
              if (storedProfile.fullName) {
                currentFullName = storedProfile.fullName;
              }
            }
          } catch (error) {
            console.warn("Error loading admin full name from localStorage:", error);
          }
          
          setAdminProfile({
            fullName: currentFullName,
            email: user.email || "N/A",
          });
          form.reset({ fullName: currentFullName, newEmail: user.email || "" });
          setIsLoading(false);

        } else { // No Firebase user
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ADMIN_LOGGED_IN_KEY); // Clear local flag if Firebase session is gone
          }
          toast({ title: "Authentication Required", description: "Please log in as admin.", variant: "destructive" });
          router.push('/auth/admin/login');
          setIsLoading(false);
        }
      }
    });
    return () => { 
        isMounted.current = false;
        unsubscribe();
    };
  }, [form, router, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!firebaseUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    let somethingChanged = false;

    try {
      // Update Full Name
      if (data.fullName !== (adminProfile?.fullName || firebaseUser.displayName)) {
        await updateProfile(firebaseUser, { displayName: data.fullName });
        if (typeof window !== 'undefined') {
          localStorage.setItem(ADMIN_PROFILE_DETAILS_KEY, JSON.stringify({ fullName: data.fullName }));
        }
        setAdminProfile(prev => prev ? { ...prev, fullName: data.fullName } : { fullName: data.fullName, email: firebaseUser.email || "" });
        toast({ title: "Success", description: "Display name updated." });
        somethingChanged = true;
      }

      // Change Email or Password (requires re-authentication)
      if ((data.newEmail && data.newEmail !== firebaseUser.email) || data.newPassword) {
        if (!data.currentPassword) {
          form.setError("currentPassword", { type: "manual", message: "Current password is required to change email or password." });
          setIsSaving(false);
          return;
        }
        // Ensure firebaseUser.email is not null before creating credential
        if (!firebaseUser.email) {
            toast({ title: "Error", description: "Current user email is not available for re-authentication.", variant: "destructive" });
            setIsSaving(false);
            return;
        }
        const credential = EmailAuthProvider.credential(firebaseUser.email, data.currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);

        // Update Email
        if (data.newEmail && data.newEmail !== firebaseUser.email) {
          await updateEmail(firebaseUser, data.newEmail);
          setAdminProfile(prev => prev ? { ...prev, email: data.newEmail! } : { fullName: data.fullName, email: data.newEmail!});
          toast({ title: "Success", description: "Admin email updated. You might need to log in again with the new email." });
          somethingChanged = true;
          // Consider forcing a logout here if email (primary identifier) changes
        }

        // Update Password
        if (data.newPassword) {
          await updatePassword(firebaseUser, data.newPassword);
          toast({ title: "Success", description: "Password updated successfully." });
          somethingChanged = true;
        }
        form.reset({ ...form.getValues(), fullName: data.fullName, newEmail: data.newEmail || firebaseUser.email || "", currentPassword: "", newPassword: "", confirmNewPassword: "" }); // Clear password fields, keep name and new email
      }
      
      if (!somethingChanged && !((data.newEmail && data.newEmail !== firebaseUser.email) || data.newPassword)) {
         toast({ title: "No Changes", description: "No changes were submitted."});
      }

    } catch (error: any) {
      console.error("Profile update error:", error);
      let errorMessage = "Failed to update profile.";
      if (error.code === "auth/wrong-password") errorMessage = "Incorrect current password.";
      else if (error.code === "auth/email-already-in-use") errorMessage = "New email address is already in use.";
      else if (error.code === "auth/weak-password") errorMessage = "New password is too weak.";
      else if (error.code === "auth/requires-recent-login") errorMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in.";
      
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><Loader2 className="mr-3 h-7 w-7 animate-spin text-primary" /> Loading Profile...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Fetching your profile details...</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!adminProfile || !firebaseUser) {
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertCircleIcon className="mr-3 h-7 w-7 text-destructive" /> Not Authenticated</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to view or manage the admin profile.</p>
            <Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile Management</h2>
      
      <Card className="shadow-lg max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Edit Your Admin Profile</CardTitle>
              <CardDescription>Update your display name, email, or password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name / Display Name</FormLabel>
                    <FormControl><Input placeholder="Enter your admin display name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              
              <FormItem>
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Current Login Email</FormLabel>
                <Input value={adminProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>

              <Alert variant="default" className="border-accent/50 bg-accent/10">
                <AlertTriangle className="h-5 w-5 text-accent" />
                <AlertTitle className="font-semibold text-accent/90">Change Email or Password</AlertTitle>
                <AlertDescription className="text-accent/80">
                  To change your email or password, you must provide your current password.
                </AlertDescription>
              </Alert>

              <FormField control={form.control} name="newEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />New Email Address (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="Enter new email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Current Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Required to change email/password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />New Password (Optional)</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Confirm New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
              
              <FormItem>
                <FormLabel className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role</FormLabel>
                <Input value="Administrator" readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSaving || form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving || form.formState.isSubmitting ? "Saving Changes..." : "Save Profile Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
