
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
import { REGISTERED_TEACHERS_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  // other fields if they exist in your localStorage structure
}

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (typeof window !== 'undefined') {
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
        
        const teacherData = allTeachers.find(
          (teacher) => teacher.email.toLowerCase() === values.email.toLowerCase()
        );

        if (teacherData) {
          localStorage.setItem(TEACHER_LOGGED_IN_UID_KEY, teacherData.uid);
          toast({
            title: "Login Successful",
            description: `Welcome back, ${teacherData.fullName || teacherData.email}! Redirecting to dashboard...`,
          });
          router.push("/teacher/dashboard");
        } else {
          toast({
            title: "Login Failed",
            description: "Email address not found in registered teacher records. Please contact an administrator.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Error",
          description: "localStorage is not available.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Teacher login error:", error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="teacher@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Password field and Remember Me checkbox are removed */}
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
