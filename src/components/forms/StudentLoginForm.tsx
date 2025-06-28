
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
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        console.error("Student login error (Supabase):", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          errorMessage = "Your email has not been confirmed. Please check your inbox for a confirmation link.";
        }
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      if (data.user && data.session) {
        toast({
          title: "Login Successful",
          description: `Welcome back! Redirecting to your dashboard...`,
        });
        router.push("/student/dashboard");
      } else {
         toast({
          title: "Login Failed",
          description: "Could not log in. User or session data missing.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Student login error (General):", error);
      toast({
        title: "Login Failed",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}.`,
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
                    <Input placeholder="your-email@example.com" {...field} />
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
            </Button>
            <Link href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
                Forgot Password?
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
