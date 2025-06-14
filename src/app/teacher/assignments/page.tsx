
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
import type { SupabaseClient } from "@supabase/supabase-js";

// Teacher profile structure (from Supabase 'teachers' table)
interface TeacherProfile {
  id: string; // Supabase UUID
  full_name: string;
  email: string;
  assigned_classes: string[]; 
}

// Assignment data structure reflecting Supabase table
interface Assignment {
  id: string; // Supabase UUID
  teacher_id: string;
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

  const [teacherUid, setTeacherUid] = useState<string | null>(null);
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
        const uidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
        if (uidFromStorage) {
          setTeacherUid(uidFromStorage);
          try {
            const { data: profileData, error: profileError } = await supabaseRef.current
              .from('teachers')
              .select('id, full_name, email, assigned_classes')
              .eq('id', uidFromStorage)
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
    if (!selectedClassForFiltering || !teacherUid || !supabaseRef.current) {
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
          .eq('teacher_id', teacherUid)
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
  }, [selectedClassForFiltering, teacherUid, toast]);

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

  const uploadAssignmentFile = async (file: File, teacherId: string, assignmentId?: string): Promise<string | null> => {
    if (!supabaseRef.current) {
        toast({ title: "Client Error", description: "Supabase client not initialized.", variant: "destructive" });
        return null;
    }
    const uniquePrefix = assignmentId || Date.now();
    const fileName = `${uniquePrefix}-${file.name.replace(/\s+/g, '_')}`; 
    const filePath = `${teacherId}/${fileName}`; 

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
    if (!teacherUid || !teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "Missing required data or client error.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let fileUrl: string | null | undefined = currentAssignmentToEdit?.file_url; 

    try {
      if (selectedFile) { 
        const newFileUrl = await uploadAssignmentFile(selectedFile, teacherUid, currentAssignmentToEdit?.id);
        if (!newFileUrl) { setIsSubmitting(false); return; } 
        
        if (currentAssignmentToEdit?.file_url && newFileUrl !== currentAssignmentToEdit.file_url) {
          const oldFilePath = getPathFromSupabaseStorageUrl(currentAssignmentToEdit.file_url);
          if (oldFilePath) {
            supabaseRef.current.storage.from(SUPABASE_ASSIGNMENT_FILES_BUCKET).remove([oldFilePath]).catch(err => console.warn("Failed to delete old assignment file:", err));
          }
        }
        fileUrl = newFileUrl;
      }

      const assignmentPayload = {
        teacher_id: teacherUid,
        teacher_name: teacherProfile.full_name,
        class_id: data.classId,
        title: data.title,
        description: data.description,
        due_date: format(data.dueDate, "yyyy-MM-dd"),
        file_url: fileUrl, 
      };

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
      
      if (selectedClassForFiltering) {
        const { data: refreshedAssignments, error: fetchError } = await supabaseRef.current
          .from('assignments')
          .select('*')
          .eq('teacher_id', teacherUid)
          .eq('class_id', selectedClassForFiltering)
          .order('created_at', { ascending: false });
        if (fetchError) console.error("Error re-fetching assignments:", fetchError);
        else if (isMounted.current) setAssignments(refreshedAssignments as Assignment[] || []);
      }

    } catch (error: any) {
      let userMessage = "An unexpected error occurred while saving the assignment.";
      if (error?.message) {
        userMessage = error.message;
      }

      console.error("Raw error object caught in onSubmitAssignment:", error);

      // Prepare a comprehensive log object
      const logObject: Record<string, any> = {
        context: "Error saving assignment to Supabase",
        userFacingMessage: userMessage,
      };

      if (typeof error === 'object' && error !== null) {
        for (const prop of ['message', 'code', 'details', 'hint', 'name', 'status', 'statusCode']) {
          if (prop in error && error[prop] !== undefined) {
            logObject[prop] = error[prop];
          }
        }
        if (error.stack) {
            logObject.stack = error.stack;
        }
      }
      
      try {
        const seen = new WeakSet();
        logObject.stringifiedError = JSON.stringify(error, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          // If it's an Error object, ensure its properties are included
          if (value instanceof Error) {
            return { message: value.message, name: value.name, stack: value.stack, ...value };
          }
          return value;
        }, 2);
         if (logObject.stringifiedError === '{}' && error.toString && error.toString() !== '[object Object]') {
            logObject.stringifiedError = error.toString();
        }
      } catch (stringifyError: any) {
        logObject.stringifyErrorDetails = `Failed to stringify: ${stringifyError.message}`;
        if (error && typeof error.toString === 'function') {
          logObject.stringifiedErrorFallback = error.toString();
        }
      }
      
      console.error("Detailed error log:", logObject);
      
      toast({ title: "Database Error", description: userMessage, variant: "destructive" });
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
        dueDate: new Date(assignment.due_date + 'T00:00:00'), 
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
    if (!assignmentToDelete || !teacherUid || !supabaseRef.current) return;
    setIsSubmitting(true); 
    try {
      const { error: deleteError } = await supabaseRef.current
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete.id)
        .eq('teacher_id', teacherUid); 

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
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading...</p></div>;
  }
  if (error) { 
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile) { 
    return <p className="text-muted-foreground">Teacher profile loading or not found.</p>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Edit className="mr-3 h-8 w-8" /> Assignment Management
        </h2>
        <div className="w-full sm:w-auto min-w-[200px]">
          <Select value={selectedClassForFiltering} onValueChange={setSelectedClassForFiltering}>
            <SelectTrigger id="class-filter-select"><SelectValue placeholder="View assignments for class..." /></SelectTrigger>
            <SelectContent>{GRADE_LEVELS.map(cls => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <CardDescription>
        Create new assignments for any class, or select a class above to view, edit, or delete its existing assignments. Assignments and files are stored in Supabase.
      </CardDescription>

      <Card className="shadow-md">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-xl">Create/Edit Assignment</CardTitle>
          <Button onClick={() => handleOpenFormDialog()} variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Assignment
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
            <p className="text-sm text-muted-foreground">
                Click "Add New Assignment" or edit an existing one from the list below.
                The form will appear in a dialog.
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
      {!selectedClassForFiltering && <Card className="shadow-md border-dashed mt-6"><CardContent className="pt-6 text-center"><p className="text-muted-foreground">Please select a class to view its assignments.</p></CardContent></Card>}

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
    

