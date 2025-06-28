
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

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).trim(),
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
    try {
      const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) {
        console.error("Error checking admin count:", countError);
        toast({
          title: "Registration Error",
          description: "Could not verify system status. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      if (count !== null && count >= 2) {
        toast({
          title: "Registration Capped",
          description: "The maximum number of admin accounts (2) has been reached. To add a new admin, an existing one must be deleted.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

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
        let userMessage = "An unexpected error occurred. Please try again.";
        if (error.message.toLowerCase().includes("user already registered")) {
            userMessage = "This email address is already registered. Please log in.";
        } else if (error.message.toLowerCase().includes("password should be at least 6 characters")) {
            userMessage = "The password is too weak. Please choose a stronger password (at least 6 characters).";
        } else if (error.message.toLowerCase().includes("invalid email")) {
            userMessage = "The provided email address appears to be invalid. Please check for typos and extra spaces.";
        } else {
            userMessage = error.message;
        }
        toast({
            title: "Registration Failed",
            description: userMessage,
            variant: "destructive",
        });
        return;
      }
      
      if (!data.user) {
        throw new Error("Registration succeeded but no user data was returned.");
      }

      let toastDescription = `Admin account for ${values.email} created. The database trigger has assigned the admin role.`;
      const isConfirmationRequired = data.user.identities && data.user.identities.length > 0 && data.user.email_confirmed_at === null;
      
      if (isConfirmationRequired) {
        toastDescription += " A confirmation email has been sent. Please check your inbox (and spam folder) to verify your account before logging in.";
      } else {
        toastDescription += " You can now log in.";
      }

      toast({
        title: "Admin Registration Successful",
        description: toastDescription,
        duration: 9000,
      });
      router.push("/auth/admin/login");

    } catch (error: any) { 
      console.error("Unexpected Admin registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
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
                     <Input placeholder="Enter your email" {...field} />
                  </FormControl>
                   <p className="text-xs text-muted-foreground pt-1">
                     The first two registrations will become administrators.
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
