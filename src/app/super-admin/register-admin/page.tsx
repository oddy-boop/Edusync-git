
"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCog, Info } from "lucide-react";
import { registerSuperAdminAction } from "@/lib/actions/super-admin.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).trim(),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
};

const initialState: ActionResponse = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full sm:w-auto"
      disabled={pending}
    >
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Register & Invite Super Admin"}
    </Button>
  );
}

export default function RegisterAdminPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { role } = useAuth();
  
  const [state, formAction] = useActionState(registerSuperAdminAction, initialState);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Super Admin Registration Initiated",
          description: state.message,
          duration: 9000,
        });
        form.reset();
        formRef.current?.reset();
      } else if (!state.success && state.message) {
        toast({
          title: "Registration Failed",
          description: state.message,
          variant: "destructive",
          duration: 12000,
        });
      }
    }
  }, [state, toast, form]);

  if (role && role !== 'super_admin') {
      return (
          <Card className="shadow-lg border-destructive bg-destructive/10">
              <CardHeader>
                  <CardTitle className="text-destructive flex items-center"><Info className="mr-2 h-5 w-5"/> Access Denied</CardTitle>
                  <CardDescription className="text-destructive/90">Only Super Administrators can register new administrators.</CardDescription>
              </CardHeader>
          </Card>
      )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserCog className="mr-2 h-6 w-6" /> Register New Super Admin
          </CardTitle>
          <CardDescription>
            Create a new platform-wide administrator. They will receive an invitation email to set their password.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form ref={formRef} action={formAction}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin's Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="new.super.admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              <SubmitButton />
               {state.errors && (
                 <Alert variant="destructive" className="w-full">
                  <Info className="h-5 w-5" />
                  <AlertTitle>Validation Error</AlertTitle>
                  <AlertDescription>
                    {state.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
