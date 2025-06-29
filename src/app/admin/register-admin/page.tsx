

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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


function AdminRegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    
    try {
      // The DB trigger 'handle_new_user_with_profile_creation' now handles everything.
      // We pass the app_role in metadata which our DB trigger will use to assign the role.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { 
            full_name: values.fullName,
            app_role: 'admin', // This tells the trigger to assign the role
          },
        }
      });

      if (authError) {
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error("Registration succeeded but no user data was returned.");
      }
      
      let toastDescription = `Admin account for ${values.email} created and role assigned.`;
      const isConfirmationRequired = authData.user.identities && authData.user.identities.length > 0 && !authData.user.email_confirmed_at;
      
      if (isConfirmationRequired) {
        toastDescription += " A confirmation email has been sent. Please check their inbox (and spam folder) to verify the account before logging in.";
      } else {
        toastDescription += " They can now log in.";
      }

      toast({
        title: "Admin Registration Successful",
        description: toastDescription,
        duration: 9000,
      });
      router.push("/auth/admin/login");

    } catch (error: any) { 
      console.error("Unexpected Admin registration error:", error);
      
      let userMessage = error.message || "An unexpected error occurred. Please try again.";
      if (error.message && error.message.toLowerCase().includes("user already registered")) {
        userMessage = `A user with the email '${values.email}' already exists. Please use a different email address.`;
      } else if (error.message && (error.message.toLowerCase().includes("database error saving new user") || error.code === "unexpected_failure")) {
          userMessage = `A database error occurred during role assignment. This is often caused by an issue with the database trigger 'handle_new_user_with_profile_creation' or RLS policies. Please ensure the SQL script from 'rls_policies.md' has been run correctly in your Supabase project.`;
      }
      
      toast({
        title: "Registration Failed",
        description: userMessage,
        variant: "destructive",
        duration: 12000,
      });
    } finally {
      setIsSubmitting(false);
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
                     <Input placeholder="Enter your email" {...field} />
                  </FormControl>
                   <p className="text-xs text-muted-foreground pt-1">
                     The first admin can register freely. Subsequent admins must be created by an existing admin.
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
              disabled={isSubmitting}
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Register Admin"}
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

export default function AdminRegisterPage() {
  return (
    <AuthLayout
      title="Admin Registration"
      description="Create a new administrative account."
    >
      <AdminRegisterForm />
    </AuthLayout>
  );
}
