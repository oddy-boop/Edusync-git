
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
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient"; // Import Supabase client

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
  const supabase = getSupabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      rememberMe: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window === 'undefined') {
        toast({
          title: "Login Error",
          description: "Cannot access local storage. Login unavailable.",
          variant: "destructive",
        });
        return;
      }

      // Query Supabase for the student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('student_id_display, full_name')
        .eq('student_id_display', values.studentId)
        .single();

      if (studentError && studentError.code !== 'PGRST116') { // PGRST116 means no rows found, which is a valid "not found" case
        console.error("Student login error (Supabase query):", studentError);
        toast({
          title: "Login Failed",
          description: "An error occurred while verifying your ID. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (studentData) {
        // Clear any previous student login IDs
        localStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
        sessionStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);

        if (values.rememberMe) {
          localStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, values.studentId);
        } else {
          sessionStorage.setItem(CURRENTLY_LOGGED_IN_STUDENT_ID, values.studentId);
        }
        toast({
          title: "Login Successful",
          description: `Welcome, ${studentData.full_name || values.studentId}! Redirecting to dashboard...`,
        });
        router.push("/student/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: "Student ID not found in records. Please verify your ID or contact administration.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Student login error (General):", error);
      toast({
        title: "Login Failed",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}. Please try again.`,
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
