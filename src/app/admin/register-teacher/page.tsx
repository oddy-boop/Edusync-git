
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
import { UserPlus, ChevronDown, KeyRound, Loader2, ShieldAlert, Info } from "lucide-react";
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
import type { AuthError } from "@supabase/supabase-js";

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
        const internationalFormat = /^\+\d{11,14}$/; // e.g., +233530466330 (12 digits for +233)
        const localFormat = /^0\d{9}$/; // e.g., 0530466330 (10 digits)
        return internationalFormat.test(val) || localFormat.test(val);
      },
      {
        message: "Invalid phone. Expecting format like +233XXXXXXXXX (12-15 digits total) or 0XXXXXXXXX (10 digits total)."
      }
    ),
  assignedClasses: z.array(z.string()).min(1, "At least one class must be assigned."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface TeacherSupabaseData {
  auth_user_id: string; 
  full_name: string;
  email: string; 
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
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
    setIsSubmitting(true);
    let authUserId: string | null = null;
    let emailRedirectUrl = '';
    if (typeof window !== 'undefined') {
      emailRedirectUrl = `${window.location.origin}/auth/teacher/login`;
    }

    // Store the admin's current session before it gets replaced by signUp.
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) {
      toast({ title: "Authentication Error", description: "Could not verify admin session. Please log in again.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { 
            full_name: data.fullName,
          },
          emailRedirectTo: emailRedirectUrl,
        }
      });
      
      // Immediately restore the admin's session to perform the next action.
      await supabase.auth.setSession(adminSession);

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Authentication user was not created, but no specific error returned.");
      }
      
      authUserId = authData.user.id;

      const teacherProfileToSave: TeacherSupabaseData = {
        auth_user_id: authUserId,
        full_name: data.fullName,
        email: data.email, 
        contact_number: data.contactNumber,
        subjects_taught: data.subjectsTaught,
        assigned_classes: data.assignedClasses,
      };

      const { error: profileInsertError } = await supabase
        .from("teachers")
        .insert([teacherProfileToSave])
        .select()
        .single();

      if (profileInsertError) {
        console.error("CRITICAL: An auth user was created for a teacher but the profile could not be. Manual cleanup required for auth user ID:", authUserId);
        throw new Error(`Profile creation error: ${profileInsertError.message}. IMPORTANT: An authentication user was created but their profile was not. You must manually delete the user with email '${data.email}' from the authentication system before trying again.`);
      }

      let toastDescription = `Teacher ${data.fullName} registered. Their login account has been created and their profile saved.`;
      const isConfirmationRequired = authData.user.identities && authData.user.identities.length > 0 && authData.user.email_confirmed_at === null;

      if (isConfirmationRequired) {
        toastDescription += " A confirmation email has been sent. Please check their inbox (and spam folder) to verify their account before logging in.";
      } else {
        toastDescription += " They can now log in directly.";
      }

      toast({
        title: "Teacher Registered Successfully!",
        description: toastDescription,
        duration: 9000, 
      });
      form.reset();
      setSelectedClasses([]);

    } catch (error: any) {
      console.error("RegisterTeacherPage: General error during teacher registration:", error);
      let userMessage = `An unexpected error occurred: ${error.message}`;
      if (error.message.includes("User already registered")) {
          userMessage = "This email address is already registered. Please use a different email or log in.";
      } else if (error.message.includes("Password should be at least 6 characters")) {
          userMessage = "The password is too weak. Please use at least 6 characters.";
      } else if (error.message.includes("violates foreign key constraint")) {
          userMessage = "Database Error: Could not link teacher profile to auth user. Please contact admin.";
      }

      toast({
        title: "Registration Failed",
        description: userMessage,
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
