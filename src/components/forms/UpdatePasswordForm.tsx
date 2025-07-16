
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
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function UpdatePasswordForm() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = getSupabase();
  const isMounted = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    // This listener is the most reliable way to catch the session created by the reset link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (isMounted.current) {
          if (event === 'PASSWORD_RECOVERY') {
            if (session?.user) {
              setUser(session.user);
              setError(null);
              setIsLoading(false);
            }
          } else if (event === 'SIGNED_IN') {
             if (session?.user) {
              setUser(session.user);
              setError(null);
              setIsLoading(false);
            }
          }
        }
      }
    );
    
    // Fallback check in case the event is missed.
    const checkInitialSession = async () => {
        // Give the Supabase client a moment to process the URL fragment
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!isMounted.current) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            setError(null);
        } else {
            setError("Unable to verify password reset link. It may be invalid or expired. Please request a new link.");
        }
        setIsLoading(false);
    };

    checkInitialSession();

    return () => {
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, [supabase.auth]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      setError("User session not found. Cannot update password.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      let errorMessage = `Could not update password: ${updateError.message}`;
      if (updateError.message.toLowerCase().includes("new password should be different")) {
        errorMessage = "New password must be different from the old password.";
      } else if (updateError.message.toLowerCase().includes("weak password")) {
        errorMessage = "Password is too weak. Please choose a stronger one (at least 6 characters).";
      } else if (updateError.message.toLowerCase().includes("for security purposes, you can only request this after")) {
        errorMessage = "You are attempting to change your password too quickly. Please wait a moment and try again.";
      }
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your password has been successfully updated. You will be redirected to the homepage to log in.",
      });
      // Sign out to clear the recovery session and redirect to the homepage.
      await supabase.auth.signOut();
      router.push("/");
    }
  }

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Verifying reset link...</p>
          </div>
      );
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {error && (
               <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={!!error} />
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={!!error} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !!error}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
    