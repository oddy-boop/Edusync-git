
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const formSchema = z.object({
  loginId: z.string().min(1, "Email or Student ID is required.").trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleOfflineLogin = async () => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
        const { data: { session: cachedSession } } = await supabase.auth.getSession();
        
        if (cachedSession) {
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', cachedSession.user.id)
                .single();

            if (!roleError && roleData?.role === 'student') {
                toast({ title: "Offline Mode", description: "You are offline. Displaying cached dashboard data." });
                router.push("/student/dashboard");
                return true; 
            }
        }
    }
    return false;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    let emailToLogin = "";

    try {
      const isEmail = values.loginId.includes('@');

      if (isEmail) {
        emailToLogin = values.loginId.toLowerCase();
      } else {
        // It's a Student ID, so we need to find the email
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('contact_email')
          .eq('student_id_display', values.loginId)
          .single();

        if (studentError || !studentData?.contact_email) {
          setLoginError("Student ID not found. Please check and try again, or use your email address.");
          return;
        }
        emailToLogin = studentData.contact_email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: values.password,
      });

      if (authError) {
        if (await handleOfflineLogin()) return;
        await supabase.auth.signOut().catch(console.error);
        const lowerCaseErrorMessage = authError.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          setLoginError("Invalid credentials. Please check your details and try again.");
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          setLoginError("Your email has not been confirmed. Please check your inbox for a confirmation link.");
        } else {
          setLoginError(`An unexpected error occurred: ${authError.message}`);
        }
        return;
      }
      
      if (authData.user && authData.session) {
        const { data: studentProfile, error: profileError } = await supabase
          .from('students')
          .select('full_name, auth_user_id')
          .eq('auth_user_id', authData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          await supabase.auth.signOut().catch(console.error);
          setLoginError("Could not verify student profile after login. Please contact admin.");
          return;
        }

        if (!studentProfile) {
          await supabase.auth.signOut().catch(console.error);
          setLoginError("No student profile associated with this login account. Please contact admin.");
          return;
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${studentProfile.full_name || authData.user.email}! Redirecting to your dashboard...`,
        });
        router.push("/student/dashboard");

      } else {
         await supabase.auth.signOut().catch(console.error);
         setLoginError("Could not log in. User or session data missing.");
      }

    } catch (error: any) {
      if (await handleOfflineLogin()) return;
      await supabase.auth.signOut().catch(console.error);
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("You are offline. Please check your internet connection.");
      } else {
        setLoginError(`An unexpected error occurred: ${error.message || 'Unknown error'}.`);
      }
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
              name="loginId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Student ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your email or student ID" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
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
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Verifying...</> : "Login"}
            </Button>
            <Link href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
                Forgot Password?
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
