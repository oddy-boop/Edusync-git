
"use client";

import { useState, useEffect } from 'react';
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
import { UserCircle, Mail, ShieldCheck, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_ADMIN_EMAIL, ADMIN_LOGGED_IN_KEY, ADMIN_PROFILE_DETAILS_KEY } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Simplified schema for local admin profile (only full name)
const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AdminProfileData {
  fullName: string;
  email: string; // Will be fixed to DEFAULT_ADMIN_EMAIL
}

export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<AdminProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      const isAdminLoggedIn = localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true";
      if (!isAdminLoggedIn) {
        toast({ title: "Access Denied", description: "Please log in as admin.", variant: "destructive" });
        router.push('/auth/admin/login');
        return;
      }

      try {
        const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
        let currentFullName = "Administrator"; // Default name
        if (storedProfileRaw) {
          const storedProfile = JSON.parse(storedProfileRaw);
          if (storedProfile.fullName) {
            currentFullName = storedProfile.fullName;
          }
        }
        if (isMounted) {
            setAdminProfile({
                fullName: currentFullName,
                email: DEFAULT_ADMIN_EMAIL,
            });
            form.reset({ fullName: currentFullName });
        }
      } catch (error) {
        console.error("Error loading admin profile from localStorage:", error);
        if (isMounted) {
            setAdminProfile({
                fullName: "Administrator",
                email: DEFAULT_ADMIN_EMAIL,
            });
            form.reset({ fullName: "Administrator" });
        }
        toast({title: "Warning", description: "Could not load saved profile name, using default.", variant: "default"});
      }
    }
    if (isMounted) setIsLoading(false);
    return () => { isMounted = false; };
  }, [form, router, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        const profileToSave = { fullName: data.fullName };
        localStorage.setItem(ADMIN_PROFILE_DETAILS_KEY, JSON.stringify(profileToSave));
        setAdminProfile(prev => prev ? {...prev, fullName: data.fullName } : { fullName: data.fullName, email: DEFAULT_ADMIN_EMAIL});
        toast({ title: "Success", description: "Admin display name updated in localStorage." });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ title: "Update Failed", description: "Failed to update profile name.", variant: "destructive" });
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

  if (!adminProfile) { // Should be caught by isLoading or redirect
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Not Authenticated</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please log in to view the admin profile.</p>
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
              <CardTitle className="flex items-center">
                <UserCircle className="mr-3 h-7 w-7 text-primary" /> 
                Edit Your Admin Profile
              </CardTitle>
              <CardDescription>
                Update your administrator display name. Email and password changes are not available in this version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Full Name / Display Name</FormLabel>
                    <FormControl><Input placeholder="Enter your admin display name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Login Email Address</FormLabel>
                <Input value={adminProfile.email} readOnly className="bg-muted/50 cursor-not-allowed" />
                 <p className="text-xs text-muted-foreground pt-1">
                    Admin login email is fixed to <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code> and cannot be changed here.
                </p>
              </FormItem>
              
              <FormItem>
                <FormLabel className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role</FormLabel>
                <Input value="Administrator" readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
              <Button type="submit" disabled={isSaving || form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving || form.formState.isSubmitting ? "Saving..." : "Save Display Name"}
              </Button>
               <p className="text-sm text-muted-foreground pt-2 border-t mt-4 w-full">
                Your current admin email is <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>.
                <br />
                <strong>Note:</strong> Password management is not available. Admin login uses a simplified check.
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
