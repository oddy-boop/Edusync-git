
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
import Link from 'next/link';
import AuthFooterNote from "@/components/shared/AuthFooterNote";
import { sendPasswordResetAction } from "@/lib/actions/auth.actions";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    
    const result = await sendPasswordResetAction(values);

    if (result.success) {
      toast({
        title: "Check your email",
        description: "A password reset link has been sent to your email address if it exists in our system.",
      });
      form.reset();
    } else {
      toast({
        title: "Error",
        description: `Could not send reset link: ${result.message}`,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full">
      <Card className="shadow-xl w-full md:rounded-lg">
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link href="/portals" className="text-sm text-muted-foreground hover:underline">
                Back to Portal Selection
            </Link>
            <AuthFooterNote>
              If you don't receive the email, check your spam folder or contact your school's administrator.
            </AuthFooterNote>
          </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
