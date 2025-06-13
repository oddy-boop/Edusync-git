
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
import { KeyRound } from "lucide-react";

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  password?: string; // Added password field
}

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
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
    try {
      if (typeof window !== 'undefined') {
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
        
        const teacherData = allTeachers.find(
          (teacher) => teacher.email.toLowerCase() === values.email.toLowerCase()
        );

        if (teacherData) {
          // Check password
          if (teacherData.password === values.password) {
            localStorage.setItem(TEACHER_LOGGED_IN_UID_KEY, teacherData.uid);
            toast({
              title: "Login Successful",
              description: `Welcome back, ${teacherData.fullName || teacherData.email}! Redirecting to dashboard...`,
            });
            router.push("/teacher/dashboard");
          } else {
             toast({
              title: "Login Failed",
              description: "Incorrect password. Please try again.",
              variant: "destructive",
            });
          }
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
                For this prototype, passwords are checked against values stored directly in your browser's local storage.
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
