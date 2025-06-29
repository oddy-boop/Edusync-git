
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Info, Loader2, KeyRound, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabase } from "@/lib/supabaseClient";

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("A valid email is required for student login."),
  password: z.string().min(6, "Password must be at least 6 characters."),
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

interface StudentSupabaseData {
  auth_user_id: string;
  student_id_display: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string;
}

export default function RegisterStudentPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const [generatedStudentId, setGeneratedStudentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      dateOfBirth: "",
      gradeLevel: "",
      guardianName: "",
      guardianContact: "",
    },
  });

  const generateStudentId = (): string => {
    const year = new Date().getFullYear();
    const yearCode = "2" + (year % 100).toString().padStart(2, '0');
    const schoolInitials = "SJM";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${yearCode}${schoolInitials}${randomSuffix}`;
  };

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    setGeneratedStudentId(null);
    let authUserId: string | null = null;

    // Store the admin's current session before it gets replaced by signUp.
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) {
      toast({ title: "Authentication Error", description: "Could not verify admin session. Please log in again.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Step 1: Create the user. This signs in the new user, replacing the admin's session.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { 
            full_name: data.fullName,
          },
        }
      });

      // Immediately restore the admin's session to perform the next action.
      await supabase.auth.setSession(adminSession);

      if (authError) {
        throw new Error(`Auth Error: ${authError.message}`);
      }
      if (!authData.user) {
        throw new Error("Auth user was not created, but no error was returned.");
      }
      authUserId = authData.user.id;
      
      // Step 1.5: Assign the 'student' role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authUserId, role: 'student' });

      if (roleError) {
        throw new Error(`Role Assignment Error: ${roleError.message}. The auth user was created but their 'student' role could not be assigned. Please manually delete the user with email '${data.email}' before trying again.`);
      }


      // Step 2: Now authenticated as admin, create the student profile.
      const studentId_10_digit = generateStudentId();
      const studentToSave: StudentSupabaseData = {
        auth_user_id: authUserId,
        student_id_display: studentId_10_digit,
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        grade_level: data.gradeLevel,
        guardian_name: data.guardianName,
        guardian_contact: data.guardianContact,
        contact_email: data.email,
      };

      const { data: insertedData, error: profileError } = await supabase
        .from("students")
        .insert([studentToSave])
        .select();

      if (profileError) {
        throw new Error(`Profile Error: ${profileError.message}`);
      }

      setGeneratedStudentId(studentId_10_digit);
      
      let toastDescription = `Student ${data.fullName} (ID: ${studentId_10_digit}) and their login account have been created.`;
      const isConfirmationRequired = authData.user.identities && authData.user.identities.length > 0 && authData.user.email_confirmed_at === null;

      if (isConfirmationRequired) {
        toastDescription += " A confirmation email has been sent. Please check their inbox (and spam folder) to verify the account.";
      } else {
        toastDescription += " They can now log in directly.";
      }
      
      toast({
        title: "Student Registered Successfully!",
        description: toastDescription,
        duration: 9000
      });
      form.reset();

    } catch (error: any) {
      console.error("RegisterStudentPage: Error during registration process:", error);
      
      if (authUserId) {
        console.error("CRITICAL: An auth user was created but the student profile could not be. Manual cleanup required for auth user ID:", authUserId);
        error.message += ` | An auth user was created but their profile could not be. Please manually delete the user with email '${data.email}' from the authentication system and try again.`;
      }

      toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Check console for details.",
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Student
          </CardTitle>
          <CardDescription>
            Creates a Student Profile and a login account. Student ID is auto-generated.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
              <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Mail className="mr-1 h-4 w-4"/>Student's Login Email</FormLabel>
                      <FormControl><Input type="email" placeholder="student-login@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Initial Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Create a temporary password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
              </div>
             
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Student"}
              </Button>
              {generatedStudentId && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
                    Student ID Generated!
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The 10-digit ID for the newly registered student is:{" "}
                    <strong className="font-mono">{generatedStudentId}</strong>.
                    If email verification is enabled, an email has been sent.
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
