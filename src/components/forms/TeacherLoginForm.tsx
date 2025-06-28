
"use client";

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
import { KeyRound, Loader2 } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window === 'undefined') {
        toast({ title: "Login Error", description: "Environment not supported.", variant: "destructive" });
        return;
      }

      const processedEmail = values.email.toLowerCase(); // Ensure email is lowercase for consistency

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (authError) {
        console.error("Teacher login error (Auth):", authError); // Raw error for inspection
        let errorMessage = "An unexpected error occurred. Please try again.";
        
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          console.warn(`Login attempt failed for email "${processedEmail}": Invalid credentials.`);
          errorMessage = "Invalid email or password. Please double-check your credentials. Ensure your account has been created via admin registration and your email is confirmed if required.";
        } else if (authError.message.toLowerCase().includes("email not confirmed")) {
          console.warn(`Login attempt failed for email "${processedEmail}": Email not confirmed.`);
          errorMessage = "Email not confirmed. Please check your inbox (and spam folder) for a confirmation link, or contact an admin to resend it.";
        } else if (authError.message.toLowerCase().includes("captcha")) {
          errorMessage = "CAPTCHA verification failed. Please try again or contact support if this persists."
        }
        toast({ title: "Login Failed", description: errorMessage, variant: "destructive", duration: 7000 });
        return;
      }

      if (authData.user && authData.session) {
        // Now, verify this authenticated user exists in our 'teachers' table using their auth_user_id
        const { data: teacherProfile, error: profileError } = await supabase
          .from('teachers')
          .select('full_name, auth_user_id') // auth_user_id is the PK from auth.users
          .eq('auth_user_id', authData.user.id) 
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching teacher profile after login:", profileError);
          await supabase.auth.signOut(); 
          toast({ title: "Login Error", description: "Could not verify teacher profile after login. Please contact admin.", variant: "destructive" });
          return;
        }

        if (!teacherProfile) {
          await supabase.auth.signOut(); 
          toast({ title: "Login Failed", description: "No teacher profile associated with this login account. Please contact admin.", variant: "destructive" });
          return;
        }
        
        localStorage.setItem(TEACHER_LOGGED_IN_UID_KEY, authData.user.id); 
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${teacherProfile.full_name || authData.user.email}! Redirecting to dashboard...`,
        });
        router.push("/teacher/dashboard");
      } else {
         toast({ title: "Login Failed", description: "Could not log in. User or session data missing.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Teacher login error (General):", error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="teacher@example.com" {...field} /></FormControl>
                <FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
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
