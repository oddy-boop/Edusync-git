
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
// Firebase Auth imports removed
// import { auth } from "@/lib/firebase";
// import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address. This will be used for informational purposes and potential future non-Firebase login systems."),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherProfile {
  uid: string; // Will be locally generated
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
        
        // Check if email already exists in localStorage (since Firebase check is removed)
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
        description: `Teacher ${data.fullName} (${data.email}) profile saved to localStorage. Assigned Classes: ${data.assignedClasses.join(', ')}`,
      });
      form.reset();
      setSelectedClasses([]);
    } catch (error: any) {
      console.error("Teacher Registration Error (localStorage):", error.message);
      let errorMessage = "Could not save teacher data to localStorage. Please try again.";
      // No Firebase specific error codes to check now
      toast({
        title: "Registration Failed",
        description: `${errorMessage} Details: ${error.message}`,
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
            Fill in the details below to register a new teacher. Profile data saved to local browser storage.
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
                     <p className="text-xs text-muted-foreground pt-1">
                       This email will be used for informational purposes. Login credentials are not created with this form.
                     </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Password fields removed */}
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
