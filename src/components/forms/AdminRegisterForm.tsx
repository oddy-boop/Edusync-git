
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
import { getSupabase } from "@/lib/supabaseClient"; // Import Supabase client
import { DEFAULT_ADMIN_EMAIL } from "@/lib/constants";
import type { AuthError } from "@supabase/supabase-js";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export function AdminRegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const enteredEmail = values.email.toLowerCase();

    if (enteredEmail !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      toast({
        title: "Registration Denied",
        description: `Only the email address '${DEFAULT_ADMIN_EMAIL}' is authorized for initial admin registration.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Attempt to sign up the user with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { 
            full_name: values.fullName, // Store fullName in user_metadata
          }
        }
      });

      if (signUpError) {
        console.error("Admin registration error (Supabase):", signUpError);
        let errorMessage = "An error occurred during registration.";
        if (signUpError.message.includes("User already registered") || signUpError.message.includes("already exists")) {
          errorMessage = "This email address is already registered. Please log in.";
        } else if (signUpError.message.includes("Password should be at least 6 characters")) {
          errorMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
        }
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (signUpData.user) {
        toast({
          title: "Admin Registration Successful",
          description: `Admin account for ${values.email} created. A confirmation email has been sent if enabled in Supabase. Please log in.`,
        });
        router.push("/auth/admin/login");
      } else if (signUpData.session === null && !signUpData.user) {
        // This case happens if email confirmation is required by Supabase
        toast({
          title: "Confirmation Email Sent",
          description: `A confirmation link has been sent to ${values.email}. Please verify your email before logging in.`,
        });
        router.push("/auth/admin/login"); // Redirect to login, user can login after confirmation
      } else {
         toast({
          title: "Registration Notice",
          description: "Registration process initiated. Please check your email if confirmation is required, then log in.",
          variant: "default",
        });
        router.push("/auth/admin/login");
      }

    } catch (error: any) { // Catch any other unexpected errors
      console.error("Unexpected Admin registration error:", error);
      toast({
        title: "Registration Failed",
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
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                     <Input placeholder={`Enter '${DEFAULT_ADMIN_EMAIL}'`} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground pt-1">
                     Initial registration requires the default admin email: <code className="font-mono bg-muted px-1 py-0.5 rounded">{DEFAULT_ADMIN_EMAIL}</code>.
                   </p>
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
             <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Processing..." : "Register Admin"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/admin/login" className="font-medium text-primary hover:underline">
                Login here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
