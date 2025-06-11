
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
import { useRouter } from "next/navigation";
import { REGISTERED_STUDENTS_KEY, CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import type { ComponentPropsWithoutRef } from "react"; // For type from student registration

// A simplified student type for what's stored
interface RegisteredStudent {
  studentId: string;
  fullName: string;
  // ... other fields from registration if needed for context
}


const formSchema = z.object({
  studentId: z.string().length(10, { message: "Student ID must be 10 digits." }).regex(/^\d{3}SJM\d{4}$/, { message: "Student ID format is invalid (e.g., 224SJM1234)." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let registeredStudents: RegisteredStudent[] = [];
    if (typeof window !== 'undefined') {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        registeredStudents = studentsRaw ? JSON.parse(studentsRaw) : [];
    }

    const studentExists = registeredStudents.find(
      (student) => student.studentId === values.studentId
    );

    if (!studentExists) {
      toast({
        title: "Login Failed",
        description: "Invalid Student ID or Student not registered. Please contact administration.",
        variant: "destructive",
      });
      return;
    }

    // Mock login
    console.log("Student login attempt:", values);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, studentExists.studentId);
    }
    
    toast({
      title: "Login Successful (Mock)",
      description: `Welcome, ${studentExists.fullName}! Redirecting to dashboard...`,
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push("/student/dashboard");
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
                    <Input placeholder="e.g., 224SJM1234" {...field} maxLength={10} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Authenticating..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

