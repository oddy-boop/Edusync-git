
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
import { getSupabase } from "@/lib/supabaseClient"; 
import type { User, AuthError } from "@supabase/supabase-js";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  newEmail: z.string().email("Invalid email address.").trim().optional().or(z.literal("")),
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal("")),
  confirmNewPassword: z.string().optional().or(z.literal("")),
})
.refine(data => !data.newPassword || data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AdminProfileDisplayData {
  fullName: string;
  email: string;
}

export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      newEmail: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    isMounted.current = true;
    const fetchUserSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError && isMounted.current) {
        setError("Could not retrieve session. Please log in again.");
        setIsLoading(false);
        router.push('/auth/admin/login');
        return;
      }
      
      if (session?.user) {
        if (isMounted.current) {
          setSupabaseUser(session.user);
          form.reset({ 
            fullName: session.user.user_metadata?.full_name || "",
            newEmail: "", newPassword: "", confirmNewPassword: "" 
          });
          setError(null);
        }
      } else {
        if (isMounted.current) {
          setError("Admin not authenticated. Please log in.");
          router.push('/auth/admin/login');
        }
      }
      if (isMounted.current) setIsLoading(false);
    };
    
    fetchUserSession();
    
    return () => { 
        isMounted.current = false;
    };
  }, [form, router, supabase.auth, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!supabaseUser || typeof window === 'undefined') {
      toast({ title: "Error", description: "User not authenticated or client unavailable.", variant: "destructive" });
      return;
    }
    
    const { dismiss } = toast({ title: "Saving Profile...", description: "Please wait." });
    setIsSaving(true);
    setError(null);
    let changesMade = false;
    let emailChanged = false;

    try {
      // Update Full Name (in user_metadata)
      if (data.fullName && data.fullName !== (supabaseUser.user_metadata?.full_name || "")) {
        const { error: updateError } = await supabase.auth.updateUser({ 
          data: { full_name: data.fullName } 
        });
        if (updateError) throw updateError;
        if (isMounted.current) {
           setSupabaseUser(prev => prev ? {...prev, user_metadata: {...prev.user_metadata, full_name: data.fullName}} : null);
        }
        changesMade = true;
      }
      
      // Update Email
      if (data.newEmail && data.newEmail !== supabaseUser.email) {
        const { error: emailUpdateError } = await supabase.auth.updateUser({ email: data.newEmail });
        if (emailUpdateError) throw emailUpdateError;
        emailChanged = true;
      }

      // Update Password
      if (data.newPassword) {
        if (data.newPassword !== data.confirmNewPassword) {
          form.setError("confirmNewPassword", { type: "manual", message: "New passwords don't match." });
          dismiss();
          setIsSaving(false);
          return;
        }
        const { error: passwordUpdateError } = await supabase.auth.updateUser({ password: data.newPassword });
        if (passwordUpdateError) throw passwordUpdateError;
        changesMade = true;
      }
      
      dismiss();
      if (!changesMade && !emailChanged) {
        toast({ title: "No Changes", description: "No changes were submitted." });
      } else {
         form.reset({ 
            fullName: data.fullName, 
            newEmail: "", 
            newPassword: "", 
            confirmNewPassword: "" 
          });

        let successMessage = "Profile changes saved successfully.";
        if (emailChanged) {
            successMessage = "To complete the email change, please click the confirmation link sent to BOTH your old and new email addresses.";
        }
        
        toast({ title: "Success", description: successMessage, duration: 10000 });
        
        if(emailChanged && isMounted.current) {
            setSupabaseUser(prev => prev ? {...prev, email: data.newEmail} : null);
        }
      }

    } catch (error: any) {
      dismiss();
      console.error("Profile update error:", error);
      let userMessage = "Failed to update profile.";
      if (error.message) {
        if (error.message.toLowerCase().includes("user with this email address has already been registered")) {
          userMessage = "This email is already registered to another account. Please use a different email.";
        } else if (error.message.toLowerCase().includes("for security purposes, you can only request this after")) {
          userMessage = "You are attempting to make changes too quickly. Please wait a moment and try again.";
        } else if (error.message.toLowerCase().includes("invalid email")) {
            userMessage = "The new email address provided is invalid. Please check for typos or extra spaces.";
        } else if (error.message.toLowerCase().includes("new password should be different")) {
            userMessage = "New password must be different from the old password.";
        } else if (error.message.toLowerCase().includes("weak password")) {
            userMessage = "Password is too weak. Please choose a stronger one (at least 6 characters).";
        } else {
          userMessage = error.message;
        }
      }
      
      setError(userMessage);
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

  if (error && !supabaseUser) {
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
  
  if (!supabaseUser) { 
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
         <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertCircleIcon className="mr-3 h-7 w-7 text-destructive" /> Profile Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Admin profile data could not be loaded. Please try logging in again.</p>
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
                <Input value={supabaseUser.email || ""} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
              
              <FormField control={form.control} name="newEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />New Email (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="Enter new email address" {...field} /></FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Changing email may require email verification.</p>
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

    