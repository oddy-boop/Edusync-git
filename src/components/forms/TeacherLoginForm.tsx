
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

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
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

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        console.error("Teacher login error (Supabase Auth):", authError);
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          errorMessage = "Invalid email or password. Please ensure you have registered and confirmed your email if required.";
        } else if (authError.message.toLowerCase().includes("email not confirmed")) {
            errorMessage = "Email not confirmed. Please check your inbox for a confirmation link from Supabase.";
        }
        toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
        return;
      }

      if (authData.user && authData.session) {
        // Now, verify this authenticated user exists in our 'teachers' table using their auth_user_id
        const { data: teacherProfile, error: profileError } = await supabase
          .from('teachers')
          .select('full_name')
          .eq('auth_user_id', authData.user.id) // Match against auth_user_id
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching teacher profile after Supabase Auth login:", profileError);
          await supabase.auth.signOut(); // Sign out the user if profile lookup fails
          toast({ title: "Login Error", description: "Could not verify teacher profile. Please contact admin.", variant: "destructive" });
          return;
        }

        if (!teacherProfile) {
          await supabase.auth.signOut(); // Sign out if no matching profile
          toast({ title: "Login Failed", description: "No teacher profile associated with this account. Please contact admin.", variant: "destructive" });
          return;
        }
        
        // Store the Supabase Auth user ID (authData.user.id)
        localStorage.setItem(TEACHER_LOGGED_IN_UID_KEY, authData.user.id); 
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${teacherProfile.full_name || authData.user.email}! Redirecting to dashboard...`,
        });
        router.push("/teacher/dashboard");
      } else {
         toast({ title: "Login Failed", description: "Could not log in. User or session data missing from Supabase Auth.", variant: "destructive" });
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
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Login"}
            </Button>
             <p className="text-xs text-muted-foreground text-center">
                Login uses Supabase Authentication. Ensure your admin has registered you.
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
