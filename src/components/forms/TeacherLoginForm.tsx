
"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import AuthFooterNote from "@/components/shared/AuthFooterNote";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  let schoolId = searchParams ? searchParams.get('schoolId') : null;
  // fallback to BranchGate selection stored in localStorage
  if (!schoolId) {
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        const sel = JSON.parse(raw);
        schoolId = sel?.id?.toString();
      }
    } catch (e) {
      // ignore
    }
  }
  const [loginError, setLoginError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // allow login without explicit query param when branch stored in localStorage

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    
    try {
      const processedEmail = values.email.toLowerCase();

      const { data: userResponse, error: signInError } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (signInError) throw signInError;
      
      // Verify user role and school association after login using server endpoint
      try {
        const verifyRes = await fetch('/api/user-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userResponse.user.id })
        });
        const verifyBody = await verifyRes.json();

        if (verifyBody?.error) {
          await supabase.auth.signOut();
          throw new Error('Unable to verify account role for the selected school.');
        }

        const roleData = verifyBody?.roleData ?? null;
        if (!roleData || roleData.role !== 'teacher' || String(roleData.school_id) !== String(schoolId)) {
          await supabase.auth.signOut();
          throw new Error("This teacher account is not associated with the selected school branch.");
        }
      } catch (e) {
        await supabase.auth.signOut();
        throw e;
      }

      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
      router.push('/teacher/dashboard');

    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("You are offline. Please check your internet connection.");
      } else {
        setLoginError(error.message || "An unexpected error occurred. Please try again.");
      }
    }
  }

  return (
    <div className="w-full">
      <Card className="shadow-xl w-full md:rounded-lg">
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
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="teacher@example.com" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} /></FormControl>
                <FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} /></FormControl>
                <FormMessage /></FormItem>)} />
          </CardContent>
          <CardFooter className="flex-col gap-3">
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
      <AuthFooterNote>
        Login uses the school's authentication system. Ensure your admin has registered you.
      </AuthFooterNote>
          </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
