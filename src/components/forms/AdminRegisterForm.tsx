
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
import { DEFAULT_ADMIN_EMAIL, ADMIN_CREDENTIALS_KEY } from "@/lib/constants";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface AdminCredentials {
  fullName: string;
  email: string;
  password?: string; // Storing password (plaintext for prototype)
}

export function AdminRegisterForm() {
  const { toast } = useToast();
  const router = useRouter();

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

    if (typeof window !== 'undefined') {
      try {
        const existingAdminCredentials = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
        if (existingAdminCredentials) {
          toast({
            title: "Registration Failed",
            description: "An admin account is already registered. Multiple admin accounts are not supported in this version.",
            variant: "destructive",
          });
          return;
        }

        const adminCredentialsToStore: AdminCredentials = {
          fullName: values.fullName,
          email: values.email,
          password: values.password, // Storing password for prototype
        };

        localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(adminCredentialsToStore));
        
        toast({
          title: "Admin Registration Successful",
          description: `Admin account for ${values.email} created. Please log in.`,
        });
        
        router.push("/auth/admin/login");

      } catch (error: any) {
        console.error("Admin registration error (localStorage):", error);
        toast({
          title: "Registration Failed",
          description: `An error occurred during registration: ${error.message || "Unknown error"}`,
          variant: "destructive",
        });
      }
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
             <p className="text-xs text-destructive/80 pt-1">
                <strong>Warning:</strong> For this prototype, passwords are stored in plaintext in localStorage. Do not use real passwords.
            </p>
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
