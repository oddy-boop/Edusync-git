
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
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    // This listener waits for Supabase to process the password reset token from the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // This event fires once the user is redirected from the password reset email.
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timer); // We got the event, so cancel the fallback timeout.
        if (session?.user) {
          setUser(session.user);
          setError(null);
        } else {
          // This can happen if the token is valid but something else went wrong.
          setError("Could not establish a recovery session. The link might be invalid or expired.");
        }
        setIsLoading(false);
        subscription?.unsubscribe();
      }
    });
    
    // Set a fallback timer. If the `PASSWORD_RECOVERY` event doesn't fire after
    // a few seconds, it's likely because the URL token is invalid or expired.
    timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError("Unable to verify password reset link. It may be invalid or expired. Please request a new link.");
      }
    }, 5000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase.auth, isLoading]);

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
      setError(`Failed to update password: ${updateError.message}`);
      toast({
        title: "Error",
        description: `Could not update password: ${updateError.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your password has been successfully updated. Please log in with your new password.",
      });
      // Sign out to clear the recovery session and redirect to a generic login page.
      await supabase.auth.signOut();
      router.push("/auth/student/login");
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
