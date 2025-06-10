
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
import { ADMIN_PROFILE_DETAILS_KEY, DEFAULT_ADMIN_EMAIL } from "@/lib/constants";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let expectedAdminEmail = DEFAULT_ADMIN_EMAIL;
    let adminFullName = "Admin";

    if (typeof window !== 'undefined') {
      const storedProfileRaw = localStorage.getItem(ADMIN_PROFILE_DETAILS_KEY);
      if (storedProfileRaw) {
        try {
          const storedProfile = JSON.parse(storedProfileRaw);
          if (storedProfile.email) {
            expectedAdminEmail = storedProfile.email;
          }
          if (storedProfile.fullName) {
            adminFullName = storedProfile.fullName;
          }
        } catch (e) {
          console.error("Error parsing admin profile for login:", e);
          // Fallback to default if parsing fails
        }
      }
    }

    if (values.email.toLowerCase() !== expectedAdminEmail.toLowerCase()) {
      toast({
        title: "Access Denied",
        description: "Invalid email or password.", // Generic message for security
        variant: "destructive",
      });
      return;
    }

    // Mock password check - in a real app, you'd verify the password hash here
    // For this demo, any password with the correct email is accepted.

    console.log("Admin login attempt:", values);
    toast({
      title: "Login Successful (Mock)",
      description: `Welcome back, ${adminFullName}! Redirecting to dashboard...`,
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push("/admin/dashboard");
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
            <p className="text-sm text-muted-foreground">
              New Admin?{" "}
              <Link href="/auth/admin/register" className="font-medium text-primary hover:underline">
                Register here
              </Link>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              (Use '{DEFAULT_ADMIN_EMAIL}' to register if no admin profile exists yet.)
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
