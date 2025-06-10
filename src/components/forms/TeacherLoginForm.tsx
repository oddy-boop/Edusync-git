
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
import { REGISTERED_TEACHERS_KEY, CURRENTLY_LOGGED_IN_TEACHER_EMAIL } from "@/lib/constants";

interface RegisteredTeacher {
  email: string;
  fullName: string;
  assignedClasses: string[]; // Ensure this matches the structure in registration
  // ... other fields from registration if needed
}

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function TeacherLoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let registeredTeachers: RegisteredTeacher[] = [];
    if (typeof window !== 'undefined') {
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        registeredTeachers = teachersRaw ? JSON.parse(teachersRaw) : [];
    }

    const teacherExists = registeredTeachers.find(
      (teacher) => teacher.email.toLowerCase() === values.email.toLowerCase()
    );

    if (!teacherExists) {
      toast({
        title: "Login Failed",
        description: "Email not registered or incorrect credentials. Please contact administration.",
        variant: "destructive",
      });
      return;
    }
    
    // Password check is omitted for this mock setup as we don't store passwords securely
    // In a real app, you'd verify the hashed password here.

    console.log("Teacher login attempt:", values);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENTLY_LOGGED_IN_TEACHER_EMAIL, teacherExists.email);
    }
    
    toast({
      title: "Login Successful (Mock)",
      description: `Welcome back, ${teacherExists.fullName}! Redirecting to dashboard...`,
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push("/teacher/dashboard");
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
