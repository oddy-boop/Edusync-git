
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
import { useEffect, useState } from "react";
import { ADMIN_REGISTERED_KEY, ADMIN_PROFILE_DETAILS_KEY, DEFAULT_ADMIN_EMAIL } from "@/lib/constants";

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
  const [isRegisteredAllowed, setIsRegisteredAllowed] = useState(false);

  // This effect checks if an admin profile already exists. 
  // If so, it might indicate this registration form is less relevant unless it's for the DEFAULT_ADMIN_EMAIL.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingProfile = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
      // This logic could be expanded, e.g., to check if existingProfile.email === DEFAULT_ADMIN_EMAIL
      // For now, we simply check if ANY admin profile exists.
      if (localStorage.getItem(ADMIN_REGISTERED_KEY) === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
         // If the default admin email slot has been claimed
      }
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "", // User must enter the default admin email here
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

    // If code reaches here, enteredEmail is DEFAULT_ADMIN_EMAIL
    if (typeof window !== 'undefined') {
      // Save/update the profile with the entered full name and the DEFAULT_ADMIN_EMAIL.
      // The admin can change their login email on the profile page later.
      const profileData = { fullName: values.fullName, email: DEFAULT_ADMIN_EMAIL };
      localStorage.setItem(ADMIN_PROFILE_DETAILS_KEY, JSON.stringify(profileData));
      
      // Mark that the default admin email has completed this registration step.
      localStorage.setItem(ADMIN_REGISTERED_KEY, DEFAULT_ADMIN_EMAIL.toLowerCase());
    }
    
    toast({
      title: "Admin Registration Processed (Mock)",
      description: `Admin account for ${values.email} (Full Name: ${values.fullName}) has been set up. You can now log in or manage profile details. Redirecting to login...`,
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push("/auth/admin/login");
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
