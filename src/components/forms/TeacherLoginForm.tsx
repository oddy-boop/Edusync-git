
"use client";

import { useState } from "react";
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
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleOfflineLogin = async () => {
    // Offline login logic can be implemented here if needed
    return false;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    if (await handleOfflineLogin()) return;
    
    try {
      const processedEmail = values.email.toLowerCase();

      // In a real app, this would be an API call to your backend
      // This simulates a login to allow UI development
      const isSuccess = processedEmail === 'teacher@example.com' && values.password === 'password';

      if (isSuccess) {
          toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
          router.push('/teacher/dashboard');
      } else {
          setLoginError("Invalid email or password.");
      }

    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        setLoginError("You are offline. Please check your internet connection.");
      } else {
        setLoginError("An unexpected error occurred. Please try again.");
      }
    }
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="teacher@example.com" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} /></FormControl>
                <FormMessage /></FormItem>)} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} onChange={(e) => { field.onChange(e); handleInputChange(); }} /></FormControl>
                <FormMessage /></FormItem>)} />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Logging in...</> : "Login"}
            </Button>
            <div className="text-center text-sm">
                <Link href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                    Forgot Password?
                </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                Login uses the school's authentication system. Ensure your admin has registered you.
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
