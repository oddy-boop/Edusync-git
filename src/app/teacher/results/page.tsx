
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
  useFormField,
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
  DialogTrigger,
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
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy, updateDoc, deleteDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/constants";

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[];
}

interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
}

const subjectResultSchema = z.object({
  subjectName: z.string().min(1, "Subject name is required."),
  score: z.string().optional(), // Can be numeric score or descriptive text like "N/A", "Exempted"
  grade: z.string().min(1, "Grade is required (e.g., A, B+, Pass)."),
  remarks: z.string().optional(),
});

const academicResultSchema = z.object({
  classId: z.string().min(1, "Class selection is required."), // GradeLevel of the student at time of result
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
  id: string; // Firestore document ID
  teacherId: string;
  teacherName: string;
  studentName: string; // Denormalized for display
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

export default function TeacherManageResultsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  
  const [studentsInClass, setStudentsInClass] = useState<RegisteredStudent[]>([]);
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
    const unsubscribeAuthState = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;
      if (user) {
        setCurrentUser(user);
        try {
          const teacherDocRef = doc(db, "teachers", user.uid);
          const teacherDocSnap = await getDoc(teacherDocRef);
          if (teacherDocSnap.exists()) {
            setTeacherProfile({ uid: teacherDocSnap.id, ...teacherDocSnap.data() } as TeacherProfile);
          } else {
            setError("Teacher profile not found.");
          }
        } catch (e: any) { setError(`Failed to load teacher data: ${e.message}`); }
      } else {
        setError("Not authenticated."); router.push("/auth/teacher/login");
      }
      setIsLoading(false);
    });
    return () => { isMounted.current = false; unsubscribeAuthState(); };
  }, [router]);

  useEffect(() => {
    if (watchClassId && isMounted.current) {
      setIsFetchingStudents(true);
      setStudentsInClass([]);
      form.setValue("studentId", ""); // Reset student selection
      const fetchStudents = async () => {
        try {
          const studentsQuery = query(collection(db, "students"), where("gradeLevel", "==", watchClassId));
          const studentSnapshots = await getDocs(studentsQuery);
          const fetchedStudents = studentSnapshots.docs.map(sDoc => ({
            studentId: sDoc.id, ...sDoc.data()
          } as RegisteredStudent)).sort((a,b) => a.fullName.localeCompare(b.fullName));
          if (isMounted.current) setStudentsInClass(fetchedStudents);
        } catch (e:any) {
          toast({title: "Error", description: `Failed to fetch students for ${watchClassId}: ${e.message}`, variant: "destructive"});
        } finally {
          if (isMounted.current) setIsFetchingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [watchClassId, form, toast]);

  useEffect(() => {
    if (watchStudentId && watchTerm && watchYear && isMounted.current) {
      setIsFetchingResults(true);
      const fetchResults = async () => {
        try {
          const resultsQuery = query(
            collection(db, "academicResults"),
            where("studentId", "==", watchStudentId),
            where("term", "==", watchTerm),
            where("year", "==", watchYear),
            orderBy("createdAt", "desc")
          );
          const resultsSnapshot = await getDocs(resultsQuery);
          const fetched = resultsSnapshot.docs.map(rDoc => ({
            id: rDoc.id, ...rDoc.data()
          } as AcademicResultEntry));
          if (isMounted.current) setExistingResults(fetched);
        } catch (e:any) {
          toast({title: "Error", description: `Failed to fetch existing results: ${e.message}`, variant: "destructive"});
        } finally {
          if (isMounted.current) setIsFetchingResults(false);
        }
      };
      fetchResults();
    } else {
       if (isMounted.current) setExistingResults([]);
    }
  }, [watchStudentId, watchTerm, watchYear, toast]);

  const handleOpenFormDialog = (result?: AcademicResultEntry) => {
    if (result) {
      setCurrentResultToEdit(result);
      form.reset({
        classId: result.classId,
        studentId: result.studentId,
        term: result.term,
        year: result.year,
        subjectResults: result.subjectResults.map(sr => ({...sr})), // Ensure deep copy
        overallAverage: result.overallAverage || "",
        overallGrade: result.overallGrade || "",
        overallRemarks: result.overallRemarks || "",
      });
    } else {
      setCurrentResultToEdit(null);
      // Retain class, student, term, year if already selected for new entry
      form.reset({
        classId: form.getValues("classId") || "",
        studentId: form.getValues("studentId") || "",
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
    if (!currentUser || !teacherProfile) {
      toast({ title: "Error", description: "Authentication or profile error.", variant: "destructive" });
      return;
    }
    const student = studentsInClass.find(s => s.studentId === data.studentId);
    if (!student) {
      toast({ title: "Error", description: "Selected student not found.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    const resultData: Omit<AcademicResultEntry, 'id' | 'createdAt' | 'updatedAt'> & {updatedAt: any, createdAt?: any} = {
      ...data,
      teacherId: currentUser.uid,
      teacherName: teacherProfile.fullName,
      studentName: student.fullName, // Denormalized student name
      updatedAt: serverTimestamp(),
    };

    try {
      if (currentResultToEdit) { // Editing existing result
        const resultRef = doc(db, "academicResults", currentResultToEdit.id);
        await updateDoc(resultRef, resultData);
        toast({ title: "Success", description: "Academic result updated successfully." });
      } else { // Creating new result
        resultData.createdAt = serverTimestamp();
        // Check if a result for this student, term, and year already exists.
        // This is better done with a transaction or a more specific query if strict uniqueness is required.
        // For simplicity, we'll overwrite or allow multiple if not careful.
        // A unique document ID like studentId_term_year could enforce this.
        const newDocRef = await addDoc(collection(db, "academicResults"), resultData);
        toast({ title: "Success", description: "Academic result saved successfully." });
      }
      
      // Refresh results list
      if (watchStudentId && watchTerm && watchYear) {
        setIsFetchingResults(true);
        const resultsQuery = query(collection(db, "academicResults"), where("studentId", "==", watchStudentId), where("term", "==", watchTerm), where("year", "==", watchYear), orderBy("createdAt", "desc"));
        const resultsSnapshot = await getDocs(resultsQuery);
        if(isMounted.current) setExistingResults(resultsSnapshot.docs.map(rDoc => ({id: rDoc.id, ...rDoc.data()} as AcademicResultEntry)));
        if(isMounted.current) setIsFetchingResults(false);
      }
      setIsFormDialogOpen(false);

    } catch (e: any) {
      console.error("Error saving academic result:", e);
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
    if (!resultToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "academicResults", resultToDelete.id));
      toast({ title: "Success", description: "Academic result deleted." });
      setExistingResults(prev => prev.filter(r => r.id !== resultToDelete.id));
      setIsDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to delete result: ${e.message}`, variant: "destructive" });
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
        Select class, student, term, and year to view, add, or manage academic results. Results are saved to Firestore.
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
                <SelectContent>{studentsInClass.map(s => <SelectItem key={s.studentId} value={s.studentId}>{s.fullName}</SelectItem>)}</SelectContent>
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
            {watchStudentId && studentsInClass.find(s=>s.studentId === watchStudentId) && ` for ${studentsInClass.find(s=>s.studentId === watchStudentId)?.fullName}`}
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
                        <CardTitle className="text-md">Result Entry (Updated: {format(result.updatedAt.toDate(), "PPP 'at' h:mm a")})</CardTitle>
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
              For Student: {studentsInClass.find(s => s.studentId === form.getValues("studentId"))?.fullName || "N/A"} |
              Class: {form.getValues("classId")} | Term: {form.getValues("term")} | Year: {form.getValues("year")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-2">
              {/* Hidden fields for studentId, classId, term, year as they are selected outside */}
              <input type="hidden" {...form.register("studentId")} />
              <input type="hidden" {...form.register("classId")} />
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
                {Array.isArray(form.formState.errors.subjectResults) && form.formState.errors.subjectResults.length > 0 && !form.formState.errors.subjectResults.root && (
                     <p className="text-sm font-medium text-destructive">Please fill all required fields for each subject.</p>
                )}
              </div>
              <Separator/>
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
