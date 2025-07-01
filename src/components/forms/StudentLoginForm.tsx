
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
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
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
      const processedEmail = values.email.toLowerCase(); // Ensure email is lowercase

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (authError) {
        const lowerCaseErrorMessage = authError.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          console.warn(`Student login failed for ${processedEmail}: Invalid credentials.`);
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          console.warn(`Student login failed for ${processedEmail}: Email not confirmed.`);
          toast({
            title: "Email Not Confirmed",
            description: "Your email has not been confirmed. Please check your inbox for a confirmation link.",
            variant: "destructive",
            duration: 9000,
          });
        } else {
          console.error("Unexpected student login error:", authError);
          toast({
            title: "Login Error",
            description: `An unexpected error occurred: ${authError.message}`,
            variant: "destructive",
          });
        }
        await supabase.auth.signOut().catch(console.error); // Clear potentially stale session
        return;
      }
      
      if (authData.user && authData.session) {
        // **SECURITY ENHANCEMENT**: Verify the user has a 'student' profile.
        const { data: studentProfile, error: profileError } = await supabase
          .from('students')
          .select('full_name, auth_user_id')
          .eq('auth_user_id', authData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching student profile after login:", profileError);
          await supabase.auth.signOut(); 
          toast({ title: "Login Error", description: "Could not verify student profile after login. Please contact admin.", variant: "destructive" });
          return;
        }

        if (!studentProfile) {
          await supabase.auth.signOut(); 
          toast({ title: "Login Failed", description: "No student profile associated with this login account. Please contact admin.", variant: "destructive" });
          return;
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${studentProfile.full_name || authData.user.email}! Redirecting to your dashboard...`,
        });
        router.push("/student/dashboard");

      } else {
         toast({
          title: "Login Failed",
          description: "Could not log in. User or session data missing.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Student login error (General):", error);
      toast({
        title: "Login Failed",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}.`,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="your-email@example.com" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
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
