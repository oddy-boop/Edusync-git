
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
// Checkbox import removed
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { DEFAULT_ADMIN_EMAIL, ADMIN_LOGGED_IN_KEY } from "@/lib/constants";
// Firebase imports removed

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  // rememberMe: z.boolean().optional().default(false), // rememberMe removed
});

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      // rememberMe: false, // Default removed
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window !== 'undefined') {
        if (
          values.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
          values.password.length > 0 // Simplified password check
        ) {
          localStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
          toast({
            title: "Login Successful",
            description: `Welcome back, Admin! Redirecting to dashboard...`,
          });
          router.push("/admin/dashboard");
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Error",
          description: "localStorage is not available.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred.",
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
            {/* RememberMe Checkbox Field removed */}
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
              (Use '{DEFAULT_ADMIN_EMAIL}' to register if no admin account exists.)
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
