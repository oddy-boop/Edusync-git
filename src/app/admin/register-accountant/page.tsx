
"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useRef, useState } from "react";
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
import { Loader2, UserPlus, Info, KeyRound } from "lucide-react";
import { registerAccountantAction } from "@/lib/actions/accountant.actions";
import InviteResendDialog from '@/components/ui/InviteResendDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).trim(),
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters." }).optional().or(z.literal("")),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
  inviteMeta?: { userId?: string | null; email?: string | null };
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
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Register & Invite Accountant"}
    </Button>
  );
}

export default function RegisterAccountantPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useActionState(registerAccountantAction, initialState);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Accountant Registration Initiated",
          description: state.message,
          duration: 9000,
        });
    form.reset();
    formRef.current?.reset();
    if (state?.inviteMeta?.email) setShowInviteDialog(true);
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

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Accountant
          </CardTitle>
          <CardDescription>
            This form will create a new accountant account. The user will receive an invitation email to set their password.
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
                    <FormLabel>Accountant's Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="accountant@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+233 24 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              <SubmitButton />
               {state.success && state.temporaryPassword && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 w-full">
                  <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
                    Accountant Created (Dev Mode)
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The temporary password for this accountant is:{" "}
                    <strong className="font-mono">{state.temporaryPassword}</strong>.
                    <br/>
                    Please share this securely. The user should change it upon first login.
                  </AlertDescription>
                </Alert>
              )}
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
  <InviteResendDialog email={state?.inviteMeta?.email ?? form.getValues().email} open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </div>
  );
}
