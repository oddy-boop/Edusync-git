
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
import { UserPlus, ChevronDown, KeyRound } from "lucide-react";
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

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address. This will be used for informational purposes and potential future non-Firebase login systems."),
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
  password?: string; // Password will be stored (plaintext for prototype)
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

  const generateLocalTeacherUid = () => {
    return `TEA-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const onSubmit = async (data: TeacherFormData) => {
    try {
      const teacherUid = generateLocalTeacherUid();

      const teacherProfileForStorage: TeacherProfile = {
        uid: teacherUid,
        fullName: data.fullName,
        email: data.email,
        password: data.password, // Storing password
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
            }
          } catch (parseError) {
            console.error("Error parsing existing teachers from localStorage during registration. Resetting to empty array.", parseError);
          }
        }
        
        if (existingTeachers.some(teacher => teacher.email.toLowerCase() === data.email.toLowerCase())) {
          form.setError("email", {
            type: "manual",
            message: "This email address is already registered locally. Please use a different email.",
          });
          toast({
            title: "Registration Failed",
            description: "This email address is already registered in local records.",
            variant: "destructive",
          });
          return;
        }

        existingTeachers.push(teacherProfileForStorage);
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(existingTeachers));
      }

      toast({
        title: "Teacher Registered Successfully!",
        description: `Teacher ${data.fullName} (${data.email}) profile and credentials saved to localStorage.`,
      });
      form.reset();
      setSelectedClasses([]);
    } catch (error: any) {
      console.error("Teacher Registration Error (localStorage):", error.message);
      toast({
        title: "Registration Failed",
        description: `Could not save teacher data to localStorage. Details: ${error.message}`,
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
            Fill in the details below to register a new teacher. Profile and credentials data saved to local browser storage.
            <br/>
            <strong className="text-destructive/80">Note: For this prototype, passwords are stored in plaintext in localStorage. Do not use real passwords.</strong>
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="teacher@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Create a password" {...field} />
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
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                {form.formState.isSubmitting ? "Registering..." : "Register Teacher Profile"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
