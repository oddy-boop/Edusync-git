
"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ClipboardCheck, PlusCircle, Edit, Trash2, Loader2, AlertCircle, BookMarked, MinusCircle, Users, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Firebase auth imports removed
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, REGISTERED_TEACHERS_KEY, ACADEMIC_RESULTS_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { format } from "date-fns";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[];
}

// This interface is for students listed in dropdowns, fetched from Supabase.
interface StudentForSelection {
  student_id_display: string; // Matches Supabase column
  full_name: string;
  grade_level: string;
}

const subjectResultSchema = z.object({
  subjectName: z.string().min(1, "Subject name is required."),
  score: z.string().optional(), 
  grade: z.string().min(1, "Grade is required (e.g., A, B+, Pass)."),
  remarks: z.string().optional(),
});

const academicResultSchema = z.object({
  classId: z.string().min(1, "Class selection is required."),
  studentId: z.string().min(1, "Student selection is required."), // This will store student_id_display
  term: z.string().min(1, "Term/Semester is required (e.g., Term 1, Semester 2)."),
  year: z.string().regex(/^\d{4}-\d{4}$/, "Year must be in YYYY-YYYY format (e.g., 2023-2024)."),
  subjectResults: z.array(subjectResultSchema).min(1, "At least one subject result must be added."),
  overallAverage: z.string().optional(),
  overallGrade: z.string().optional(),
  overallRemarks: z.string().optional(),
});

type AcademicResultFormData = z.infer<typeof academicResultSchema>;

interface AcademicResultEntry extends AcademicResultFormData {
  id: string; 
  teacherId: string;
  teacherName: string;
  studentName: string; // Full name of the student for display
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
  publishedAt?: string; // ISO Date String
}

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

export default function TeacherManageResultsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  
  const [studentsInClass, setStudentsInClass] = useState<StudentForSelection[]>([]);
  const [existingResults, setExistingResults] = useState<AcademicResultEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentResultToEdit, setCurrentResultToEdit] = useState<AcademicResultEntry | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<AcademicResultEntry | null>(null);

  const form = useForm<AcademicResultFormData>({
    resolver: zodResolver(academicResultSchema),
    defaultValues: {
      classId: "",
      studentId: "",
      term: "",
      year: currentAcademicYear,
      subjectResults: [{ subjectName: "", score: "", grade: "", remarks: "" }],
      overallAverage: "",
      overallGrade: "",
      overallRemarks: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjectResults",
  });

  const watchClassId = form.watch("classId");
  const watchStudentId = form.watch("studentId");
  const watchTerm = form.watch("term");
  const watchYear = form.watch("year");

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase(); 

    if (typeof window !== 'undefined') {
      const uid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (uid) {
        setTeacherUid(uid);
        try {
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          const profile = allTeachers.find(t => t.uid === uid);

          if (profile) {
            if (isMounted.current) setTeacherProfile(profile);
          } else {
            if (isMounted.current) setError("Teacher profile not found in local records.");
          }
        } catch (e: any) {
          if (isMounted.current) setError(`Failed to load teacher data from localStorage: ${e.message}`);
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated.");
          router.push("/auth/teacher/login");
        }
      }
    }
    if (isMounted.current) setIsLoading(false);
    
    return () => { isMounted.current = false; };
  }, [router]);

  useEffect(() => {
    const fetchStudentsForClass = async () => {
      if (watchClassId && isMounted.current && supabaseRef.current) {
        setIsFetchingStudents(true);
        setStudentsInClass([]);
        form.setValue("studentId", ""); 
        try {
          const { data, error: studentFetchError } = await supabaseRef.current
            .from('students')
            .select('student_id_display, full_name, grade_level')
            .eq('grade_level', watchClassId)
            .order('full_name', { ascending: true });

          if (studentFetchError) {
            throw studentFetchError;
          }
          if (isMounted.current) setStudentsInClass(data as StudentForSelection[] || []);

        } catch (e:any) {
          toast({title: "Error", description: `Failed to fetch students for ${watchClassId} from Supabase: ${e.message}`, variant: "destructive"});
        } finally {
          if (isMounted.current) setIsFetchingStudents(false);
        }
      }
    };
    fetchStudentsForClass();
  }, [watchClassId, form, toast]);

  useEffect(() => {
    if (watchStudentId && watchTerm && watchYear && isMounted.current && typeof window !== 'undefined') {
      setIsFetchingResults(true);
      try {
        const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
        const allResults: AcademicResultEntry[] = resultsRaw ? JSON.parse(resultsRaw) : [];
        const fetched = allResults.filter(r => 
          r.studentId === watchStudentId && // studentId here is student_id_display
          r.term === watchTerm &&
          r.year === watchYear
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (isMounted.current) setExistingResults(fetched);
      } catch (e:any) {
        toast({title: "Error", description: `Failed to fetch existing results from localStorage: ${e.message}`, variant: "destructive"});
      } finally {
        if (isMounted.current) setIsFetchingResults(false);
      }
    } else {
       if (isMounted.current) setExistingResults([]);
    }
  }, [watchStudentId, watchTerm, watchYear, toast]);

  const handleOpenFormDialog = (result?: AcademicResultEntry) => {
    if (result) {
      setCurrentResultToEdit(result);
      form.reset({
        classId: result.classId,
        studentId: result.studentId, // studentId is student_id_display
        term: result.term,
        year: result.year,
        subjectResults: result.subjectResults.map(sr => ({...sr})),
        overallAverage: result.overallAverage || "",
        overallGrade: result.overallGrade || "",
        overallRemarks: result.overallRemarks || "",
      });
    } else {
      setCurrentResultToEdit(null);
      form.reset({
        classId: form.getValues("classId") || "",
        studentId: form.getValues("studentId") || "", // This will be the selected student_id_display
        term: form.getValues("term") || "",
        year: form.getValues("year") || currentAcademicYear,
        subjectResults: [{ subjectName: "", score: "", grade: "", remarks: "" }],
        overallAverage: "",
        overallGrade: "",
        overallRemarks: "",
      });
    }
    setIsFormDialogOpen(true);
  };

  const onFormSubmit = async (data: AcademicResultFormData) => {
    if (!teacherUid || !teacherProfile || typeof window === 'undefined') {
      toast({ title: "Error", description: "Authentication, profile error, or localStorage not available.", variant: "destructive" });
      return;
    }
    // data.studentId already holds the student_id_display from the form selection
    const student = studentsInClass.find(s => s.student_id_display === data.studentId);
    if (!student) {
      toast({ title: "Error", description: "Selected student not found. This shouldn't happen if selection is from list.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
      let allResults: AcademicResultEntry[] = resultsRaw ? JSON.parse(resultsRaw) : [];
      const nowISO = new Date().toISOString();

      if (currentResultToEdit) {
        const resultIndex = allResults.findIndex(r => r.id === currentResultToEdit.id);
        if (resultIndex > -1) {
          allResults[resultIndex] = {
            ...allResults[resultIndex], 
            ...data, 
            studentName: student.full_name, // Update student name in case it changed (though unlikely here)
            updatedAt: nowISO,
          };
          toast({ title: "Success", description: "Academic result updated successfully." });
        } else {
          toast({ title: "Error", description: "Result to edit not found in localStorage.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      } else { 
        const newResultEntry: AcademicResultEntry = {
          id: `ACADRESULT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          ...data,
          teacherId: teacherUid,
          teacherName: teacherProfile.fullName,
          studentName: student.full_name, // Store full name for easier display later
          createdAt: nowISO,
          updatedAt: nowISO,
          publishedAt: nowISO, 
        };
        allResults.push(newResultEntry);
        toast({ title: "Success", description: "Academic result saved successfully." });
      }
      
      localStorage.setItem(ACADEMIC_RESULTS_KEY, JSON.stringify(allResults));
      
      if (watchStudentId && watchTerm && watchYear) {
        setIsFetchingResults(true);
        const updatedFilteredResults = allResults.filter(r => 
          r.studentId === watchStudentId &&
          r.term === watchTerm &&
          r.year === watchYear
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if(isMounted.current) setExistingResults(updatedFilteredResults);
        if(isMounted.current) setIsFetchingResults(false);
      }
      setIsFormDialogOpen(false);

    } catch (e: any) {
      console.error("Error saving academic result to localStorage:", e);
      toast({ title: "Error", description: `Failed to save result: ${e.message}`, variant: "destructive" });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (result: AcademicResultEntry) => {
    setResultToDelete(result);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteResult = async () => {
    if (!resultToDelete || typeof window === 'undefined') return;
    setIsSubmitting(true);
    try {
      const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
      let allResults: AcademicResultEntry[] = resultsRaw ? JSON.parse(resultsRaw) : [];
      const updatedResults = allResults.filter(r => r.id !== resultToDelete!.id);
      localStorage.setItem(ACADEMIC_RESULTS_KEY, JSON.stringify(updatedResults));
      
      toast({ title: "Success", description: "Academic result deleted." });
      setExistingResults(prev => prev.filter(r => r.id !== resultToDelete!.id));
      setIsDeleteDialogOpen(false);
      setResultToDelete(null); 
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to delete result from localStorage: ${e.message}`, variant: "destructive" });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading page...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile) {
    return <p className="text-muted-foreground">Teacher profile not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <ClipboardCheck className="mr-3 h-8 w-8" /> Manage Student Results
        </h2>
        <Button onClick={() => handleOpenFormDialog()} disabled={!watchClassId || !watchStudentId || !watchTerm || !watchYear}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Result Entry
        </Button>
      </div>
      <CardDescription>
        Select class, student, term, and year to view, add, or manage academic results. Results are saved to local browser storage.
      </CardDescription>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Selection Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField control={form.control} name="classId" render={({ field }) => (
            <FormItem><FormLabel>Class</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                <SelectContent>{teacherProfile.assignedClasses.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>)} />
          <FormField control={form.control} name="studentId" render={({ field }) => (
            <FormItem><FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!watchClassId || isFetchingStudents}>
                <FormControl><SelectTrigger><SelectValue placeholder={isFetchingStudents ? "Loading..." : "Select Student"} /></SelectTrigger></FormControl>
                <SelectContent>{studentsInClass.map(s => <SelectItem key={s.student_id_display} value={s.student_id_display}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>)} />
          <FormField control={form.control} name="term" render={({ field }) => (
            <FormItem><FormLabel>Term/Semester</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger></FormControl>
                <SelectContent>
                    {["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2", "Annual"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select><FormMessage />
            </FormItem>)} />
          <FormField control={form.control} name="year" render={({ field }) => (
            <FormItem><FormLabel>Academic Year</FormLabel>
              <FormControl><Input placeholder="e.g., 2023-2024" {...field} /></FormControl><FormMessage />
            </FormItem>)} />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookMarked className="mr-2 h-6 w-6" /> Existing Results
            {watchStudentId && studentsInClass.find(s=>s.student_id_display === watchStudentId) && ` for ${studentsInClass.find(s=>s.student_id_display === watchStudentId)?.full_name}`}
            {watchTerm && ` - ${watchTerm}`} {watchYear && ` (${watchYear})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFetchingResults && <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>Loading results...</span></div>}
          {!isFetchingResults && existingResults.length === 0 && <p className="text-muted-foreground text-center py-6">No results found for the current selection. You can add a new entry.</p>}
          {!isFetchingResults && existingResults.length > 0 && (
            <div className="space-y-4">
              {existingResults.map((result) => (
                <Card key={result.id} className="bg-secondary/30">
                  <CardHeader className="pb-2 pt-3 px-4 flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-md">Result Entry (Updated: {format(new Date(result.updatedAt), "PPP 'at' h:mm a")})</CardTitle>
                        <CardDescription className="text-xs">Uploaded by: {result.teacherName}</CardDescription>
                    </div>
                     <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(result)} className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(result)} className="h-7 w-7 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 text-sm">
                    <p><strong>Overall Average:</strong> {result.overallAverage || "N/A"}</p>
                    <p><strong>Overall Grade:</strong> {result.overallGrade || "N/A"}</p>
                    <p><strong>Overall Remarks:</strong> {result.overallRemarks || "N/A"}</p>
                    <details className="mt-2">
                        <summary className="cursor-pointer text-primary font-medium">View Subject Details ({result.subjectResults.length})</summary>
                        <div className="mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
                            {result.subjectResults.map((sr, idx) => (
                                <div key={idx} className="text-xs p-1 bg-background/50 rounded">
                                    <strong>{sr.subjectName}:</strong> Score: {sr.score || "-"}, Grade: {sr.grade}, Remarks: {sr.remarks || "-"}
                                </div>
                            ))}
                        </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentResultToEdit ? "Edit" : "Add New"} Academic Result Entry</DialogTitle>
            <DialogDescription>
              For Student: {studentsInClass.find(s => s.student_id_display === form.getValues("studentId"))?.full_name || "N/A"} |
              Class: {form.getValues("classId")} | Term: {form.getValues("term")} | Year: {form.getValues("year")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-2">
              <input type="hidden" {...form.register("classId")} />
              <input type="hidden" {...form.register("studentId")} />
              <input type="hidden" {...form.register("term")} />
              <input type="hidden" {...form.register("year")} />
              
              <div>
                <Label className="text-md font-medium mb-2 block">Subject Results</Label>
                {fields.map((item, index) => (
                  <Card key={item.id} className="mb-3 p-3 relative border-border/70">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-6 w-6 text-destructive hover:text-destructive/80" disabled={fields.length <= 1}><MinusCircle className="h-4 w-4"/></Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField control={form.control} name={`subjectResults.${index}.subjectName`} render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger></FormControl>
                            <SelectContent>{SUBJECTS.map(subj => <SelectItem key={subj} value={subj}>{subj}</SelectItem>)}</SelectContent>
                          </Select><FormMessage/></FormItem>)} />
                      <FormField control={form.control} name={`subjectResults.${index}.score`} render={({ field }) => (
                        <FormItem><FormLabel>Score</FormLabel><FormControl><Input placeholder="e.g., 85 or N/A" {...field} /></FormControl><FormMessage/></FormItem>)} />
                      <FormField control={form.control} name={`subjectResults.${index}.grade`} render={({ field }) => (
                        <FormItem><FormLabel>Grade</FormLabel><FormControl><Input placeholder="e.g., A, B+, Pass" {...field} /></FormControl><FormMessage/></FormItem>)} />
                      <FormField control={form.control} name={`subjectResults.${index}.remarks`} render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Optional remarks for this subject" {...field} rows={1} /></FormControl><FormMessage/></FormItem>)} />
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ subjectName: "", score: "", grade: "", remarks: "" })}><PlusCircle className="mr-2 h-4 w-4"/>Add Subject</Button>
                {form.formState.errors.subjectResults?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.subjectResults.root.message}</p>}
                {Array.isArray(form.formState.errors.subjectResults) && form.formState.errors.subjectResults.length > 0 && !form.formState.errors.subjectResults?.root && (
                     <p className="text-sm font-medium text-destructive">Please fill all required fields for each subject.</p>
                )}
              </div>
              <hr className="my-3"/>
              <Label className="text-md font-medium mb-2 block">Overall Summary (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="overallAverage" render={({ field }) => (
                    <FormItem><FormLabel>Overall Average</FormLabel><FormControl><Input placeholder="e.g., 78.5%" {...field} /></FormControl><FormMessage/></FormItem>)} />
                <FormField control={form.control} name="overallGrade" render={({ field }) => (
                    <FormItem><FormLabel>Overall Grade</FormLabel><FormControl><Input placeholder="e.g., B+" {...field} /></FormControl><FormMessage/></FormItem>)} />
              </div>
              <FormField control={form.control} name="overallRemarks" render={({ field }) => (
                <FormItem><FormLabel>Overall Remarks/Promoted To</FormLabel><FormControl><Textarea placeholder="e.g., Excellent performance, promoted to Basic 2." {...field} rows={2}/></FormControl><FormMessage/></FormItem>)} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  {currentResultToEdit ? "Save Changes" : "Save Result Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {resultToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this result entry for {resultToDelete.studentName} (Term: {resultToDelete.term}, Year: {resultToDelete.year})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteResult} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>} Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
