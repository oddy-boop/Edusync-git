
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
import { UserPlus, ChevronDown, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/lib/constants";
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
import { getSupabase } from "@/lib/supabaseClient";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters for local storage."),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

// Interface for data being sent to Supabase (matches table columns)
interface TeacherSupabaseData {
  full_name: string;
  email: string;
  password?: string; // For prototype storage
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
  // created_at and updated_at are handled by Supabase, id is auto-generated UUID
}

export default function RegisterTeacherPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "", // Password for local record
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
    setIsSubmitting(true);
    
    const teacherToSave: TeacherSupabaseData = {
      full_name: data.fullName,
      email: data.email,
      password: data.password, // Storing plaintext password for prototype
      contact_number: data.contactNumber,
      subjects_taught: data.subjectsTaught,
      assigned_classes: data.assignedClasses,
    };

    try {
      const { data: insertedData, error } = await supabase.from("teachers").insert([teacherToSave]).select();

      if (error) {
        console.error("RegisterTeacherPage: Supabase error inserting teacher:", error);
        let userMessage = "Could not register teacher profile.";
        if (error.message.includes("duplicate key value violates unique constraint")) {
            if (error.message.includes("teachers_email_key")) {
                userMessage = "This email address is already registered.";
                form.setError("email", { type: "manual", message: userMessage });
            } else {
                userMessage = "A teacher with similar unique details might already exist.";
            }
        } else {
            userMessage = error.message;
        }
        toast({
          title: "Registration Failed",
          description: userMessage,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Teacher Profile Registered!",
        description: `Teacher ${data.fullName} profile and credentials saved to Supabase.`,
      });
      form.reset();
      setSelectedClasses([]);
    } catch (error: any) {
      console.error("RegisterTeacherPage: General error during teacher registration:", error);
      toast({
        title: "Registration Failed",
        description: `An unexpected error occurred: ${error.message}`,
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
            <UserPlus className="mr-2 h-6 w-6" /> Register New Teacher Profile
          </CardTitle>
          <CardDescription>
            Fill in the details below to register a new teacher profile. Data (including password for local prototype use) saved to Supabase.
             <br/>
            <strong className="text-destructive/80">Note: For this prototype, passwords are stored in plaintext in Supabase. Do not use real passwords.</strong>
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password (for local records)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a password" {...field} />
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
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Teacher Profile"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
