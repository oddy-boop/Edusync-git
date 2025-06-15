
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
  password: z.string().min(6, "Password must be at least 6 characters for Supabase Auth."),
  confirmPassword: z.string(),
  subjectsTaught: z.string().min(3, "Please list at least one subject area."),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits.").regex(/^\\+?[0-9\\s\\-()]+$/, "Invalid phone number format."),
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
    let emailRedirectUrl = '';
    if (typeof window !== 'undefined') {
      // Redirect to the teacher login page after email confirmation
      emailRedirectUrl = `${window.location.origin}/auth/teacher/login`;
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { 
            full_name: data.fullName,
          },
          emailRedirectTo: emailRedirectUrl, // Added redirect URL
        }
      });

      if (authError) {
        console.error("RegisterTeacherPage: Supabase Auth signUp error:", authError);
        let userMessage = "Could not create teacher's authentication account.";
        if (authError.message.includes("User already registered") || authError.message.includes("already exists")) {
            userMessage = "This email address is already registered as an authentication user.";
            form.setError("email", { type: "manual", message: userMessage });
        } else if (authError.message.includes("Password should be at least 6 characters")) {
            userMessage = "The password is too weak for Supabase Auth.";
        } else if (authError.message.toLowerCase().includes("rate limit exceeded")) {
            userMessage = "Too many registration attempts. Please try again later.";
        } else {
            userMessage = authError.message;
        }
        toast({ title: "Auth Creation Failed", description: userMessage, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast({ title: "Auth Creation Issue", description: "Authentication user was not created, but no specific error returned. Please check Supabase logs.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      const authUserId = authData.user.id;

      const teacherProfileToSave: TeacherSupabaseData = {
        auth_user_id: authUserId,
        full_name: data.fullName,
        email: data.email, 
        contact_number: data.contactNumber,
        subjects_taught: data.subjectsTaught,
        assigned_classes: data.assignedClasses,
      };

      const { data: insertedProfileData, error: profileInsertError } = await supabase
        .from("teachers")
        .insert([teacherProfileToSave])
        .select()
        .single();

      if (profileInsertError) {
        console.error("RegisterTeacherPage: Supabase error inserting teacher profile:", profileInsertError);
        
        try {
          const { error: adminDeleteError } = await supabase.auth.admin.deleteUser(authUserId);
          if (adminDeleteError) {
            console.warn("RegisterTeacherPage: Failed to roll back Supabase Auth user after profile insert failure. Manual cleanup of auth user may be needed for ID:", authUserId, "Error:", adminDeleteError.message);
          } else {
            console.warn("RegisterTeacherPage: Rolled back Supabase Auth user due to profile insert failure. Auth User ID:", authUserId);
          }
        } catch (rollbackError: any) {
           console.error("RegisterTeacherPage: Exception during Auth user rollback:", rollbackError.message);
        }
        
        let userMessage = "Could not save teacher profile details after auth creation.";
         if (profileInsertError.message.includes("duplicate key value violates unique constraint")) {
            if (profileInsertError.message.includes("teachers_email_key")) { 
                userMessage = "This email address is already linked to a teacher profile.";
                form.setError("email", { type: "manual", message: userMessage });
            } else if (profileInsertError.message.includes("teachers_auth_user_id_key")) { 
                userMessage = "This authentication ID is already linked to a teacher profile. This indicates a serious issue; the previous auth user might not have been rolled back correctly.";
            } else {
                userMessage = "A teacher with similar unique details might already exist in the profiles table.";
            }
        } else {
            userMessage = profileInsertError.message;
        }
        toast({ title: "Profile Creation Failed", description: userMessage, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      let toastDescription = `Teacher ${data.fullName} registered. Their Supabase Auth account created and profile saved.`;
      
      const isEmailConfirmationLikelyRequired = authData.user.identities && authData.user.identities.length > 0 && authData.user.identities[0].identity_data?.email_verified === false && authData.user.email_confirmed_at === null;

      if (isEmailConfirmationLikelyRequired) {
        toastDescription += " An email confirmation link has been sent to them. They must verify their email before logging in.";
      } else {
        toastDescription += " If email confirmation is enabled in your Supabase project, they will receive an email. Otherwise, they can log in directly.";
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
            <UserPlus className="mr-2 h-6 w-6" /> Register New Teacher
          </CardTitle>
          <CardDescription>
            Creates a Supabase Authentication user and a profile in the 'teachers' table.
            Teachers will log in using these credentials.
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
       <Card className="mt-4 border-amber-500 bg-amber-500/10">
        <CardHeader><CardTitle className="text-amber-700 flex items-center"><ShieldAlert className="mr-2"/> Important Note for Admin</CardTitle></CardHeader>
        <CardContent className="text-sm text-amber-600 space-y-2">
            <p>Ensure the <code className="font-mono bg-amber-200 dark:bg-amber-800 px-1 py-0.5 rounded text-amber-800 dark:text-amber-200">auth_user_id UUID</code> column has been added to your <code className="font-mono bg-amber-200 dark:bg-amber-800 px-1 py-0.5 rounded text-amber-800 dark:text-amber-200">public.teachers</code> table in Supabase.</p>
            <p>
              Behavior regarding email confirmation depends on your Supabase project settings (Authentication &gt; Settings &gt; Email templates section, check "Confirm email" status):
            </p>
            <ul className="list-disc pl-5 space-y-1">
                <li>If "Confirm email" is <strong>enabled</strong> in your Supabase project, the teacher will receive a confirmation email. They <strong>must click the link in that email to verify their account</strong> before they can log in. The link will redirect them to the teacher login page ({typeof window !== 'undefined' ? `${window.location.origin}/auth/teacher/login` : '/auth/teacher/login'}) after verification.</li>
                <li>If "Confirm email" is <strong>disabled</strong>, the teacher's email will be auto-confirmed, and they can log in immediately using the credentials you set. No verification email will be sent.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
