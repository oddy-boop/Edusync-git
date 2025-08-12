
'use client';

import { useActionState, useRef, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UserPlus, Info, CheckCircle, AlertTriangle, ShieldCheck, School, AlertCircle } from "lucide-react";
import { createFirstAdminAction } from "@/lib/actions/admin.actions";
import { getSupabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const initialState = {
  success: false,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Create Super Admin Account
    </Button>
  );
}

// A simplified, self-contained layout to avoid fetching school data
function SetupLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="py-4 px-6 border-b">
            <div className="flex items-center gap-3 font-headline font-bold text-primary text-2xl">
                <School />
                <span>EduSync Setup</span>
            </div>
        </header>
        <main className="flex-grow flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-headline font-semibold text-primary">{title}</h1>
              <p className="text-muted-foreground mt-1">{description}</p>
            </div>
            {children}
          </div>
        </main>
         <footer className="py-6 px-6 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} EduSync. All Rights Reserved.
        </footer>
      </div>
    );
}

export default function SuperAdminSetupPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createFirstAdminAction, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    // This check runs on the client to see if setup is even needed.
    const checkExistingAdmin = async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'super_admin');
        if (data && data.length > 0) {
            setAdminExists(true);
        }
        setIsLoading(false);
    };
    checkExistingAdmin();
  }, []);

  if (isLoading) {
      return (
          <SetupLayout title="Setup" description="Checking application status...">
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            </div>
          </SetupLayout>
      );
  }
  
  if (adminExists) {
      return (
          <SetupLayout title="Setup Complete" description="A super admin account already exists.">
              <Card>
                  <CardContent className="pt-6">
                    <Alert variant="destructive">
                        <ShieldCheck className="h-5 w-5"/>
                        <AlertTitle>Setup Already Performed</AlertTitle>
                        <AlertDescription>
                            This setup page is for one-time use only. For security, please delete this file from your project at: <br/>
                            <code className="font-mono text-xs bg-red-100 p-1 rounded">src/app/auth/setup/super-admin/page.tsx</code>
                        </AlertDescription>
                    </Alert>
                    <Button asChild className="w-full mt-4"><Link href="/portals">Go to Portals</Link></Button>
                  </CardContent>
              </Card>
          </SetupLayout>
      );
  }

  if (state.success) {
    return (
        <SetupLayout title="Setup Successful!" description="Your Super Admin account has been created.">
            <Card>
                <CardContent className="pt-6">
                    <Alert variant="default" className="border-green-500 bg-green-50">
                        <CheckCircle className="h-5 w-5 text-green-600"/>
                        <AlertTitle className="text-green-700">Account Created</AlertTitle>
                        <AlertDescription className="text-green-600">
                           {state.message}
                        </AlertDescription>
                    </Alert>
                     <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-5 w-5"/>
                        <AlertTitle>IMPORTANT: Next Step</AlertTitle>
                        <AlertDescription>
                           For security, you should now delete this setup file from your project to prevent anyone else from creating another super admin account. Delete the file at: <br/>
                           <code className="font-mono text-xs bg-red-100 p-1 rounded">src/app/auth/setup/super-admin/page.tsx</code>
                        </AlertDescription>
                    </Alert>
                    <Button asChild className="w-full mt-4"><Link href="/auth/admin/login">Proceed to Admin Login</Link></Button>
                </CardContent>
            </Card>
        </SetupLayout>
    );
  }


  return (
    <SetupLayout title="Super Admin Setup" description="Create the first administrator account for the platform.">
        <Card>
            <CardHeader>
                <Alert>
                    <Info className="h-4 w-4"/>
                    <AlertDescription>This is a one-time setup. Once completed, this page will be disabled.</AlertDescription>
                </Alert>
            </CardHeader>
            <form ref={formRef} action={formAction}>
                <CardContent className="space-y-4">
                    {state.message && !state.success && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertTitle>Setup Failed</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" name="fullName" placeholder="e.g., Jane Doe" required/>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" placeholder="super.admin@example.com" required/>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" placeholder="Choose a strong password" required/>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton/>
                </CardFooter>
            </form>
        </Card>
    </SetupLayout>
  );
}
