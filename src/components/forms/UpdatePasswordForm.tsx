
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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

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
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function tryRestoreSession() {
      const code = searchParams.get('code');
      const accessTokenQuery = searchParams.get('access_token');

      // Supabase sometimes returns the recovery token in the URL hash (fragment)
      // (e.g. #access_token=...). Check both query and hash before showing an error.
      let accessTokenFromHash: string | null = null;
      let refreshTokenFromHash: string | null = null;
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        accessTokenFromHash = hashParams.get('access_token');
        refreshTokenFromHash = hashParams.get('refresh_token');
      }

      // If we have tokens in either query or hash, attempt to set the session now.
      const accessToken = accessTokenFromHash || accessTokenQuery;
      const refreshToken = refreshTokenFromHash || searchParams.get('refresh_token');

      if (accessToken) {
        try {
          const payload: any = { access_token: accessToken };
          if (refreshToken) payload.refresh_token = refreshToken;
          const { error: setSessionError } = await supabase.auth.setSession(payload);
          if (setSessionError) {
            console.error('Failed to set session from URL tokens', setSessionError);
            setError('Invalid or expired token. Please request a new link.');
          }
          setIsVerifying(false);
          return;
        } catch (e: any) {
          console.error('Error while restoring session from URL:', e);
          setError('Invalid or expired token. Please request a new link.');
          setIsVerifying(false);
          return;
        }
      }

      // No tokens found — give the client a moment in case auth state changes are pending,
      // then show an invalid token message.
      const timer = setTimeout(() => {
        setError('Invalid password reset token. Please request a new link.');
        setIsVerifying(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // run
    tryRestoreSession();
  }, [searchParams]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
    // Ensure we have an auth session. If not, try to extract tokens from the
    // URL (hash or query) and set the session so updateUser can run.
    const { data: currentSession } = await supabase.auth.getSession();
    if (!currentSession?.session) {
      // Try hash params first (Supabase often returns tokens in the URL fragment)
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      if (typeof window !== 'undefined') {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');

        // fallback to query params
        if (!accessToken) {
          const urlSearch = new URLSearchParams(window.location.search);
          accessToken = urlSearch.get('access_token');
          refreshToken = urlSearch.get('refresh_token');
        }
      }

      if (accessToken) {
        let sessionPayload: { access_token: string; refresh_token: string } | { access_token: string; } = { access_token: accessToken };
        if (refreshToken) {
          sessionPayload = { access_token: accessToken, refresh_token: refreshToken };
        }
        const { error: setSessionError } = await supabase.auth.setSession(sessionPayload as any);
        if (setSessionError) throw setSessionError;
      } else {
        throw new Error('Auth session missing');
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
        if(updateError) throw updateError;
  toast({ title: "Success", description: "Password updated successfully! Redirecting to home..." });
  router.push('/');

    } catch (e: any) {
        setError(e.message);
    }
  }

  if (isVerifying) {
      return (
          <div className="flex flex-col items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Verifying link...</p>
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={!!error || form.formState.isSubmitting} />
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={!!error || form.formState.isSubmitting} />
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
