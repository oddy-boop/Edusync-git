
"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, type FieldValues } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, ACADEMIC_RESULTS_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfile {
  id: string; // Primary key of 'teachers' table
  auth_user_id: string; // Foreign key to auth.users.id
  full_name: string;
  email: string;
  assigned_classes: string[];
}

interface StudentForSelection {
  student_id_display: string;
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
  studentId: z.string().min(1, "Student selection is required."),
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
  teacherId: string; // This should be the teacher's profile ID (teachers.id)
  teacherName: string;
  studentName: string; 
  createdAt: string; 
  updatedAt: string; 
  publishedAt?: string; 
}

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

export default function TeacherManageResultsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null); 
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

  const formHook = useForm<AcademicResultFormData>({
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
    control: formHook.control,
    name: "subjectResults",
  });

  const watchClassId = formHook.watch("classId");
  const watchStudentId = formHook.watch("studentId");
  const watchTerm = formHook.watch("term");
  const watchYear = formHook.watch("year");
  const watchedSubjectScores = formHook.watch("subjectResults"); // Watch subject scores

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase(); 

    async function fetchTeacherData() {
      if (!supabaseRef.current) {
        if (isMounted.current) setError("Supabase client not initialized.");
        setIsLoading(false);
        return;
      }
      if (typeof window !== 'undefined') {
        const uidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
        if (uidFromStorage) {
          setTeacherAuthUid(uidFromStorage);
          try {
            const { data: profileData, error: profileError } = await supabaseRef.current
              .from('teachers')
              .select('id, auth_user_id, full_name, email, assigned_classes')
              .eq('auth_user_id', uidFromStorage)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              throw profileError;
            }
            
            if (isMounted.current) {
              if (profileData) {
                setTeacherProfile(profileData as TeacherProfile);
              } else {
                setError("Teacher profile not found in Supabase for the logged-in user.");
              }
            }
          } catch (e: any) {
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
              "Error fetching teacher profile from Supabase:",
              "Message:", e?.message,
              "Code:", e?.code,
              "Details:", e?.details,
              "Hint:", e?.hint,
              "Full Error:", JSON.stringify(e, getCircularReplacer(), 2)
            );
            if (isMounted.current) setError(`Failed to load teacher data from Supabase: ${e.message || 'Unknown error'}`);
          }
        } else {
          if (isMounted.current) {
            setError("Not authenticated.");
            router.push("/auth/teacher/login");
          }
        }
      }
      if (isMounted.current) setIsLoading(false);
    }
    
    fetchTeacherData();
    
    return () => { isMounted.current = false; };
  }, [router]);

  useEffect(() => {
    const fetchStudentsForClass = async () => {
      if (watchClassId && isMounted.current && supabaseRef.current) {
        setIsFetchingStudents(true);
        setStudentsInClass([]);
        formHook.setValue("studentId", ""); 
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
  }, [watchClassId, formHook, toast]);

  useEffect(() => {
    if (watchStudentId && watchTerm && watchYear && isMounted.current && typeof window !== 'undefined') {
      setIsFetchingResults(true);
      try {
        const resultsRaw = localStorage.getItem(ACADEMIC_RESULTS_KEY);
        const allResults: AcademicResultEntry[] = resultsRaw ? JSON.parse(resultsRaw) : [];
        const fetched = allResults.filter(r => 
          r.studentId === watchStudentId && 
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

  // Effect for calculating overall average
  useEffect(() => {
    if (watchedSubjectScores && Array.isArray(watchedSubjectScores)) {
      let totalScore = 0;
      let validScoresCount = 0;
      watchedSubjectScores.forEach(subject => {
        const scoreValue = parseFloat(subject.score || ""); // Treat empty string as NaN
        if (!isNaN(scoreValue) && subject.score?.trim() !== "") { // Also check if score string was not just whitespace
          totalScore += scoreValue;
          validScoresCount++;
        }
      });

      if (validScoresCount > 0) {
        const average = totalScore / validScoresCount;
        formHook.setValue("overallAverage", average.toFixed(1) + "%");
      } else {
        formHook.setValue("overallAverage", ""); // Set to empty if no valid scores
      }
    }
  }, [watchedSubjectScores, formHook]);


  const handleOpenFormDialog = (result?: AcademicResultEntry) => {
    if (result) {
      setCurrentResultToEdit(result);
      formHook.reset({
        classId: result.classId,
        studentId: result.studentId,
        term: result.term,
        year: result.year,
        subjectResults: result.subjectResults.map(sr => ({...sr})),
        overallAverage: result.overallAverage || "",
        overallGrade: result.overallGrade || "",
        overallRemarks: result.overallRemarks || "",
      });
    } else {
      setCurrentResultToEdit(null);
      formHook.reset({
        classId: formHook.getValues("classId") || "",
        studentId: formHook.getValues("studentId") || "",
        term: formHook.getValues("term") || "",
        year: formHook.getValues("year") || currentAcademicYear,
        subjectResults: [{ subjectName: "", score: "", grade: "", remarks: "" }],
        overallAverage: "",
        overallGrade: "",
        overallRemarks: "",
      });
    }
    setIsFormDialogOpen(true);
  };

  const onFormSubmit = async (data: AcademicResultFormData) => {
    if (!teacherAuthUid || !teacherProfile || typeof window === 'undefined') {
      toast({ title: "Error", description: "Authentication, profile error, or localStorage not available.", variant: "destructive" });
      return;
    }
    const student = studentsInClass.find(s => s.student_id_display === data.studentId);
    if (!student) {
      toast({ title: "Error", description: "Selected student not found.", variant: "destructive" });
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
            studentName: student.full_name, 
            teacherId: teacherProfile.id, 
            teacherName: teacherProfile.full_name, 
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
          teacherId: teacherProfile.id, 
          teacherName: teacherProfile.full_name,
          studentName: student.full_name,
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
        <Form {...formHook}> {/* Wrap selection filters with FormProvider */}
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={formHook.control} name="classId" render={({ field }) => (
              <FormItem><FormLabel>Class</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                  <SelectContent>{(teacherProfile.assigned_classes || []).map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>)} />
            <FormField control={formHook.control} name="studentId" render={({ field }) => (
              <FormItem><FormLabel>Student</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!watchClassId || isFetchingStudents}>
                  <FormControl><SelectTrigger><SelectValue placeholder={isFetchingStudents ? "Loading..." : "Select Student"} /></SelectTrigger></FormControl>
                  <SelectContent>{studentsInClass.map(s => <SelectItem key={s.student_id_display} value={s.student_id_display}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>)} />
            <FormField control={formHook.control} name="term" render={({ field }) => (
              <FormItem><FormLabel>Term/Semester</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger></FormControl>
                  <SelectContent>
                      {["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2", "Annual"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>)} />
            <FormField control={formHook.control} name="year" render={({ field }) => (
              <FormItem><FormLabel>Academic Year</FormLabel>
                <FormControl><Input placeholder="e.g., 2023-2024" {...field} /></FormControl><FormMessage />
              </FormItem>)} />
          </CardContent>
        </Form>
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
              For Student: {studentsInClass.find(s => s.student_id_display === formHook.getValues("studentId"))?.full_name || "N/A"} |
              Class: {formHook.getValues("classId")} | Term: {formHook.getValues("term")} | Year: {formHook.getValues("year")}
            </DialogDescription>
          </DialogHeader>
          <Form {...formHook}> 
            <form onSubmit={formHook.handleSubmit(onFormSubmit)} className="space-y-4 py-2">
              <input type="hidden" {...formHook.register("classId")} />
              <input type="hidden" {...formHook.register("studentId")} />
              <input type="hidden" {...formHook.register("term")} />
              <input type="hidden" {...formHook.register("year")} />
              
              <div>
                <Label className="text-md font-medium mb-2 block">Subject Results</Label>
                {fields.map((item, index) => (
                  <Card key={item.id} className="mb-3 p-3 relative border-border/70">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-6 w-6 text-destructive hover:text-destructive/80" disabled={fields.length <= 1}><MinusCircle className="h-4 w-4"/></Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField control={formHook.control} name={`subjectResults.${index}.subjectName`} render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger></FormControl>
                            <SelectContent>{SUBJECTS.map(subj => <SelectItem key={subj} value={subj}>{subj}</SelectItem>)}</SelectContent>
                          </Select><FormMessage/></FormItem>)} />
                      <FormField control={formHook.control} name={`subjectResults.${index}.score`} render={({ field }) => (
                        <FormItem><FormLabel>Score</FormLabel><FormControl><Input placeholder="e.g., 85 or N/A" {...field} /></FormControl><FormMessage/></FormItem>)} />
                      <FormField control={formHook.control} name={`subjectResults.${index}.grade`} render={({ field }) => (
                        <FormItem><FormLabel>Grade</FormLabel><FormControl><Input placeholder="e.g., A, B+, Pass" {...field} /></FormControl><FormMessage/></FormItem>)} />
                      <FormField control={formHook.control} name={`subjectResults.${index}.remarks`} render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Optional remarks for this subject" {...field} rows={1} /></FormControl><FormMessage/></FormItem>)} />
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ subjectName: "", score: "", grade: "", remarks: "" })}><PlusCircle className="mr-2 h-4 w-4"/>Add Subject</Button>
                {formHook.formState.errors.subjectResults?.root && <p className="text-sm font-medium text-destructive">{formHook.formState.errors.subjectResults.root.message}</p>}
                {Array.isArray(formHook.formState.errors.subjectResults) && formHook.formState.errors.subjectResults.length > 0 && !formHook.formState.errors.subjectResults?.root && (
                     <p className="text-sm font-medium text-destructive">Please fill all required fields for each subject.</p>
                )}
              </div>
              <hr className="my-3"/>
              <Label className="text-md font-medium mb-2 block">Overall Summary (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={formHook.control} name="overallAverage" render={({ field }) => (
                    <FormItem><FormLabel>Overall Average</FormLabel><FormControl><Input placeholder="e.g., 78.5%" {...field} /></FormControl><FormMessage/></FormItem>)} />
                <FormField control={formHook.control} name="overallGrade" render={({ field }) => (
                    <FormItem><FormLabel>Overall Grade</FormLabel><FormControl><Input placeholder="e.g., B+" {...field} /></FormControl><FormMessage/></FormItem>)} />
              </div>
              <FormField control={formHook.control} name="overallRemarks" render={({ field }) => (
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

    
