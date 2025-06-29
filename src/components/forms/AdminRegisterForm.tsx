
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
    // Store the current admin's session before it gets replaced by signUp.
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to register another admin.", variant: "destructive" });
      form.formState.isSubmitting = false;
      return;
    }

    try {
      // Step 1: Create the user. This signs in the new user, replacing the admin's session.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { 
            full_name: values.fullName, 
          },
        }
      });
      
      // Step 2: Immediately restore the admin's session to perform the next action.
      await supabase.auth.setSession(adminSession);

      if (authError) {
        console.error("Admin registration error (Supabase Auth):", JSON.stringify(authError, null, 2));
        throw new Error(`Auth Error: ${authError.message}`);
      }
      
      if (!authData.user) {
        throw new Error("Registration succeeded but no user data was returned.");
      }
      const authUserId = authData.user.id;

      // Step 3: Explicitly assign the 'admin' role.
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authUserId, role: 'admin' });

      if (roleError) {
        console.error("Admin role assignment error:", JSON.stringify(roleError, null, 2));
        throw new Error(`Role Assignment Error: ${roleError.message}. An auth user was created but their 'admin' role could not be assigned. Please manually delete the user with email '${values.email}' before trying again.`);
      }

      let toastDescription = `Admin account for ${values.email} created and role assigned.`;
      const isConfirmationRequired = authData.user.identities && authData.user.identities.length > 0 && authData.user.email_confirmed_at === null;
      
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
                     Only existing admins can create new admin accounts.
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
