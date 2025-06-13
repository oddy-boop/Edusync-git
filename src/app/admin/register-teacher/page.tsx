
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, REGISTERED_TEACHERS_KEY } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role: string;
  createdAt: string;
}

export default function RegisterTeacherPage() {
  const { toast } = useToast();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      subjectsTaught: "",
      contactNumber: "",
      assignedClasses: [],
    },
  });

  const handleClassToggle = (grade: string) => {
    const newSelectedClasses = selectedClasses.includes(grade)
      ? selectedClasses.filter((c) => c !== grade)
      : [...selectedClasses, grade];
    setSelectedClasses(newSelectedClasses);
    form.setValue("assignedClasses", newSelectedClasses, { shouldValidate: true });
  };

  const onSubmit = async (data: TeacherFormData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, {
          displayName: data.fullName,
        });
      }

      const teacherProfileForStorage: TeacherProfile = {
        uid: user.uid,
        fullName: data.fullName,
        email: data.email,
        subjectsTaught: data.subjectsTaught,
        contactNumber: data.contactNumber,
        assignedClasses: data.assignedClasses,
        role: "teacher",
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        let existingTeachers: TeacherProfile[] = [];
        const existingTeachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        if (existingTeachersRaw) {
          try {
            const parsed = JSON.parse(existingTeachersRaw);
            if (Array.isArray(parsed)) {
              existingTeachers = parsed;
            } else {
              console.warn("REGISTERED_TEACHERS_KEY in localStorage was not an array during registration. Resetting to empty array for this operation.");
              toast({
                title: "Data Warning",
                description: "Previous teacher list in local storage was corrupted; starting fresh for teachers.",
                variant: "default",
                duration: 7000,
              });
            }
          } catch (parseError) {
            console.error("Error parsing existing teachers from localStorage during registration. Resetting to empty array.", parseError);
            toast({
                title: "Data Corruption",
                description: "Could not read previous teacher list from local storage due to corruption. It will be reset.",
                variant: "destructive",
                duration: 7000,
              });
          }
        }
        
        existingTeachers.push(teacherProfileForStorage);
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(existingTeachers));
      }

      toast({
        title: "Teacher Registered Successfully!",
        description: `Teacher ${data.fullName} (${data.email}) registered with Firebase Auth. Profile saved to localStorage. Assigned Classes: ${data.assignedClasses.join(', ')}`,
      });
      form.reset();
      setSelectedClasses([]);
    } catch (error: any) {
      console.error("Failed to register teacher:", error);
      let errorMessage = "Could not save teacher data. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already registered in Firebase.";
        form.setError("email", {
          type: "manual",
          message: "This email address is already registered. Please use a different email.",
        });
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
        form.setError("password", {
          type: "manual",
          message: "Password is too weak. Please choose a stronger one (at least 6 characters).",
        });
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Teacher
          </CardTitle>
          <CardDescription>
            Fill in the details below to register a new teacher. Account created in Firebase Auth, profile data in local storage.
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
                      <Input placeholder="Enter teacher's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Login ID)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="teacher@example.com" {...field} />
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
                    <FormLabel>Initial Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Set an initial password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Initial Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm initial password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectsTaught"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Subjects Taught</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Mathematics, English Language, Integrated Science" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter teacher's contact number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedClasses"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assign Classes</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="justify-between">
                          {selectedClasses.length > 0 ? `${selectedClasses.length} class(es) selected` : "Select classes"}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                        <DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {GRADE_LEVELS.map((grade) => (
                          <DropdownMenuCheckboxItem
                            key={grade}
                            checked={selectedClasses.includes(grade)}
                            onCheckedChange={() => handleClassToggle(grade)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {grade}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Registering..." : "Register Teacher"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
