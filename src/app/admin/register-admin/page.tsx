
"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useState, useEffect, useRef } from "react";
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
import { Loader2, UserPlus, Info, KeyRound, AlertCircle as AlertCircleIcon } from "lucide-react";
import { registerAdminAction } from "@/lib/actions/admin.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).trim(),
  schoolId: z.string().uuid("School ID is missing or invalid."),
});

type ActionResponse = {
  success: boolean;
  message: string;
  errors?: z.ZodIssue[];
  temporaryPassword?: string | null;
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
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing...</> : "Register & Invite Admin"}
    </Button>
  );
}

export default function RegisterAdminPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const formRef = useRef<HTMLFormElement>(null);
  const [currentUserSchoolId, setCurrentUserSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [state, formAction] = useActionState(registerAdminAction, initialState);

  useEffect(() => {
    async function fetchAdminSchool() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        
        if (roleError) {
          setError("Could not retrieve your school information. Please re-login.");
        } else if (roleData?.school_id) {
          setCurrentUserSchoolId(roleData.school_id);
        } else {
          setError("Your account is not associated with a school.");
        }
      } else {
        setError("You must be logged in to register an admin.");
      }
      setIsLoading(false);
    }
    fetchAdminSchool();
  }, [supabase]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      schoolId: "",
    },
  });

  useEffect(() => {
    if (currentUserSchoolId) {
      form.setValue('schoolId', currentUserSchoolId);
    }
  }, [currentUserSchoolId, form]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Admin Registration Initiated",
          description: state.message,
          duration: 9000,
        });
        form.reset();
        if (currentUserSchoolId) {
            form.setValue('schoolId', currentUserSchoolId);
        }
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
  }, [state, toast, form, currentUserSchoolId]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin mr-2"/>Loading your school information...</div>
  }

  if (error) {
    return (
        <Card className="shadow-lg max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-destructive"><AlertCircleIcon className="mr-3 h-6 w-6"/> Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Administrator
          </CardTitle>
          <CardDescription>
            This form will create a new administrator account for your school. The user will receive an invitation email to set their password.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form ref={formRef} action={formAction}>
            <CardContent className="space-y-6">
              {currentUserSchoolId && <input type="hidden" name="schoolId" value={currentUserSchoolId} />}
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
                      <Input placeholder="new.admin@example.com" {...field} />
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
                    Admin Created (Dev Mode)
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The temporary password for this admin is:{" "}
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
    </div>
  );
}
