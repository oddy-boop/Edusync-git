
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
import { UserCircle, Mail, ShieldCheck, Save, Loader2, AlertTriangle, AlertCircle as AlertCircleIcon, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // Firebase
import { onAuthStateChanged, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, type User } from "firebase/auth";
import { ADMIN_LOGGED_IN_KEY, ADMIN_CREDENTIALS_KEY } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  currentPassword: z.string().optional(),
  newEmail: z.string().email("Invalid email address.").optional().or(z.literal("")),
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal("")),
  confirmNewPassword: z.string().optional().or(z.literal("")),
})
.refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
})
.refine(data => !(data.newEmail || data.newPassword) || !!data.currentPassword, {
  message: "Current password is required to change email or password.",
  path: ["currentPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AdminProfileDisplayData {
  fullName: string;
  email: string;
}
interface AdminStoredFallbackCredentials {
  fullName: string;
  email: string;
}


export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [adminProfile, setAdminProfile] = useState<AdminProfileDisplayData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (user) {
        if (isMounted.current) {
          setFirebaseUser(user);
          const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) : null;
          
          if (localAdminFlag !== "true") {
            // Inconsistent state: Firebase user exists, but local flag not set.
            // This might happen if localStorage was cleared manually.
            // For safety, sign out Firebase user and redirect.
            auth.signOut().then(() => {
              if (isMounted.current) {
                setError("Session inconsistency. Please log in again.");
                router.push('/auth/admin/login');
              }
            });
            return;
          }

          // Fetch fullName from localStorage as a fallback or primary source if displayName isn't used.
          let storedFullName = user.displayName || "";
          if (typeof window !== 'undefined') {
            const storedCredsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
            if (storedCredsRaw) {
                try {
                    const storedCreds: AdminStoredFallbackCredentials = JSON.parse(storedCredsRaw);
                    if(storedCreds.email === user.email) { // ensure it's for the same user
                        storedFullName = storedCreds.fullName || user.displayName || "";
                    }
                } catch (e) { console.warn("Could not parse stored admin credentials for full name"); }
            }
          }

          setAdminProfile({
            fullName: storedFullName,
            email: user.email || "",
          });
          form.reset({ 
            fullName: storedFullName,
            currentPassword: "", newEmail: "", newPassword: "", confirmNewPassword: "" 
          });
          setError(null);
        }
      } else {
        if (isMounted.current) {
          setError("Admin not authenticated. Please log in.");
          // Clear local flag if Firebase user is null
          if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
          router.push('/auth/admin/login');
        }
      }
      if (isMounted.current) setIsLoading(false);
    });
    
    return () => { 
        isMounted.current = false;
        unsubscribe();
    };
  }, [form, router, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!firebaseUser || typeof window === 'undefined') {
      toast({ title: "Error", description: "User not authenticated or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setError(null);
    let changesMade = false;

    try {
      // Update Full Name (Display Name in Firebase)
      if (data.fullName && data.fullName !== (adminProfile?.fullName || firebaseUser.displayName)) {
        await updateProfile(firebaseUser, { displayName: data.fullName });
        if (isMounted.current) {
          setAdminProfile(prev => prev ? { ...prev, fullName: data.fullName } : { fullName: data.fullName, email: firebaseUser.email || "" });
          // Update local storage fallback for fullName
          const storedCredsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
          let currentCreds: AdminStoredFallbackCredentials = { fullName: data.fullName, email: firebaseUser.email || "" };
          if (storedCredsRaw) {
            try { currentCreds = JSON.parse(storedCredsRaw); } catch(e){}
          }
          currentCreds.fullName = data.fullName;
          localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(currentCreds));
        }
        toast({ title: "Success", description: "Display name updated." });
        changesMade = true;
      }

      // Handle Email or Password Change
      if (data.newEmail || data.newPassword) {
        if (!data.currentPassword) {
          form.setError("currentPassword", { type: "manual", message: "Current password is required to change email or password." });
          setIsSaving(false);
          return;
        }

        const credential = EmailAuthProvider.credential(firebaseUser.email!, data.currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        
        // Change Email
        if (data.newEmail && data.newEmail !== firebaseUser.email) {
          await updateEmail(firebaseUser, data.newEmail);
          if (isMounted.current) {
            setAdminProfile(prev => prev ? { ...prev, email: data.newEmail! } : { fullName: data.fullName, email: data.newEmail! });
             // Update email in localStorage fallback
            const storedCredsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
            let currentCreds: AdminStoredFallbackCredentials = { fullName: data.fullName, email: data.newEmail };
            if (storedCredsRaw) {
                try { currentCreds = JSON.parse(storedCredsRaw); } catch(e){}
            }
            currentCreds.email = data.newEmail;
            localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(currentCreds));
          }
          toast({ title: "Success", description: "Email address updated. You might need to log in again with the new email." });
          changesMade = true;
        }

        // Change Password
        if (data.newPassword) {
          await updatePassword(firebaseUser, data.newPassword);
          toast({ title: "Success", description: "Password updated successfully." });
          changesMade = true;
        }
         form.reset({ 
            fullName: data.fullName, // Keep updated full name
            currentPassword: "", 
            newEmail: "", 
            newPassword: "", 
            confirmNewPassword: "" 
          });
      }
      if (!changesMade && !data.newEmail && !data.newPassword) {
        toast({ title: "No Changes", description: "No changes were submitted." });
      }

    } catch (error: any) {
      console.error("Profile update error (Firebase):", error);
      let userMessage = "Failed to update profile.";
      if (error.code === "auth/wrong-password") {
        userMessage = "Incorrect current password. Please try again.";
        form.setError("currentPassword", { type: "manual", message: userMessage });
      } else if (error.code === "auth/email-already-in-use") {
        userMessage = "The new email address is already in use by another account.";
        form.setError("newEmail", { type: "manual", message: userMessage });
      } else if (error.code === "auth/requires-recent-login") {
        userMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in to update your email or password.";
      }
      setError(userMessage); // Set general error for display
      toast({ title: "Update Failed", description: userMessage, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
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

  if (error && !adminProfile) {
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertCircleIcon className="mr-3 h-7 w-7 text-destructive" /> Error Loading Profile</CardTitle></CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!adminProfile && !isLoading) {
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
         <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertCircleIcon className="mr-3 h-7 w-7 text-destructive" /> Profile Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Admin profile data could not be loaded. This might occur if local data is out of sync. Please try logging in again.</p>
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
              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Update Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name / Display Name</FormLabel>
                    <FormControl><Input placeholder="Enter your admin display name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              
              <FormItem>
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Current Admin Email</FormLabel>
                <Input value={adminProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
              
              <FormField control={form.control} name="newEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />New Email (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="Enter new email address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <hr />
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
               <hr />
              <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Current Password (Required to change email/password)</FormLabel>
                    <FormControl><Input type="password" placeholder="Enter current password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              
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
