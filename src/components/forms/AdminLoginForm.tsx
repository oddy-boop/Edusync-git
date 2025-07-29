
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function AdminLoginForm() {
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
      const processedEmail = values.email.toLowerCase();

      // Step 1: Check if a user with this email exists and has the correct role in the database.
      // This requires a server-side function or a more complex query if RLS is strict.
      // For now, we will perform a pre-check which assumes some read access.
      const { data: userData, error: userError } = await supabase
        .from('teachers') // A proxy table to get user_id from email
        .select('auth_user_id')
        .eq('email', processedEmail)
        .single();
        
      let authUserId: string | null = userData?.auth_user_id;

      if (userError && userError.code !== 'PGRST116') {
        // If there's a real error fetching, stop. 'PGRST116' means 'not found', which is okay.
        setLoginError('Could not verify user role. Please check connection or contact support.');
        return;
      }
      
      // If user not found in teachers, maybe they are in students or just an admin
      // This logic is getting complex, a direct role check is better.
      // Let's simplify and do the role check after login, but provide better errors.
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: processedEmail,
        password: values.password,
      });

      if (error) {
        const lowerCaseErrorMessage = error.message.toLowerCase();
        if (lowerCaseErrorMessage.includes("invalid login credentials")) {
          setLoginError("Invalid email or password. Please check your credentials and try again.");
        } else if (lowerCaseErrorMessage.includes("email not confirmed")) {
          setLoginError("This admin account's email has not been confirmed. Please check your inbox for a confirmation link.");
        } else {
          setLoginError(`An unexpected error occurred: ${error.message}`);
        }
        return;
      }

      if (data.user && data.session) {
        // After successful login, verify the user has a valid role in the database.
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
          await supabase.auth.signOut().catch(console.error);
          setLoginError("This account does not have administrative privileges. Please log in with a valid admin account.");
          return;
        }
        
        const displayName = data.user.user_metadata?.full_name || "Admin";
        toast({
          title: "Login Successful",
          description: `Welcome back, ${displayName}! Redirecting to dashboard...`,
        });
        
        router.push("/admin/dashboard");
      } else {
        setLoginError("Could not log in. User or session data missing.");
      }
    } catch (error: unknown) { 
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('failed to fetch')) {
          setLoginError("Could not connect to the server. Please check your internet connection and ensure the Supabase URL in your .env file is correct.");
        } else {
          setLoginError("An unexpected error occurred. Please try again.");
        }
      } else {
        setLoginError("An unknown error occurred. Please try again.");
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
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
                <Link href="/auth/forgot-password"
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
