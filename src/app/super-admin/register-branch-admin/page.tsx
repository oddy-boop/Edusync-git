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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Info, School, Mail } from "lucide-react";
import { registerAdminAction } from "@/lib/actions/admin.actions";
import { getSchoolsAction } from "@/lib/actions/school.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import InviteResendDialog from '@/components/ui/InviteResendDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Full name must be at least 3 characters." })
    .max(100, { message: "Full name must not exceed 100 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message:
        "Full name can only contain letters, spaces, hyphens, and apostrophes.",
    }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address." })
    .trim()
    .toLowerCase(),
  schoolId: z.coerce
    .number()
    .min(1, "Please select a school branch for this administrator."),
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

interface School {
  id: number;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          Register & Invite Branch Admin
        </>
      )}
    </Button>
  );
}

export default function RegisterBranchAdminPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [lastRegisteredEmail, setLastRegisteredEmail] = useState<string | null>(null);

  const [state, formAction] = useActionState(registerAdminAction, initialState);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      schoolId: undefined,
    },
  });

  // Watch form values to sync with hidden inputs
  const watchedValues = form.watch();

  useEffect(() => {
    async function fetchSchools() {
      const result = await getSchoolsAction();
      if (result.success) {
        setSchools(result.data);
      } else {
        toast({
          title: "Error",
          description: "Could not load school branches.",
        });
      }
    }
    fetchSchools();
  }, [toast]);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Admin Registration Initiated",
          description: state.message,
          duration: 9000,
        });
        setLastRegisteredEmail(watchedValues.email || null);
        setShowResendDialog(true);
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
  }, [state, toast, form, watchedValues.email]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Branch Admin
          </CardTitle>
          <CardDescription>
            Create a new administrator for a specific school branch. They will
            receive an invitation email.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form ref={formRef} action={formAction}>
            <CardContent className="space-y-6">
              {/* Hidden inputs to ensure form data is sent to server action */}
              <input
                type="hidden"
                name="schoolId"
                value={watchedValues.schoolId || ""}
              />
              <input
                type="hidden"
                name="fullName"
                value={watchedValues.fullName || ""}
              />
              <input
                type="hidden"
                name="email"
                value={watchedValues.email || ""}
              />

              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <School className="mr-2 h-4 w-4" />
                      School Branch
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a school to assign the admin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem
                            key={school.id}
                            value={school.id.toString()}
                          >
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input
                        placeholder="branch.admin@example.com"
                        {...field}
                      />
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
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
      {/* InviteResendDialog for resending invite after registration */}
      {showResendDialog && lastRegisteredEmail && (
        <InviteResendDialog
          email={lastRegisteredEmail}
          open={showResendDialog}
          onClose={() => setShowResendDialog(false)}
        />
      )}
    </div>
  );
}
