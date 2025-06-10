
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
import { REGISTERED_TEACHERS_KEY, GRADE_LEVELS } from "@/lib/constants";
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
  email: z.string().email("Invalid email address."),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface RegisteredTeacher extends TeacherFormData {}

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

  const onSubmit = (data: TeacherFormData) => {
    try {
      const existingTeachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      const existingTeachers: RegisteredTeacher[] = existingTeachersRaw ? JSON.parse(existingTeachersRaw) : [];

      if (existingTeachers.some(t => t.email.toLowerCase() === data.email.toLowerCase())) {
        toast({
          title: "Registration Failed",
          description: "This email address is already registered for a teacher.",
          variant: "destructive",
        });
        return;
      }

      existingTeachers.push(data);
      localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(existingTeachers));

      toast({
        title: "Teacher Registered Successfully!",
        description: `Teacher ${data.fullName} (${data.email}) has been registered. Assigned Classes: ${data.assignedClasses.join(', ')}`,
      });
      form.reset();
      setSelectedClasses([]); // Reset selected classes display
    } catch (error) {
      console.error("Failed to save teacher to localStorage", error);
      toast({
        title: "Registration Failed",
        description: "Could not save teacher data. Please try again.",
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
            Fill in the details below to register a new teacher and assign classes.
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
                            onSelect={(e) => e.preventDefault()} // Prevent closing on select
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
