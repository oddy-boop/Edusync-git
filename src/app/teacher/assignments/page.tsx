
"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Edit, PlusCircle, ListChecks, Loader2, AlertCircle, BookUp, Trash2, Save, UploadCloud, Download } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

// Teacher profile structure (from Supabase 'teachers' table)
interface TeacherProfile {
  id: string; // Primary Key of 'teachers' table (auto-generated UUID)
  auth_user_id: string; // Foreign key to auth.users.id
  full_name: string;
  email: string;
  assigned_classes: string[];
}

// Assignment data structure reflecting Supabase table
interface Assignment {
  id: string; // Supabase UUID (PK of assignments table)
  teacher_id: string; // This should store the ID from the 'teachers' table (teacherProfile.id)
  teacher_name: string;
  class_id: string; // Target grade level
  title: string;
  description: string;
  due_date: string; // ISO Date string (YYYY-MM-DD)
  file_url?: string | null;
  created_at: string; // ISO DateTime string
  updated_at?: string; // ISO DateTime string
}

const assignmentSchema = z.object({
  classId: z.string().min(1, "Target class is required."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  dueDate: z.date({ required_error: "Due date is required." }).refine(date => date >= startOfDay(new Date()) || date.toDateString() === startOfDay(new Date()).toDateString(), {
    message: "Due date cannot be in the past.",
  }),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

const SUPABASE_ASSIGNMENT_FILES_BUCKET = 'assignment-files';

export default function TeacherAssignmentsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null); // Stores Supabase auth.uid()
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [selectedClassForFiltering, setSelectedClassForFiltering] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentAssignmentToEdit, setCurrentAssignmentToEdit] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { classId: "", title: "", description: "", dueDate: undefined },
  });

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const fetchTeacherProfileFromSupabase = async () => {
      if (!isMounted.current || !supabaseRef.current) return;

      if (typeof window !== 'undefined') {
        const authUidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
        if (authUidFromStorage) {
          setTeacherAuthUid(authUidFromStorage);
          try {
            const { data: profileData, error: profileError } = await supabaseRef.current
              .from('teachers')
              .select('id, auth_user_id, full_name, email, assigned_classes')
              .eq('auth_user_id', authUidFromStorage) // Query by auth_user_id
              .single();

            if (profileError) throw profileError;

            if (profileData && isMounted.current) {
              setTeacherProfile(profileData as TeacherProfile);
            } else if (isMounted.current) {
              setError("Teacher profile not found in Supabase. Please contact admin.");
              router.push("/auth/teacher/login");
            }
          } catch (e: any) {
            console.error("Error fetching teacher profile from Supabase:", e);
            if (isMounted.current) {
                setError(`Failed to load teacher data from Supabase: ${e.message}`);
            }
          }
        } else if (isMounted.current) {
          setError("Not authenticated. Please login.");
          router.push("/auth/teacher/login");
        }
      }
      if (isMounted.current) setIsLoading(false);
    };

    fetchTeacherProfileFromSupabase();

    return () => { isMounted.current = false; };
  }, [router]);

  useEffect(() => {
    if (!selectedClassForFiltering || !teacherProfile || !supabaseRef.current) {
      if (isMounted.current) setAssignments([]);
      return;
    }
    const fetchAssignmentsFromSupabase = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsFetchingAssignments(true);
      try {
        const { data, error: fetchError } = await supabaseRef.current
          .from('assignments')
          .select('*')
          .eq('teacher_id', teacherProfile.id) // Filter by teacher's profile ID (teachers.id)
          .eq('class_id', selectedClassForFiltering)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (isMounted.current) setAssignments(data as Assignment[] || []);
      } catch (e: any) {
        console.error("Error fetching assignments from Supabase:", e);
        toast({ title: "Error Fetching Assignments", description: `Could not load assignments: ${e.message}`, variant: "destructive" });
      } finally {
        if (isMounted.current) setIsFetchingAssignments(false);
      }
    };
    fetchAssignmentsFromSupabase();
  }, [selectedClassForFiltering, teacherProfile, toast]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewName(file.name);
    } else {
      setSelectedFile(null);
      setFilePreviewName(null);
    }
  };

  const uploadAssignmentFile = async (file: File, teacherIdForPath: string, assignmentId?: string): Promise<string | null> => {
    if (!supabaseRef.current) {
        toast({ title: "Client Error", description: "Supabase client not initialized.", variant: "destructive" });
        return null;
    }
    const uniquePrefix = assignmentId || Date.now();
    const fileName = `${uniquePrefix}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${teacherIdForPath}/${fileName}`; 

    const { error: uploadError } = await supabaseRef.current.storage
      .from(SUPABASE_ASSIGNMENT_FILES_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(`Error uploading assignment file to Supabase Storage:`, JSON.stringify(uploadError, null, 2));
      let displayErrorMessage = (uploadError as any)?.message || `An unknown error occurred during file upload.`;

      const errorMessageString = JSON.stringify(uploadError).toLowerCase();
      if (errorMessageString.includes("bucket not found")) {
        displayErrorMessage = `Upload failed: The storage bucket '${SUPABASE_ASSIGNMENT_FILES_BUCKET}' was not found. Please ensure it exists in your Supabase project. Original error: ${(uploadError as any)?.message}`;
      } else if (errorMessageString.includes("violates row-level security policy") || (uploadError as any)?.statusCode?.toString() === "403" || (uploadError as any)?.error?.toLowerCase() === "unauthorized") {
        displayErrorMessage = `Upload unauthorized. This often means a Row Level Security (RLS) policy on the '${SUPABASE_ASSIGNMENT_FILES_BUCKET}' bucket is preventing uploads, or your RLS for the 'storage.objects' table is too restrictive. Please check your RLS policies. Original error: ${(uploadError as any)?.message}`;
      }

      toast({ title: "Upload Failed", description: displayErrorMessage, variant: "destructive", duration: 12000 });
      return null;
    }

    const { data: publicUrlData } = supabaseRef.current.storage
      .from(SUPABASE_ASSIGNMENT_FILES_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  };

  const getPathFromSupabaseStorageUrl = (url: string): string | null => {
    if (!url || !supabaseRef.current?.storage.url) return null;
    try {
        const supabaseStorageBase = `${supabaseRef.current.storage.url}/object/public/${SUPABASE_ASSIGNMENT_FILES_BUCKET}/`;
        if (url.startsWith(supabaseStorageBase)) {
            return url.substring(supabaseStorageBase.length);
        }
    } catch(e) { console.warn("Could not determine Supabase base URL for path extraction.", e); }
    return null;
  };

  const onSubmitAssignment = async (data: AssignmentFormData) => {
    if (!teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "Missing required teacher profile data or client error.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let fileUrl: string | null | undefined = currentAssignmentToEdit?.file_url;

    const assignmentPayload = {
      teacher_id: teacherProfile.id,
      teacher_name: teacherProfile.full_name,
      class_id: data.classId,
      title: data.title,
      description: data.description,
      due_date: format(data.dueDate, "yyyy-MM-dd"),
      file_url: fileUrl, // Placeholder, will be updated if file changes
    };

    try {
      if (selectedFile) {
        const newFileUrl = await uploadAssignmentFile(selectedFile, teacherProfile.id, currentAssignmentToEdit?.id);
        if (!newFileUrl) { setIsSubmitting(false); return; }

        if (currentAssignmentToEdit?.file_url && newFileUrl !== currentAssignmentToEdit.file_url) {
          const oldFilePath = getPathFromSupabaseStorageUrl(currentAssignmentToEdit.file_url);
          if (oldFilePath) {
            supabaseRef.current.storage.from(SUPABASE_ASSIGNMENT_FILES_BUCKET).remove([oldFilePath]).catch(err => console.warn("Failed to delete old assignment file:", err));
          }
        }
        assignmentPayload.file_url = newFileUrl; // Update payload with new URL
      }

      if (currentAssignmentToEdit?.id) {
        const { data: updatedData, error: updateError } = await supabaseRef.current
          .from('assignments')
          .update({ ...assignmentPayload, updated_at: new Date().toISOString() })
          .eq('id', currentAssignmentToEdit.id)
          .select()
          .single();

        if (updateError) throw updateError;

        if(isMounted.current && updatedData) setAssignments(prev => prev.map(a => a.id === updatedData.id ? updatedData : a).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        toast({ title: "Success", description: "Assignment updated successfully in Supabase." });

      } else {
        const { data: insertedData, error: insertError } = await supabaseRef.current
          .from('assignments')
          .insert(assignmentPayload)
          .select()
          .single();

        if (insertError) throw insertError; 
        if(isMounted.current && insertedData) setAssignments(prev => [insertedData, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        toast({ title: "Success", description: "Assignment created successfully in Supabase." });
      }

      form.reset({ classId: selectedClassForFiltering || "", title: "", description: "", dueDate: undefined });
      setSelectedFile(null);
      setFilePreviewName(null);
      setIsFormDialogOpen(false);
      setCurrentAssignmentToEdit(null);

      if (selectedClassForFiltering && teacherProfile) {
        const { data: refreshedAssignments, error: fetchError } = await supabaseRef.current
          .from('assignments')
          .select('*')
          .eq('teacher_id', teacherProfile.id)
          .eq('class_id', selectedClassForFiltering)
          .order('created_at', { ascending: false });
        if (fetchError) console.error("Error re-fetching assignments:", fetchError);
        else if (isMounted.current) setAssignments(refreshedAssignments as Assignment[] || []);
      }

    } catch (error: any) {
      const errorCode = error?.code || error?.status?.toString();
      const errorDetails = error?.details;
      const errorHint = error?.hint;
      let errorMessageFromError = error?.message;

      if (error && typeof error.message === 'string' && !error.message.toLowerCase().includes("object object")) {
        errorMessageFromError = error.message;
      } else if (error && typeof error.toString === 'function' && error.toString() !== '[object Object]') {
        errorMessageFromError = error.toString();
      } else {
        errorMessageFromError = "An unknown error occurred. See console for details.";
      }
      
      const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key: string, value: any) => {
          if (typeof value === 'object' && value !== null) {
            if (value instanceof Error) {
              const errObj: any = { message: value.message, name: value.name };
              if (value.stack) errObj.stack = value.stack.split('\n').slice(0, 5).join('\n');
              for (const propKey of Object.getOwnPropertyNames(value)) {
                  if (!errObj.hasOwnProperty(propKey) && typeof (value as any)[propKey] !== 'function') {
                      errObj[propKey] = (value as any)[propKey];
                  }
              }
              return errObj;
            }
            if (seen.has(value)) { return '[Circular Reference]'; }
            seen.add(value);
          }
          return value;
        };
      };

      console.error(
        "Raw error object caught during assignment save:",
        "Message:", errorMessageFromError, 
        "Code:", errorCode, 
        "Details:", errorDetails, 
        "Hint:", errorHint,
        "Full Error:", JSON.stringify(error, getCircularReplacer(), 2) 
      );

      let toastMessage = "An unknown error occurred while saving the assignment.";
      let detailedConsoleMessage = "Error saving assignment to Supabase.\n";
      let suggestion = "";

      if (errorCode === "404" || (typeof errorMessageFromError === 'string' && errorMessageFromError.toLowerCase().includes("not found"))) {
          toastMessage = "Database Error (404): The 'assignments' table or endpoint was not found. Please check if the table exists and your RLS policies. Contact admin if issues persist.";
          suggestion = "Suggestion: The 'assignments' table might be missing or inaccessible (Code: 404). Verify table name, RLS, network, and Supabase config.";
      } else if (errorCode === '42501' || errorCode === '403' || (typeof errorMessageFromError === 'string' && errorMessageFromError.toLowerCase().includes("violates row-level security policy"))) {
          toastMessage = `RLS Violation (Code: ${errorCode}) on 'assignments' table. Your INSERT policy is likely preventing this. Original message: ${errorMessageFromError || 'N/A'}`;
           if (typeof errorMessageFromError === 'string' && errorMessageFromError.toLowerCase().includes("assignments_teacher_id_fkey")) {
              suggestion = "The RLS policy on 'assignments' might be trying to check `auth.uid() = NEW.teacher_id`, but `NEW.teacher_id` is `teachers.id`. Your RLS policy for INSERT on `assignments` should use `EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = NEW.teacher_id AND t.auth_user_id = auth.uid())` to correctly verify the teacher's ownership.";
          } else {
            suggestion = `Suggestion: Review your INSERT RLS policy for the 'assignments' table. It needs to allow the logged-in teacher to insert records where 'assignments.teacher_id' refers to their 'teachers.id' (and 'teachers.auth_user_id' matches 'auth.uid()'). Example check: 'EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = NEW.teacher_id AND t.auth_user_id = auth.uid())'.`;
          }
      } else if (errorCode === '23503' && (typeof errorMessageFromError === 'string' && errorMessageFromError.toLowerCase().includes("violates foreign key constraint \"assignments_teacher_id_fkey\""))) {
          toastMessage = `Database Error: Foreign Key Violation on 'assignments.teacher_id' (Code: ${errorCode}). ${errorMessageFromError}. This means the 'teacher_id' ('${assignmentPayload.teacher_id}') being saved doesn't exist as an 'id' in the 'teachers' table.`;
          suggestion = "Suggestion: Verify that the teacher_id (PK from 'teachers' table, which is teacherProfile.id) exists and is correct. This usually means the teacher profile is correct.";
      } else if (typeof errorMessageFromError === 'string' && errorMessageFromError.trim() !== "" && !errorMessageFromError.toLowerCase().includes("object object")) {
        toastMessage = errorMessageFromError;
      }

      if (suggestion) {
        detailedConsoleMessage += `  ${suggestion}\n`;
      }
      detailedConsoleMessage += `  Message: ${errorMessageFromError || 'N/A'}\n`;
      detailedConsoleMessage += `  Code: ${errorCode || 'N/A'}\n`;
      detailedConsoleMessage += `  Details: ${errorDetails || 'N/A'}\n`;
      detailedConsoleMessage += `  Hint: ${errorHint || 'N/A'}\n`;

      let fullErrorString;
      try {
        const initialStringify = JSON.stringify(error, getCircularReplacer(), 2);

        if (initialStringify && initialStringify !== '{}' && initialStringify !== '[]' && initialStringify.length > 10 && !initialStringify.toLowerCase().includes("object progressrequest")) {
          fullErrorString = initialStringify;
        } else if (error && typeof error.toString === 'function' && error.toString() !== '[object Object]') {
          fullErrorString = error.toString();
        } else {
          fullErrorString = "[Inspect the 'Raw error object' logged above in the console.]";
        }
      } catch (stringifyError: any) {
        detailedConsoleMessage += `  Stringification attempt failed: ${stringifyError.message}.\n`;
        if (error && typeof error.toString === 'function') {
          fullErrorString = error.toString();
        } else {
          fullErrorString = "[Could not stringify or get toString() for error object]";
        }
      }
      detailedConsoleMessage += `  Full Error Object (Processed): ${fullErrorString}\n`;

      if (error instanceof Error && error.stack) {
        detailedConsoleMessage += `  Stack: ${error.stack}\n`;
      } else if (error?.stack) {
        detailedConsoleMessage += `  Stack (from error.stack): ${error.stack}\n`;
      }
      else {
        detailedConsoleMessage += `  Stack: N/A\n`;
      }

      console.error(detailedConsoleMessage);

      toast({
        title: "Database Error",
        description: toastMessage,
        variant: "destructive",
        duration: 15000
      });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenFormDialog = (assignment?: Assignment) => {
    if (assignment) {
      setCurrentAssignmentToEdit(assignment);
      form.reset({
        classId: assignment.class_id,
        title: assignment.title,
        description: assignment.description,
        dueDate: new Date(assignment.due_date + 'T00:00:00'), // Ensure date is correctly parsed
      });
      setFilePreviewName(assignment.file_url ? assignment.file_url.split('/').pop() : null);
      setSelectedFile(null);
    } else {
      setCurrentAssignmentToEdit(null);
      form.reset({
          classId: selectedClassForFiltering || "", 
          title: "",
          description: "",
          dueDate: undefined
      });
      setFilePreviewName(null);
      setSelectedFile(null);
    }
    setIsFormDialogOpen(true);
  };

  const handleOpenDeleteDialog = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete || !teacherProfile || !supabaseRef.current) return; 
    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabaseRef.current
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete.id)
        .eq('teacher_id', teacherProfile.id); // Ensure only the owner can delete, using teacherProfile.id

      if (deleteError) throw deleteError;

      if (assignmentToDelete.file_url) {
        const filePath = getPathFromSupabaseStorageUrl(assignmentToDelete.file_url);
        if (filePath) {
          const { error: storageError } = await supabaseRef.current.storage.from(SUPABASE_ASSIGNMENT_FILES_BUCKET).remove([filePath]);
          if (storageError) {
            console.warn(`Assignment record deleted, but failed to delete file from storage: ${storageError.message}. File path: ${filePath}`);
            toast({title: "File Deletion Warning", description: "Assignment record deleted, but associated file could not be removed from storage. Please check manually.", variant:"default", duration: 8000});
          }
        }
      }

      toast({ title: "Success", description: "Assignment deleted successfully from Supabase." });
      if(isMounted.current) setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id));
      setAssignmentToDelete(null);
    } catch (e: any) {
      console.error("Error deleting assignment from Supabase:", e);
      toast({ title: "Database Error", description: `Could not delete assignment: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
        setIsDeleteDialogOpen(false);
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading teacher data...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile) {
    return <p className="text-muted-foreground">Teacher profile loading or not found. Ensure you are logged in.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Edit className="mr-3 h-8 w-8" /> Assignment Management
        </h2>
        <div className="w-full sm:w-auto min-w-[200px]">
          <Select value={selectedClassForFiltering} onValueChange={setSelectedClassForFiltering} disabled={!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0}>
            <SelectTrigger id="class-filter-select"><SelectValue placeholder={teacherProfile.assigned_classes.length === 0 ? "No classes assigned" : "View assignments for class..."} /></SelectTrigger>
            <SelectContent>{(teacherProfile.assigned_classes || []).map(cls => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <CardDescription>
        Create new assignments for any class, or select one of your assigned classes above to view, edit, or delete its existing assignments. Assignments and files are stored in Supabase.
      </CardDescription>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-xl">Assignments</CardTitle>
           <Button onClick={() => handleOpenFormDialog()} variant="default" size="sm" disabled={!teacherProfile}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Assignment
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
            <p className="text-sm text-muted-foreground">
                Click "Add New Assignment" to create an assignment for any class. To view/edit existing assignments for your assigned classes, select a class from the filter above.
            </p>
        </CardContent>
      </Card>

      {selectedClassForFiltering && (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" /> Assignments for {selectedClassForFiltering}</CardTitle>
            <CardDescription>List of assignments you have created for this class from Supabase. You can edit or delete them.</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetchingAssignments ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><p>Loading assignments...</p></div>
            ) : assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No assignments found for {selectedClassForFiltering}. Use "Add New Assignment" to create one.</p>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="bg-secondary/30">
                    <CardHeader className="pb-3 pt-4 px-5">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription className="text-xs">
                        Due: {format(new Date(assignment.due_date + 'T00:00:00'), "PPP")} | Created: {format(new Date(assignment.created_at), "PPP, h:mm a")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pb-4">
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{assignment.description}</p>
                      {assignment.file_url && (
                        <div className="mt-2">
                          <Button variant="link" size="sm" asChild className="p-0 h-auto text-accent">
                            <a href={assignment.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-1 h-4 w-4" /> View/Download Attached File
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="px-5 py-3 border-t flex justify-end items-center">
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(assignment)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteDialog(assignment)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {!selectedClassForFiltering && <Card className="shadow-md border-dashed mt-6"><CardContent className="pt-6 text-center"><p className="text-muted-foreground">Please select one of your assigned classes to view its assignments, or click "Add New Assignment" to create one for any class.</p></CardContent></Card>}

      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) {setCurrentAssignmentToEdit(null); setSelectedFile(null); setFilePreviewName(null); } setIsFormDialogOpen(isOpen);}}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{currentAssignmentToEdit ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
            <DialogDescription>{currentAssignmentToEdit ? `Modifying assignment: ${currentAssignmentToEdit.title}` : "Fill in the details for the new assignment. File upload is optional."}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAssignment)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField control={form.control} name="classId" render={({ field }) => (
                <FormItem><FormLabel>Target Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select target class" /></SelectTrigger></FormControl>
                    <SelectContent>{GRADE_LEVELS.map(cls => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Assignment Title</FormLabel><FormControl><Input placeholder="e.g., Chapter 5 Reading" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description / Instructions</FormLabel><FormControl><Textarea placeholder="Detailed instructions..." {...field} rows={5}/></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                      <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal",!field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a due date</span>}
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < startOfDay(new Date())}/></PopoverContent>
                  </Popover><FormMessage />
                </FormItem>)} />
              <FormItem>
                <FormLabel htmlFor="assignmentFile" className="flex items-center"><UploadCloud className="mr-2 h-4 w-4" /> Attach File (Optional)</FormLabel>
                <FormControl><Input id="assignmentFile" type="file" onChange={handleFileChange} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></FormControl>
                {filePreviewName && <p className="text-xs text-muted-foreground mt-1">Selected: {filePreviewName}</p>}
                {currentAssignmentToEdit?.file_url && !selectedFile && <p className="text-xs text-muted-foreground mt-1">Current file: <a href={currentAssignmentToEdit.file_url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{currentAssignmentToEdit.file_url.split('/').pop()}</a></p>}
              </FormItem>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> {currentAssignmentToEdit ? "Update Assignment" : "Create Assignment"}</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {assignmentToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete "{assignmentToDelete.title}" for {assignmentToDelete.class_id}? This also deletes any attached file and cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteAssignment} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

