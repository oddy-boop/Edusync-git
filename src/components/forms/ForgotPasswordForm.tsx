
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { getSupabase } from "@/lib/supabaseClient";
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const supabase = getSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (typeof window === 'undefined') return;
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      toast({
        title: "Configuration Error",
        description: "The application's public URL is not set. Cannot send reset link.",
        variant: "destructive",
      });
      return;
    }
    const redirectTo = `${siteUrl}/auth/update-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: `Could not send reset link: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "A password reset link has been sent to your email address if it exists in our system.",
      });
      form.reset();
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
                    <Input placeholder="your-email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link href="/auth/student/login" className="text-sm text-muted-foreground hover:underline">
                Back to login
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
