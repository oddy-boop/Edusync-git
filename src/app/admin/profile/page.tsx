
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
import { UserCircle, Mail, ShieldCheck, Save, Loader2, AlertTriangle, AlertCircle as AlertCircleIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_LOGGED_IN_KEY, ADMIN_CREDENTIALS_KEY } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AdminStoredCredentials {
  fullName: string;
  email: string;
  password?: string;
}

export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [adminProfile, setAdminProfile] = useState<AdminStoredCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
    },
  });

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);
    setError(null);

    if (typeof window !== 'undefined') {
      const isAdminLoggedIn = localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true";
      if (!isAdminLoggedIn) {
        if (isMounted.current) {
          toast({ title: "Authentication Required", description: "Please log in as admin.", variant: "destructive" });
          router.push('/auth/admin/login');
          setIsLoading(false);
        }
        return;
      }

      try {
        const storedCredentialsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
        if (storedCredentialsRaw) {
          const storedCredentials: AdminStoredCredentials = JSON.parse(storedCredentialsRaw);
          if (isMounted.current) {
            setAdminProfile(storedCredentials);
            form.reset({ fullName: storedCredentials.fullName });
          }
        } else {
          if (isMounted.current) {
            setError("Admin profile data not found in localStorage. Please re-register or contact support.");
            // Optionally clear login flag if credentials are missing
            localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
            router.push('/auth/admin/login');
          }
        }
      } catch (e: any) {
        if (isMounted.current) {
          setError(`Error loading admin profile from localStorage: ${e.message}`);
          console.error("Error loading admin profile:", e);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }
    
    return () => { 
        isMounted.current = false;
    };
  }, [form, router, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!adminProfile || typeof window === 'undefined') {
      toast({ title: "Error", description: "Profile data not loaded or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    try {
      const updatedCredentials: AdminStoredCredentials = {
        ...adminProfile,
        fullName: data.fullName,
      };
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updatedCredentials));
      
      if (isMounted.current) {
        setAdminProfile(updatedCredentials);
      }
      toast({ title: "Success", description: "Display name updated in localStorage." });

    } catch (error: any) {
      console.error("Profile update error (localStorage):", error);
      toast({ title: "Update Failed", description: `Failed to update profile: ${error.message}`, variant: "destructive" });
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
            <p className="text-muted-foreground">Admin profile data could not be loaded. Please try logging in again or register if this is a new setup.</p>
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
              <CardDescription>Update your display name. Email and password changes are not supported in this version.</CardDescription>
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
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Registered Admin Email</FormLabel>
                <Input value={adminProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
                 <p className="text-xs text-muted-foreground pt-1">
                    This is the email used for registration and cannot be changed here.
                 </p>
              </FormItem>
              
              <FormItem>
                <FormLabel className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role</FormLabel>
                <Input value="Administrator" readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>

              <Alert variant="default" className="border-accent/50 bg-accent/10">
                <AlertTriangle className="h-5 w-5 text-accent" />
                <AlertTitle className="font-semibold text-accent/90">Feature Notice</AlertTitle>
                <AlertDescription className="text-accent/80">
                  Changing admin email or password is not supported in this Firebase-less version. These features require a backend authentication system.
                </AlertDescription>
              </Alert>
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
