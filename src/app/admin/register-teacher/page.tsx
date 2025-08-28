
"use client";

import { useForm } from "react-hook-form";
import { useFormStatus } from "react-dom";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useActionState, useRef, useEffect } from "react";

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
import { UserPlus, ChevronDown, KeyRound, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { registerTeacherAction } from "@/lib/actions/teacher.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import InviteResendDialog from '@/components/ui/InviteResendDialog';

const teacherSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  subjectsTaught: z.array(z.string()).min(1, "At least one subject must be selected."),
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
});

type TeacherFormData = z.infer<typeof teacherSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
  temporaryPassword?: string | null;
};

const initialState: ActionResponse = {
  success: false,
  message: "",
  temporaryPassword: null,
};


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register & Invite Teacher"}
    </Button>
  );
}

export default function RegisterTeacherPage() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(registerTeacherAction, initialState);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      fullName: "",
      email: "",
  dateOfBirth: "",
  location: "",
      subjectsTaught: [],
      contactNumber: "",
      assignedClasses: [],
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: "Teacher Registration Initiated",
          description: state.message,
          duration: 9000,
        });
        form.reset();
        setSelectedClasses([]);
        setSelectedSubjects([]);
        formRef.current?.reset();
    if ((state as any)?.inviteMeta?.email) setShowInviteDialog(true);
      } else {
        toast({
          title: "Registration Failed",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, toast, form]);

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const handleClassToggle = (grade: string) => {
    const newSelectedClasses = selectedClasses.includes(grade)
      ? selectedClasses.filter((c) => c !== grade)
      : [...selectedClasses, grade];
    setSelectedClasses(newSelectedClasses);
    form.setValue("assignedClasses", newSelectedClasses, { shouldValidate: true });
  };
  
  const handleSubjectToggle = (subject: string) => {
    const newSelectedSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((s) => s !== subject)
      : [...selectedSubjects, subject];
    setSelectedSubjects(newSelectedSubjects);
    form.setValue("subjectsTaught", newSelectedSubjects, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline">
            <UserPlus className="mr-2 h-6 w-6" /> Register New Teacher
          </CardTitle>
          <CardDescription>
            This form creates a new teacher account and sends an invitation to the provided email.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form ref={formRef} action={formAction}>
            <CardContent className="space-y-4">
              <input type="hidden" name="assignedClasses" value={selectedClasses.join(',')} />
              <input type="hidden" name="subjectsTaught" value={selectedSubjects.join(',')} />
              <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Enter teacher's full name" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address (for Login)</FormLabel>
                    <FormControl><Input type="email" placeholder="teacher@example.com" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Calendar className="mr-2 h-4 w-4"/>Date of Birth (Optional)</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Town/City)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter teacher's location (city or address)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem><FormLabel>Contact Number</FormLabel>
                    <FormControl><Input placeholder="Enter teacher's contact number" {...field} /></FormControl>
                  <FormMessage /></FormItem>)} />

              <FormField control={form.control} name="subjectsTaught" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Subjects Taught</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="justify-between">
                        {selectedSubjects.length > 0 ? `${selectedSubjects.length} subject(s) selected` : "Select subjects"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                      <DropdownMenuLabel>Available Subjects</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {SUBJECTS.map((subject) => (
                        <DropdownMenuCheckboxItem key={subject} checked={selectedSubjects.includes(subject)} onCheckedChange={() => handleSubjectToggle(subject)} onSelect={(e) => e.preventDefault()}>
                          {subject}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="assignedClasses" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Assign Classes</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="justify-between">
                          {selectedClasses.length > 0 ? `${selectedClasses.length} class(es) selected` : "Select classes"}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                        <DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel><DropdownMenuSeparator />
                        {GRADE_LEVELS.map((grade) => (
                          <DropdownMenuCheckboxItem key={grade} checked={selectedClasses.includes(grade)} onCheckedChange={() => handleClassToggle(grade)} onSelect={(e) => e.preventDefault()}>
                            {grade}
                          </DropdownMenuCheckboxItem>))}
                      </DropdownMenuContent>
                    </DropdownMenu><FormMessage /></FormItem>)} />
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              <SubmitButton />
               {state.success && state.temporaryPassword && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 w-full">
                  <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
                    Teacher Created (Dev Mode)
                  </AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    The temporary password for this teacher is:{" "}
                    <strong className="font-mono">{state.temporaryPassword}</strong>.
                    <br/>
                    Please share this securely. The user should change it upon first login.
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
  <InviteResendDialog email={(state as any)?.inviteMeta?.email ?? form.getValues().email} open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </div>
  );
}
