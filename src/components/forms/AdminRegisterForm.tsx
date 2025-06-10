
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

const ALLOWED_ADMIN_EMAIL = "odoomrichard089@gmail.com";
const ADMIN_REGISTERED_KEY = "admin_email_registered_sjm";

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
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const registeredStatus = localStorage.getItem(ADMIN_REGISTERED_KEY);
      if (registeredStatus === ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        setIsRegistered(true);
      }
    }
  }, []);

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

    if (enteredEmail !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      toast({
        title: "Registration Denied",
        description: "This email address is not authorized for admin registration.",
        variant: "destructive",
      });
      return;
    }

    if (typeof window !== 'undefined') {
      const registeredAdminEmail = localStorage.getItem(ADMIN_REGISTERED_KEY);
      if (registeredAdminEmail === ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        toast({
          title: "Registration Failed",
          description: "Email already exists. Please login.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Mock registration
    console.log("Admin registration attempt:", values);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_REGISTERED_KEY, ALLOWED_ADMIN_EMAIL.toLowerCase());
    }
    setIsRegistered(true); // Update state to reflect registration

    toast({
      title: "Registration Successful (Mock)",
      description: `Admin account for ${values.email} created. Redirecting to login...`,
    });
    
    // Simulate API call
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
              disabled={form.formState.isSubmitting || (form.getValues("email").toLowerCase() === ALLOWED_ADMIN_EMAIL.toLowerCase() && isRegistered)}
            >
              {form.formState.isSubmitting ? "Registering..." : "Register"}
            </Button>
            {form.getValues("email").toLowerCase() === ALLOWED_ADMIN_EMAIL.toLowerCase() && isRegistered && (
              <p className="text-sm text-destructive">This admin email is already registered.</p>
            )}
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
