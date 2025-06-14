
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
import { ADMIN_LOGGED_IN_KEY, ADMIN_CREDENTIALS_KEY } from "@/lib/constants";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

interface AdminCredentials {
  fullName: string;
  email: string;
  password?: string;
}

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
    if (typeof window === 'undefined') {
      toast({ title: "Error", description: "LocalStorage not available.", variant: "destructive"});
      return;
    }
    try {
      const adminCredentialsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (!adminCredentialsRaw) {
        toast({
          title: "Login Failed",
          description: "Admin account not found. Please register first.",
          variant: "destructive",
        });
        return;
      }

      const adminCredentials: AdminCredentials = JSON.parse(adminCredentialsRaw);

      if (adminCredentials.email.toLowerCase() === values.email.toLowerCase() && adminCredentials.password === values.password) {
        localStorage.setItem(ADMIN_LOGGED_IN_KEY, "true");
        toast({
          title: "Login Successful",
          description: `Welcome back, ${adminCredentials.fullName || 'Admin'}! Redirecting to dashboard...`,
        });
        router.push("/admin/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred during login.",
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
             <p className="text-xs text-muted-foreground text-center">
                Admin login uses credentials stored in local browser storage.
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
