
"use client";

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
import { ADMIN_LOGGED_IN_KEY } from "@/lib/constants";
import type { AuthError } from "@supabase/supabase-js";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export function AdminLoginForm() {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        console.error("Admin login error (Supabase):", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again, or use the 'Forgot Password' link.";
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
            errorMessage = "Your email has not been confirmed. Please check your inbox for a confirmation link.";
        } else if (error.message.toLowerCase().includes("captcha")) {
            errorMessage = "CAPTCHA verification failed. Please try again or contact support if this persists."
        }
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }

      if (data.user && data.session) {
        // **SECURITY ENHANCEMENT**: Verify the user has the 'admin' role in our user_roles table.
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .single();

        if (roleError || !roleData) {
          await supabase.auth.signOut(); // Log them out immediately
          toast({
            title: "Access Denied",
            description: "You do not have administrative privileges. This account is not registered as an admin.",
            variant: "destructive",
            duration: 7000,
          });
          return;
        }
        
        // Role verified, proceed with login.
        if (typeof window !== 'undefined') {
          localStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
        }
        const displayName = data.user.user_metadata?.full_name || "Admin";
        toast({
          title: "Login Successful",
          description: `Welcome back, ${displayName}! Redirecting to dashboard...`,
        });
        router.push("/admin/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: "Could not log in. User or session data missing.",
          variant: "destructive",
        });
      }
    } catch (error: any) { 
      console.error("Unexpected Admin login error:", error);
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@example.com" {...field} />
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
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm space-x-2">
                <Link href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                    Forgot Password?
                </Link>
                <span className="text-muted-foreground">|</span>
                <Link href="/auth/admin/register" className="font-medium text-primary hover:underline">
                    Register here
                </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
