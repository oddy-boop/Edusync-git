
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

// This client-side list is for immediate user feedback.
// The true authorization is handled by the database trigger.
const ALLOWED_ADMIN_EMAILS_FOR_CLIENT_CHECK = [
  "odoomrichard089@gmail.com", 
  "admin2@example.com"
].map(email => email.toLowerCase());

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

    // Client-side check for immediate feedback
    if (!ALLOWED_ADMIN_EMAILS_FOR_CLIENT_CHECK.includes(enteredEmail)) {
      toast({
        title: "Registration Denied",
        description: `This email address is not authorized for admin registration. Please contact the system owner if you believe this is a mistake.`,
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { 
            full_name: values.fullName, 
          }
        }
      });

      if (error) {
        console.error("Admin registration error (Supabase):", error);
        let errorMessage = "An error occurred during registration.";
        if (error.message.includes("User already registered") || error.message.includes("already exists")) {
          errorMessage = "This email address is already registered. Please log in.";
        } else if (error.message.includes("Password should be at least 6 characters")) {
          errorMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
        }
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      let toastDescription = `Admin account for ${values.email} created. The database trigger has assigned the admin role.`;
      
      if (data.user && !data.user.email_confirmed_at) {
        toastDescription += " A confirmation email has been sent. Please verify your email before logging in.";
      } else {
        toastDescription += " You can now log in.";
      }

      toast({
        title: "Admin Registration Successful",
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
                     Only designated email addresses will be granted admin privileges.
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
