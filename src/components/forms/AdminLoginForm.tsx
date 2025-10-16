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
import { AlertCircle, Loader2, KeyRound } from "lucide-react";
import AuthFooterNote from "@/components/shared/AuthFooterNote";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  let schoolId = searchParams ? searchParams.get('schoolId') : null;
  let resolvedSchoolName: string | null = null;
  if (!schoolId) {
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        const sel = JSON.parse(raw);
        schoolId = sel?.id?.toString();
        resolvedSchoolName = sel?.name || sel?.title || null;
      }
    } catch (e) {
      // ignore
    }
  } else {
    // If schoolId is from query param, also try to read a cached name
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        const sel = JSON.parse(raw);
        if (sel?.id?.toString() === schoolId) resolvedSchoolName = sel?.name || sel?.title || null;
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
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
            email: values.email.toLowerCase(),
            password: values.password,
        });

        if (signInError) throw signInError;
        if (!user) throw new Error("Login failed, user not found.");

    // Ensure we have a school context
    if (!schoolId) {
      await supabase.auth.signOut();
      throw new Error("No school selected. Please select the correct school branch and try again.");
    }

        // Verify role server-side using the service-role key to avoid RLS issues
        try {
          const verifyRes = await fetch('/api/admin-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, schoolId }),
          });
          const verifyBody = await verifyRes.json();

          // Network / server error
          if (verifyBody?.error) {
            console.error('admin-verify error', verifyBody);
            await supabase.auth.signOut();
            throw new Error('Unable to verify account role for the selected school. Please try again later.');
          }

          if (!verifyBody?.allowed) {
            await supabase.auth.signOut();
            const role = verifyBody?.role || 'none';
            throw new Error(`Access Denied: Your account role (${role}) is not authorized for this school's admin portal.`);
          }

          // Persist the selected school into the user's auth metadata so the
          // client auth context and server actions can read it immediately.
          const completeRes = await fetch('/api/admin/complete-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, schoolId }),
          });
          const completeBody = await completeRes.json();
          if (completeBody?.error || !completeBody?.success) {
            console.error('complete-login error', completeBody);
            // Not fatal: continue but warn the user
            toast({ title: 'Warning', description: 'Could not persist selected school to your account; some pages may not reflect your selected branch until you reload.' });
          } else {
            // Refresh the local session/user so auth context picks up new metadata
            await supabase.auth.getSession();
          }
        } catch (e) {
          // bubble up
          throw e;
        }

        toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
        router.push('/admin/dashboard');

    } catch (error: any) { 
        setLoginError(error.message || "An unexpected error occurred. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8"> {/* Added responsive container */}
      <Card className="shadow-xl w-full md:rounded-lg">
        <CardHeader className="px-6 sm:px-8 pt-6 pb-4"> {/* Added consistent padding */}
          <CardTitle className="flex items-center text-xl sm:text-2xl font-headline justify-center sm:justify-start"> {/* Responsive text and alignment */}
            <KeyRound className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> Admin Login
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-6 sm:px-8 py-4"> {/* Consistent padding and smaller spacing */}
            {resolvedSchoolName || schoolId ? (
              <div className="text-sm text-muted-foreground text-center sm:text-left px-2"> {/* Responsive text alignment */}
                <strong>Selected School:</strong> {resolvedSchoolName ? `${resolvedSchoolName} (${schoolId})` : schoolId}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center sm:text-left px-2">No school selected. Select a branch before logging in.</div>
            )}
            {loginError && (
              <Alert variant="destructive" className="mx-2"> {/* Added margin */}
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">{loginError}</AlertDescription> {/* Responsive text */}
              </Alert>
            )}
            <div className="space-y-4"> {/* Consistent spacing */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Email Address</FormLabel> {/* Responsive text */}
                    <FormControl>
                      <Input 
                        placeholder="admin@example.com" 
                        {...field} 
                        onChange={(e) => { field.onChange(e); handleInputChange(); }}
                        className="text-sm sm:text-base" /* Responsive text */
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm" /> {/* Responsive text */}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm sm:text-base"> {/* Responsive text */}
                      <KeyRound className="mr-1 h-4 w-4" />
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        onChange={(e) => { field.onChange(e); handleInputChange(); }}
                        className="text-sm sm:text-base" /* Responsive text */
                      />
                    </FormControl>
                    <FormMessage className="text-xs sm:text-sm" /> {/* Responsive text */}
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 px-6 sm:px-8 pb-6"> {/* Consistent padding */}
            <Button 
              type="submit" 
              className="w-full text-sm sm:text-base py-2.5" /* Responsive text and padding */
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Logging in...</> : "Login"}
            </Button>
            <div className="text-center text-xs sm:text-sm"> {/* Responsive text */}
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