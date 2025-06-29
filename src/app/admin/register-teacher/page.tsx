
"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

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
import { registerTeacherAction } from "@/lib/actions/admin.actions";

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string()
    .min(10, "Contact number must be at least 10 digits.")
    .refine(
      (val) => {
        const internationalFormat = /^\+\d{11,14}$/;
        const localFormat = /^0\d{9}$/;
        return internationalFormat.test(val) || localFormat.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX or 0XXXXXXXXX."
      }
    ),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

export default function RegisterTeacherPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function onSubmit(data: TeacherFormData) {
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else {
        formData.append(key, value as string);
      }
    });

    const result = await registerTeacherAction(null, formData);
    
    setIsSubmitting(false);

    if (result?.message && Object.keys(result.errors || {}).length === 0) {
      toast({
        title: "Teacher Registered Successfully!",
        description: result.message,
        duration: 9000,
      });
      form.reset();
      setSelectedClasses([]);
    } else if (result?.message) {
      toast({
        title: "Registration Failed",
        description: result.message,
        variant: "destructive",
        duration: 12000,
      });
    }
  }

  const handleClassToggle = (grade: string) => {
    const newSelectedClasses = selectedClasses.includes(grade)
      ? selectedClasses.filter((c) => c !== grade)
      : [...selectedClasses, grade];
    setSelectedClasses(newSelectedClasses);
    form.setValue("assignedClasses", newSelectedClasses, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Teacher
          </CardTitle>
          <CardDescription>
            This form creates a new teacher account. The teacher will use the provided email and password to log into the portal.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Enter teacher's full name" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address (for Login)</FormLabel>
                    <FormControl><Input type="email" placeholder="teacher@example.com" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center"><KeyRound className="mr-1 h-4 w-4"/>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Create a password" {...field} /></FormControl>
                    <FormMessage /></FormItem>)} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirm Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Confirm your password" {...field} /></FormControl>
                    <FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="subjectsTaught" render={({ field }) => (
                  <FormItem><FormLabel>Main Subjects Taught</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Mathematics, English Language" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem><FormLabel>Contact Number</FormLabel>
                    <FormControl><Input placeholder="Enter teacher's contact number" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="assignedClasses" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Assign Classes</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="justify-between">
                          {selectedClasses.length > 0 ? `${selectedClasses.length} class(es) selected` : "Select classes"}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                        <DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel><DropdownMenuSeparator />
                        {GRADE_LEVELS.map((grade) => (
                          <DropdownMenuCheckboxItem key={grade} checked={selectedClasses.includes(grade)} onCheckedChange={() => handleClassToggle(grade)} onSelect={(e) => e.preventDefault()}>
                            {grade}
                          </DropdownMenuCheckboxItem>))}
                      </DropdownMenuContent>
                    </DropdownMenu><FormMessage /></FormItem>)} />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Teacher"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
