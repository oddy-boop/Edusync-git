
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
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  loginId: z.string().min(1, "Email or Student ID is required.").trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get('schoolId');
  const [loginError, setLoginError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: "",
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
      let emailToLogin = values.loginId;
      // If it's not an email, assume it's a student ID and look up the email
      if (!values.loginId.includes('@')) {
          const { data: student, error: studentError } = await supabase
              .from('students')
              .select('contact_email')
              .eq('student_id_display', values.loginId.toUpperCase())
              .eq('school_id', schoolId)
              .single();

          if (studentError || !student?.contact_email) {
              setLoginError("Student ID not found for the selected branch or no email is associated with it.");
              return;
          }
          emailToLogin = student.contact_email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToLogin.toLowerCase(),
        password: values.password,
      });

      if (signInError) throw signInError;
      
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
      router.push('/student/dashboard');

    } catch (error: any) {
        if(error.message && error.message.toLowerCase().includes('failed to fetch')) {
            setLoginError("You are offline. Please check your internet connection and try again.");
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
