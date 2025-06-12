
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
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { db } from "@/lib/firebase"; // Import Firestore db
import { doc, getDoc } from "firebase/firestore";

// Schema for 10-digit Student ID (e.g., 224SJM1234)
const formSchema = z.object({
  studentId: z.string()
    .min(10, { message: "Student ID must be 10 characters." })
    .max(10, { message: "Student ID must be 10 characters." })
    .regex(/^\d{3}SJM\d{4}$/, { message: "Student ID format is invalid (e.g., 224SJM1234)." }),
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
    try {
      const studentDocRef = doc(db, "students", values.studentId);
      const studentDocSnap = await getDoc(studentDocRef);

      if (studentDocSnap.exists()) {
        // Student found in Firestore
        const studentData = studentDocSnap.data();
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, values.studentId);
        }
        toast({
          title: "Login Successful",
          description: `Welcome, ${studentData.fullName || values.studentId}! Redirecting to dashboard...`,
        });
        router.push("/student/dashboard");
      } else {
        // Student ID not found in Firestore
        toast({
          title: "Login Failed",
          description: "Student ID not found. Please verify your ID or contact administration.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Student login error details:", error); // More detailed error logging
      let description = "An error occurred during login. Please try again.";
      if (error.message) {
        description = `Login error: ${error.message}. Please try again or contact support.`;
      }
      toast({
        title: "Login Failed",
        description: description,
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
