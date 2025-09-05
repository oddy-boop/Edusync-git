
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/lib/auth-context';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AdminProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { role: userRoleFromContext, user, session } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
    },
  });
  
  const portalTitle = userRoleFromContext === 'accountant' ? 'Accountant Profile' : 'Admin Profile';
  const roleDisplay = userRoleFromContext === 'accountant' ? 'Accountant' : (userRoleFromContext === 'super_admin' ? 'Super Administrator' : 'Administrator');


  useEffect(() => {
    if (user) {
      form.reset({ 
        fullName: user.user_metadata?.full_name || "",
      });
      setIsLoading(false);
    } else if (!user && !session) {
        setError("User not authenticated. Please log in.");
        setIsLoading(false);
        router.push('/auth/admin/login');
    }
  }, [user, session, form, router]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated or client unavailable.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
        const { error: updateError } = await supabase.auth.updateUser({
            data: { full_name: data.fullName }
        });
        if(updateError) throw updateError;
  toast({ title: "Success", description: "Profile updated successfully. Your session metadata will update on next navigation or manual refresh." });
    } catch (e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">{portalTitle}</h2>
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><Loader2 className="mr-3 h-7 w-7 animate-spin text-primary" /> Loading Profile...</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Fetching your profile details...</p></CardContent>
        </Card>
      </div>
    );
  }

  if (error && !user) {
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">{portalTitle}</h2>
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
  
  if (!user) { 
     return (
      <div className="space-y-6">
        <h2 className="text-3xl font-headline font-semibold text-primary">{portalTitle}</h2>
         <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><AlertCircleIcon className="mr-3 h-7 w-7 text-destructive" /> Profile Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Profile data could not be loaded. Please try logging in again.</p>
            <Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">{portalTitle} Management</h2>
      
      <Card className="shadow-lg max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Edit Your Profile</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
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
                    <FormControl><Input placeholder="Enter your display name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              
              <FormItem>
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Current Login Email</FormLabel>
                <Input value={user.email || ""} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
              
              <FormItem>
                <FormLabel className="flex items-center"><ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" /> Role</FormLabel>
                <Input value={roleDisplay} readOnly className="bg-muted/50 cursor-not-allowed" />
              </FormItem>
              <p className="text-xs text-muted-foreground">To change your email or password, please use the "Forgot Password" link on the login page.</p>

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
