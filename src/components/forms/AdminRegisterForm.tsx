
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
import type { AuthError, UserResponse } from "@supabase/supabase-js";

// Define the allowed admin emails here. You can have up to 2.
// IMPORTANT: Update these placeholder emails with the actual emails you want to authorize.
const ALLOWED_ADMIN_EMAILS = [
  "odoomrichard089@gmail.com", // Your existing email
  "admin2@example.com"      // Placeholder for a second admin
].map(email => email.toLowerCase()); // Normalize to lowercase for comparison

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

    if (!ALLOWED_ADMIN_EMAILS.includes(enteredEmail)) {
      toast({
        title: "Registration Denied",
        description: `This email address is not authorized for admin registration. Please use one of the designated admin emails.`,
        variant: "destructive",
      });
      return;
    }
    
    let signUpData: UserResponse | null = null;
    try {
      const response = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { 
            full_name: values.fullName, 
          }
        }
      });

      signUpData = response; // Store the response

      if (response.error) {
        console.error("Admin registration error (Supabase):", response.error);
        let errorMessage = "An error occurred during registration.";
        if (response.error.message.includes("User already registered") || response.error.message.includes("already exists")) {
          errorMessage = "This email address is already registered. Please log in.";
        } else if (response.error.message.includes("Password should be at least 6 characters")) {
          errorMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
        }
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      let toastDescription = `Admin account for ${values.email} creation process initiated.`;
      
      if (signUpData.data.user && signUpData.data.user.identities && signUpData.data.user.identities.length > 0 && signUpData.data.user.identities[0].identity_data?.email_verified === false) {
        // Email confirmation is likely required by Supabase settings, and user is new
        toastDescription += " A confirmation email has been sent. Please verify your email before logging in.";
      } else if (signUpData.data.user && signUpData.data.user.email_confirmed_at === null && !(signUpData.data.user.identities && signUpData.data.user.identities.length > 0 && signUpData.data.user.identities[0].identity_data?.email_verified === true) ) {
        // Another way to check if email confirmation might be pending for a new user
        toastDescription += " If email confirmation is enabled in your Supabase project, please check your inbox. Otherwise, you can log in directly.";
      } else {
        // Email is likely auto-confirmed (either by Supabase settings or it's an existing, confirmed user somehow)
        toastDescription += " You should be able to log in now.";
      }

      toast({
        title: "Admin Registration Update",
        description: toastDescription,
        duration: 7000,
      });
      router.push("/auth/admin/login");

    } catch (error: any) { 
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
                     <Input placeholder="Enter an authorized admin email" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground pt-1">
                     Only designated email addresses can be used for admin registration.
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
