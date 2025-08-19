
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  const [loginError, setLoginError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  if (!schoolId) {
      return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive">Branch Not Selected</CardTitle></CardHeader>
            <CardContent>
                <p>A school branch must be selected to log in. Please return to the portals page and select your branch.</p>
                <Button asChild className="mt-4" variant="secondary"><Link href="/portals">Go Back</Link></Button>
            </CardContent>
        </Card>
      );
  }

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    
    try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: values.email.toLowerCase(),
            password: values.password,
        });

        if (signInError) throw signInError;
        if (!signInData.user) throw new Error("Could not get user session after login.");
        
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role, school_id')
            .eq('user_id', signInData.user.id)
            .single();

        if (roleError && roleError.code !== 'PGRST116') {
             await supabase.auth.signOut();
             throw new Error("Could not verify user role due to a database error.");
        }
        
        // **NEW LOGIC START**
        // 1. Check if the user has a Super Admin role. This role can log in via any branch.
        if (roleData?.role === 'super_admin') {
            toast({ title: "Super Admin Login Successful", description: "Redirecting to dashboard..." });
            router.push('/admin/dashboard');
            return; // Successful login, bypass all other checks.
        }

        // 2. For all other roles, perform the strict branch and role check.
        if (roleData && (roleData.role === 'admin' || roleData.role === 'accountant')) {
            if (roleData.school_id?.toString() === schoolId) {
                toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
                router.push('/admin/dashboard'); 
                return; // Successful login for the correct branch.
            } else {
                 // The user is an admin/accountant but for a DIFFERENT branch.
                await supabase.auth.signOut();
                throw new Error("This account is not associated with the selected school branch.");
            }
        }
        
        // 3. If the user has no recognized admin/super_admin role or no role at all.
        await supabase.auth.signOut();
        throw new Error("This account does not have the required privileges for this portal.");
        // **NEW LOGIC END**
        
    } catch (error: any) { 
        setLoginError(error.message || "An unexpected error occurred. Please try again.");
    }
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
             {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@example.com" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Logging in...</> : "Login"}
            </Button>
            <div className="text-center text-sm">
                <Link href={`/auth/forgot-password?schoolId=${schoolId}`}
                    className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                    Forgot Password?
                </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
