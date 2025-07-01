
"use client";

import React, { useActionState, useRef, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Info, Loader2, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerStudentAction } from "@/lib/actions/student.actions";

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("A valid email is required for student login."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters."),
  guardianContact: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const startsWithPlusRegex = /^\+\d{11,14}$/; 
        const startsWithZeroRegex = /^0\d{9}$/;     
        return startsWithPlusRegex.test(val) || startsWithZeroRegex.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
});

type StudentFormData = z.infer<typeof studentSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  studentId?: string | null;
  temporaryPassword?: string | null;
};

const initialState: ActionResponse = {
  success: false,
  message: "",
  studentId: null,
  temporaryPassword: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register & Invite Student"}
    </Button>
  );
}

export default function RegisterStudentPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [state, formAction] = useActionState(registerStudentAction, initialState);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      email: "",
      dateOfBirth: "",
      gradeLevel: "",
      guardianName: "",
      guardianContact: "",
    },
  });

  // Effect to show toast messages based on form state
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Student Registration Initiated",
          description: state.message,
          duration: 9000
        });
        form.reset();
        formRef.current?.reset();
      } else {
        toast({
          title: "Registration Failed",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, toast, form]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Student
          </CardTitle>
          <CardDescription>
            Creates a Student Profile and sends a login invitation email. The student will set their own password. In development mode, a temporary password will be shown instead.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form ref={formRef} action={formAction}>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter student's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Mail className="mr-1 h-4 w-4"/>Student's Login Email</FormLabel>
                  <FormControl><Input type="email" placeholder="student-login@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
             
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADE_LEVELS.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {/* This hidden input ensures the value is submitted with FormData */}
                    <input type="hidden" name="gradeLevel" value={field.value || ''} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guardian's Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter guardian's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guardian's Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter guardian's contact number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              <SubmitButton />
              {state.success && state.studentId && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 w-full">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
                    Student ID Generated!
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The 10-digit ID for the newly registered student is:{" "}
                    <strong className="font-mono">{state.studentId}</strong>.
                  </AlertDescription>
                </Alert>
              )}
               {state.success && state.temporaryPassword && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 w-full">
                  <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
                    Student Created (Dev Mode)
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The temporary password is:{" "}
                    <strong className="font-mono">{state.temporaryPassword}</strong>.
                    <br/>
                    Please share this securely. The user should change it upon first login.
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
