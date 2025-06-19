
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
import { UserPlus, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSupabase } from "@/lib/supabaseClient";

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters."),
  guardianContact: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const startsWithPlusRegex = /^\+\d{11,14}$/; // e.g., +233 and 9-10 digits (total 12-13 for +233), or other country codes
        const startsWithZeroRegex = /^0\d{9}$/;     // e.g., 053 and 7 digits
        return startsWithPlusRegex.test(val) || startsWithZeroRegex.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX (12-15 digits total) or 0XXXXXXXXX (10 digits total)."
      }
    ),
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal("")),
});

type StudentFormData = z.infer<typeof studentSchema>;

// Interface for data being sent to Supabase (matches table columns)
interface StudentSupabaseData {
  student_id_display: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string;
  // created_at and updated_at are handled by Supabase
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
      dateOfBirth: "",
      gradeLevel: "",
      guardianName: "",
      guardianContact: "",
      contactEmail: "",
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
    const studentId_10_digit = generateStudentId();

    const studentToSave: StudentSupabaseData = {
      student_id_display: studentId_10_digit,
      full_name: data.fullName,
      date_of_birth: data.dateOfBirth,
      grade_level: data.gradeLevel,
      guardian_name: data.guardianName,
      guardian_contact: data.guardianContact,
      ...(data.contactEmail && { contact_email: data.contactEmail }),
    };

    try {
      const { data: insertedData, error } = await supabase.from("students").insert([studentToSave]).select();

      if (error) {
        let userMessage = "Could not register student. An unknown error occurred."; // Default user message
        const supabaseError = error as any; // Type assertion for easier property access

        // Log detailed error structure for debugging
        let errorDetailsForLog = "Could not stringify error object.";
        try {
          errorDetailsForLog = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetailsForLog = String(error);
        }
        console.error(
          "RegisterStudentPage: Supabase error inserting student. Raw error details:", 
          errorDetailsForLog, 
          "Original error object was:", 
          error // Log the original object too, console might handle it well
        );

        // Determine user-facing message
        if (supabaseError && typeof supabaseError.message === 'string' && supabaseError.message.trim() !== "") {
          const actualErrorMessage = supabaseError.message;
          if (actualErrorMessage.includes("duplicate key value violates unique constraint")) {
            if (actualErrorMessage.includes("students_student_id_display_key")) {
              userMessage = `The generated Student ID ${studentId_10_digit} already exists. This is rare. Please try submitting again.`;
            } else {
              userMessage = "A student with similar unique details (like email if enforced) might already exist.";
            }
          } else if (String(supabaseError.code) === '42501' || actualErrorMessage.includes("violates row-level security policy")) {
            userMessage = "Registration failed due to database permissions (RLS). Please ensure the admin role has necessary INSERT and SELECT permissions on the 'students' table.";
          } else {
            userMessage = actualErrorMessage; // Use Supabase message directly
          }
        } else {
          // Fallback if error.message isn't useful, strongly suggest RLS
          console.warn("RegisterStudentPage: Supabase error object did not have a usable .message property. Assuming RLS/permission issue. Full error logged above.");
          userMessage = "Registration failed. This may be due to database permissions (RLS) or an unknown database issue. Ensure the admin role has INSERT and SELECT permissions on the 'students' table. Check server console for details.";
        }

        toast({
          title: "Registration Failed",
          description: userMessage,
          variant: "destructive",
          duration: 9000, 
        });
        setIsSubmitting(false);
        return; // Crucial: stop execution here
      }

      if (insertedData && insertedData.length > 0) {
        setGeneratedStudentId(studentId_10_digit);
        toast({
          title: "Student Registered Successfully!",
          description: `Student ${data.fullName} (ID: ${studentId_10_digit}) registered in Supabase.`,
        });
        form.reset();
      } else {
        console.warn("RegisterStudentPage: Insert operation returned no data and no error. This could indicate an RLS SELECT issue after a successful INSERT, or the insert itself was silently blocked by RLS 'WITH CHECK' but did not return an error object.");
        toast({
          title: "Registration Status Unknown",
          description: "The student may or may not have been registered. Please verify in the user management list. This could be an RLS SELECT permission issue.",
          variant: "default",
          duration: 10000,
        });
      }
    } catch (error: any) {
      // This catch block is for truly unexpected errors in the onSubmit flow itself,
      // not for the `error` object returned by the Supabase client library if that was handled by `if (error)`.
      console.error("RegisterStudentPage: General error during student registration process:", error);
      toast({
        title: "Registration Failed",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}. Please contact support.`,
        variant: "destructive",
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
            Fill in the details below to register a new student. A 10-digit Student ID will be generated and data saved to Supabase.
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
               <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="student-contact@example.com" {...field} />
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
                    Data saved to Supabase.
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

