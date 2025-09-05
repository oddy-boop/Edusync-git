
"use client";

import { useState } from "react";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, KeyRound } from "lucide-react";
import AuthFooterNote from "@/components/shared/AuthFooterNote";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  loginId: z.string().min(1, "Email or Student ID is required.").trim(),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export function StudentLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  let schoolId = searchParams.get('schoolId');
  if (!schoolId) {
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        const sel = JSON.parse(raw);
        schoolId = sel?.id?.toString();
      }
    } catch (e) {
      // ignore
    }
  }
  const [loginError, setLoginError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  // allow login without explicit query param when branch stored in localStorage

  const handleInputChange = () => {
    if (loginError) {
      setLoginError(null);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);

    try {
      let emailToLogin = values.loginId;
      // If it's not an email, assume it's a student ID and look up the email.
      if (!values.loginId.includes('@')) {
        const rawId = String(values.loginId || '').trim();
        const normalizedId = rawId.toUpperCase();

        console.log('Student ID Login Debug:', {
          rawInput: values.loginId,
          rawId: rawId,
          normalizedId: normalizedId,
          schoolId: schoolId
        });

        try {
          // Test if we can access students table at all (without school filter)
          const { data: anyStudents, error: anyError } = await supabase
            .from('students')
            .select('student_id_display, contact_email, school_id')
            .limit(5);

          console.log('Test Students Table Access:', {
            canAccessTable: !anyError,
            anyError: anyError,
            anyStudentsFound: anyStudents?.length || 0,
            anyStudents: anyStudents
          });

          // First, let's see what student records exist for this school
          const { data: allStudents, error: allError } = await supabase
            .from('students')
            .select('student_id_display, contact_email')
            .eq('school_id', schoolId)
            .limit(10);

          console.log('All Students in School Debug:', {
            schoolId: schoolId,
            studentsFound: allStudents?.length || 0,
            studentIds: allStudents?.map(s => s.student_id_display) || [],
            allStudents: allStudents
          });

          // Try exact normalized match first
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('contact_email, student_id_display')
            .eq('student_id_display', normalizedId)
            .eq('school_id', schoolId)
            .maybeSingle();

          console.log('Student Lookup Debug:', {
            studentFound: !!student,
            student: student,
            studentError: studentError,
            hasEmail: !!student?.contact_email
          });

          if (!studentError && student && student.contact_email) {
            console.log('Exact match found, using email:', student.contact_email);
            emailToLogin = student.contact_email;
          } else {
            console.log('No exact match, trying fuzzy search...');
            // Try a tolerant fuzzy match (case-insensitive, partial)
            const { data: fuzzyData, error: fuzzyError } = await supabase
              .from('students')
              .select('contact_email, student_id_display')
              .ilike('student_id_display', `%${rawId}%`)
              .eq('school_id', schoolId)
              .limit(1);

            console.log('Fuzzy Search Debug:', {
              fuzzyDataFound: fuzzyData?.length || 0,
              fuzzyData: fuzzyData,
              fuzzyError: fuzzyError
            });

            const fuzzy = Array.isArray(fuzzyData) && fuzzyData.length > 0 ? fuzzyData[0] : null;
            if (!fuzzyError && fuzzy && fuzzy.contact_email) {
              console.log('Fuzzy match found, using email:', fuzzy.contact_email);
              emailToLogin = fuzzy.contact_email;
              toast({ title: 'Student match found', description: `Using student ID ${fuzzy.student_id_display}. If this is incorrect contact your admin.`, });
            } else {
              // If a student row exists but lacks an email, give a specific message
              if (!studentError && student && !student.contact_email) {
                setLoginError('Student record found but no email is associated with this student. Ask your school admin to add an email.');
                return;
              }

              setLoginError('Student ID not found for the selected branch. Try entering the full ID or contact your school admin.');
              return;
            }
          }
        } catch (e) {
          console.error('Student lookup error:', e);
          setLoginError('Error looking up student. Please try again.');
          return;
        }
      }
      
      const { data: userResponse, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToLogin.toLowerCase(),
        password: values.password,
      });

      if (signInError) throw signInError;
      
      // Verify user role and school association after login
      const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role, school_id')
            .eq('user_id', userResponse.user.id)
            .eq('school_id', schoolId)
            .single();
            
      if(roleError || !roleData || roleData.role !== 'student') {
          await supabase.auth.signOut();
          throw new Error("This student account is not associated with the selected school branch.");
      }
      
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
      router.push('/student/dashboard');

    } catch (error: any) {
        if(error.message && error.message.toLowerCase().includes('failed to fetch')) {
            setLoginError("You are offline. Please check your internet connection and try again.");
        } else {
            setLoginError(error.message || `An unexpected error occurred.`);
        }
    }
  }

  return (
    <div className="w-full">
      <Card className="shadow-xl w-full md:rounded-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="loginId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Student ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your email or student ID" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
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
                  <FormLabel className="flex items-center">
                    <KeyRound className="mr-1 h-4 w-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleInputChange();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Verifying...</> : "Login"}
            </Button>
            <Link href={`/auth/forgot-password?schoolId=${schoolId}`}
                className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
                Forgot Password?
            </Link>
      <AuthFooterNote>
        Login uses the school's authentication system. Ensure your admin has registered you.
      </AuthFooterNote>
          </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
