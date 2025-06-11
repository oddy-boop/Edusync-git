
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
import { UserPlus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase"; // auth removed as it's not used here for students
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Schema for student registration (no email/password for Firebase Auth)
const studentSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  gradeLevel: z.string().min(1, "Grade level is required."),
  guardianName: z.string().min(3, "Guardian name must be at least 3 characters."),
  guardianContact: z.string().min(10, "Guardian contact must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  // Email can be optional contact info, not for login
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal("")), 
});

type StudentFormData = z.infer<typeof studentSchema>;

// Student document structure in Firestore (no authUid)
interface StudentDocument {
  studentId: string; // 10-digit application ID, also Firestore document ID
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
  contactEmail?: string; // Optional contact email
  createdAt: any; // Firestore Timestamp
}

export default function RegisterStudentPage() {
  const { toast } = useToast();
  const [generatedStudentId, setGeneratedStudentId] = useState<string | null>(null);

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
    const studentId_10_digit = generateStudentId();
    
    try {
      const newStudentDocument: StudentDocument = {
        studentId: studentId_10_digit,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        gradeLevel: data.gradeLevel,
        guardianName: data.guardianName,
        guardianContact: data.guardianContact,
        ...(data.contactEmail && { contactEmail: data.contactEmail }),
        createdAt: serverTimestamp(),
      };

      const studentDocRef = doc(db, "students", studentId_10_digit);
      await setDoc(studentDocRef, newStudentDocument);

      // Optionally, update local storage if it's used for any immediate local listings
      // For this revert, direct Firestore save is primary.
      // Consider if REGISTERED_STUDENTS_KEY in localStorage needs an update (usually no, teacher/student dashboard fetches from Firestore)

      setGeneratedStudentId(studentId_10_digit);
      toast({
        title: "Student Registered Successfully!",
        description: `Student ${data.fullName} (ID: ${studentId_10_digit}) registered in Firestore.`,
      });
      form.reset();
    } catch (error: any) {
      console.error("RegisterStudentPage: Failed to register student. Error object:", error);
      toast({
        title: "Registration Failed",
        description: `Could not save student to Firestore. ${error.message}`,
        variant: "destructive",
        duration: 9000,
      });
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
            Fill in the details below to register a new student. A 10-digit Student ID will be generated.
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
              <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registering..." : "Register Student"}
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
    