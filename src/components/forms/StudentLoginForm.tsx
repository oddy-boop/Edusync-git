
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CURRENTLY_LOGGED_IN_STUDENT_ID, REGISTERED_STUDENTS_KEY } from "@/lib/constants";
// Firebase db import removed
// import { db } from "@/lib/firebase";
// import { doc, getDoc } from "firebase/firestore";

interface StudentDocument { // Mirroring the structure in register-student
  studentId: string;
  fullName: string;
  // ... other fields if needed for display, but only studentId and fullName are used here
}

const formSchema = z.object({
  studentId: z.string()
    .min(10, { message: "Student ID must be 10 characters." })
    .max(10, { message: "Student ID must be 10 characters." })
    .regex(/^\d{3}SJM\d{4}$/, { message: "Student ID format is invalid (e.g., 224SJM1234)." }),
  rememberMe: z.boolean().optional().default(false),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      rememberMe: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window !== 'undefined') {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const allStudents: StudentDocument[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const studentData = allStudents.find(s => s.studentId === values.studentId);

        if (studentData) {
          localStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
          sessionStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);

          if (values.rememberMe) {
            localStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, values.studentId);
          } else {
            sessionStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, values.studentId);
          }
          toast({
            title: "Login Successful",
            description: `Welcome, ${studentData.fullName || values.studentId}! Redirecting to dashboard...`,
          });
          router.push("/student/dashboard");
        } else {
          toast({
            title: "Login Failed",
            description: "Student ID not found in local records. Please verify your ID or contact administration.",
            variant: "destructive",
          });
        }
      } else {
        toast({
            title: "Login Error",
            description: "Cannot access local storage. Login unavailable.",
            variant: "destructive",
          });
      }
    } catch (error: any) {
      console.error("Student login error details:", error);
      toast({
        title: "Login Failed",
        description: `An error occurred: ${error.message}. Please try again.`,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="shadow-xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>10-Digit Student ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 224SJM1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="rememberMeStudent"
                    />
                  </FormControl>
                  <FormLabel htmlFor="rememberMeStudent" className="font-normal cursor-pointer">
                    Remember me
                  </FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
