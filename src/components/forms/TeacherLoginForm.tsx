
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
import { TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    try {
      if (typeof window === 'undefined') {
        setLoginError("Environment not supported.");
        return;
      }

      const processedEmail = values.email.toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (authError) {
        await supabase.auth.signOut().catch(console.error);
        const lowerCaseErrorMessage = authError.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          setLoginError("Invalid email or password. Please check your credentials and try again.");
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          setLoginError("This account's email has not been confirmed. Please check your inbox for a confirmation link.");
        } else {
          setLoginError(`An unexpected error occurred: ${authError.message}`);
        }
        return;
      }
      
      if (authData.user && authData.session) {
        const { data: teacherProfile, error: profileError } = await supabase
          .from('teachers')
          .select('full_name, auth_user_id')
          .eq('auth_user_id', authData.user.id) 
          .single();

        if (profileError || !teacherProfile) {
          await supabase.auth.signOut().catch(console.error);
          setLoginError("No teacher profile associated with this login account. Please contact an administrator.");
          return;
        }
        
        localStorage.setItem(TEACHER_LOGGED_IN_UID_KEY, authData.user.id); 
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${teacherProfile.full_name || authData.user.email}! Redirecting to dashboard...`,
        });
        router.push("/teacher/dashboard");
      } else {
         await supabase.auth.signOut().catch(console.error);
         setLoginError("Could not log in. User or session data missing.");
      }

    } catch (error: any) {
      await supabase.auth.signOut().catch(console.error);
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("Could not connect to the server. Please check your internet connection and ensure the Supabase URL in your .env file is correct.");
      } else {
        setLoginError("An unexpected error occurred. Please try again.");
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
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Login"}
            </Button>
            <div className="text-center text-sm">
                <Link href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                    Forgot Password?
                </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Login uses the school's authentication system. Ensure your admin has registered you.
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
