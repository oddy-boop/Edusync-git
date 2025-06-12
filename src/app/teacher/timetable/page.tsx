
"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Keep if used directly, else FormLabel is preferred within FormField
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CalendarDays, PlusCircle, Edit, Trash2, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, DAYS_OF_WEEK } from "@/lib/constants";
import { format, parse } from "date-fns";

// Firestore teacher profile
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[]; 
}

interface TimetableEntry {
  id: string; // Firestore document ID
  teacherId: string;
  dayOfWeek: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  subject: string[]; // Array of subjects
  className: string[]; // Array of class names/groups
  createdAt: Timestamp;
}

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

const timetableEntrySchema = z.object({
  dayOfWeek: z.string().min(1, "Day of the week is required."),
  startTime: z.string().regex(timeRegex, "Invalid start time format (HH:mm)."),
  endTime: z.string().regex(timeRegex, "Invalid end time format (HH:mm)."),
  subject: z.array(z.string()).min(1, "At least one subject is required."),
  className: z.array(z.string()).min(1, "At least one class/group is required."),
}).refine(data => {
    const start = parse(data.startTime, "HH:mm", new Date());
    const end = parse(data.endTime, "HH:mm", new Date());
    return end > start;
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

type TimetableEntryFormData = z.infer<typeof timetableEntrySchema>;

export default function TeacherTimetablePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEntryToEdit, setCurrentEntryToEdit] = useState<TimetableEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);

  const form = useForm<TimetableEntryFormData>({
    resolver: zodResolver(timetableEntrySchema),
    defaultValues: {
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      subject: [],
      className: [],
    },
  });
  
  const editForm = useForm<TimetableEntryFormData>({
    resolver: zodResolver(timetableEntrySchema),
    defaultValues: { // Default values for editForm will be set when dialog opens
      dayOfWeek: "",
      startTime: "",
      endTime: "",
      subject: [],
      className: [],
    }
  });

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
            await fetchTimetableEntries(user.uid);
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

  const fetchTimetableEntries = async (teacherId: string) => {
    if (!isMounted.current) return;
    setIsLoading(true); // Keep overall loading true until entries are fetched
    try {
      const q = query(
        collection(db, "timetableEntries"),
        where("teacherId", "==", teacherId)
        // Order by day then time in display logic if needed, Firestore can order by one field effectively for this structure
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as TimetableEntry));
      if (isMounted.current) {
        // Sort entries locally after fetching
        setTimetableEntries(entries.sort((a, b) => 
          DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) || 
          a.startTime.localeCompare(b.startTime)
        ));
      }
    } catch (e: any) {
      console.error("Error fetching timetable entries:", e);
      toast({ title: "Error", description: `Failed to fetch timetable: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const onAddEntrySubmit = async (data: TimetableEntryFormData) => {
    if (!currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newEntryFirestore: Omit<TimetableEntry, 'id'> = {
        teacherId: currentUser.uid,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        subject: data.subject,
        className: data.className,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "timetableEntries"), newEntryFirestore);
      toast({ title: "Success", description: "Timetable entry added." });
      // Add to local state and re-sort
      setTimetableEntries(prev => [...prev, { id: docRef.id, ...newEntryFirestore }].sort((a, b) => 
        DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) || 
        a.startTime.localeCompare(b.startTime)
      ));
      setIsAddEntryDialogOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to add entry: ${e.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = (entry: TimetableEntry) => {
    setCurrentEntryToEdit(entry);
    editForm.reset({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        subject: entry.subject || [], // Ensure it's an array
        className: entry.className || [], // Ensure it's an array
    });
    setIsEditDialogOpen(true);
  };

  const onEditEntrySubmit = async (data: TimetableEntryFormData) => {
    if (!currentEntryToEdit || !currentUser) return;
    setIsSubmitting(true);
    try {
        const entryRef = doc(db, "timetableEntries", currentEntryToEdit.id);
        const updatedData = { // Ensure we're only sending fields defined in TimetableEntryFormData
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            subject: data.subject,
            className: data.className,
        };
        await updateDoc(entryRef, updatedData);
        toast({ title: "Success", description: "Timetable entry updated." });
        setTimetableEntries(prev => prev.map(e => e.id === currentEntryToEdit.id ? {...e, ...updatedData} : e).sort((a, b) => 
            DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) || 
            a.startTime.localeCompare(b.startTime)
        ));
        setIsEditDialogOpen(false);
        setCurrentEntryToEdit(null);
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to update entry: ${e.message}`, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (entry: TimetableEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, "timetableEntries", entryToDelete.id));
        toast({ title: "Success", description: "Timetable entry deleted."});
        setTimetableEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
        setIsDeleteDialogOpen(false);
        setEntryToDelete(null);
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to delete entry: ${e.message}`, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderTimetableForm = (
    currentFormInstance: UseFormReturn<TimetableEntryFormData>, 
    submitHandler: (data: TimetableEntryFormData) => Promise<void>
  ) => (
    <Form {...currentFormInstance}>
      <form onSubmit={currentFormInstance.handleSubmit(submitHandler)} className="space-y-4 py-2">
        <FormField control={currentFormInstance.control} name="dayOfWeek" render={({ field }) => (
          <FormItem><FormLabel>Day of the Week</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger></FormControl>
              <SelectContent>{DAYS_OF_WEEK.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
            </Select><FormMessage />
          </FormItem>)} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={currentFormInstance.control} name="startTime" render={({ field }) => (
            <FormItem><FormLabel>Start Time (HH:mm)</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl><FormMessage />
            </FormItem>)} />
          <FormField control={currentFormInstance.control} name="endTime" render={({ field }) => (
            <FormItem><FormLabel>End Time (HH:mm)</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl><FormMessage />
            </FormItem>)} />
        </div>
        
        <FormField
          control={currentFormInstance.control}
          name="subject"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Subject(s)</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    {(field.value && field.value.length > 0)
                      ? `${field.value.length} subject(s) selected`
                      : "Select subject(s)"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                  <DropdownMenuLabel>Available Subjects</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SUBJECTS.map((subj) => (
                    <DropdownMenuCheckboxItem
                      key={subj}
                      checked={(field.value || []).includes(subj)}
                      onCheckedChange={(isChecked) => {
                        const currentSelected = field.value || [];
                        const newSelected = isChecked
                          ? [...currentSelected, subj]
                          : currentSelected.filter((s) => s !== subj);
                        field.onChange(newSelected);
                        currentFormInstance.trigger('subject'); 
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {subj}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={currentFormInstance.control}
          name="className"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Class/Group(s)</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between w-full">
                    {(field.value && field.value.length > 0)
                      ? `${field.value.length} class(es) selected`
                      : "Select class(es)/group(s)"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                  <DropdownMenuLabel>Available Classes/Groups</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {GRADE_LEVELS.map((grade) => ( // Assuming GRADE_LEVELS can be used for class names
                    <DropdownMenuCheckboxItem
                      key={grade}
                      checked={(field.value || []).includes(grade)}
                      onCheckedChange={(isChecked) => {
                        const currentSelected = field.value || [];
                        const newSelected = isChecked
                          ? [...currentSelected, grade]
                          : currentSelected.filter((c) => c !== grade);
                        field.onChange(newSelected);
                        currentFormInstance.trigger('className');
                      }}
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { setIsAddEntryDialogOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentEntryToEdit ? "Save Changes" : "Add Entry")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const groupedEntries = timetableEntries.reduce((acc, entry) => {
    (acc[entry.dayOfWeek] = acc[entry.dayOfWeek] || []).push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  if (isLoading && !error && timetableEntries.length === 0) { // Show loader if initial loading and no entries yet
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading timetable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader>
        <CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent>
      </Card>
    );
  }
  
  if (!teacherProfile && !isLoading) { // Added !isLoading check
    return <p className="text-muted-foreground">Teacher profile not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <CalendarDays className="mr-3 h-8 w-8" /> My Teaching Timetable
        </h2>
        <Dialog open={isAddEntryDialogOpen} onOpenChange={setIsAddEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { form.reset({dayOfWeek: "", startTime: "", endTime: "", subject: [], className: []}); setIsAddEntryDialogOpen(true);}}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Timetable Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]"> {/* Increased width for multi-select */}
            <DialogHeader>
              <DialogTitle>Add New Timetable Entry</DialogTitle>
              <DialogDescription>Fill in the details for your new schedule item. Select multiple subjects/classes if needed.</DialogDescription>
            </DialogHeader>
            {renderTimetableForm(form, onAddEntrySubmit)}
          </DialogContent>
        </Dialog>
      </div>
      <CardDescription>
        Manage your weekly teaching schedule. Entries are saved to Firestore. Select multiple subjects/classes from the dropdowns.
      </CardDescription>

      {DAYS_OF_WEEK.map(day => (
        <Card key={day} className="shadow-md">
          <CardHeader><CardTitle className="text-xl text-primary/90">{day}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(groupedEntries[day] && groupedEntries[day].length > 0) ? (
              groupedEntries[day].sort((a,b) => a.startTime.localeCompare(b.startTime)).map(entry => (
                <Card key={entry.id} className="bg-secondary/40 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{entry.startTime} - {entry.endTime}</p>
                      <p className="text-sm text-foreground/80">
                        Subjects: {Array.isArray(entry.subject) ? entry.subject.join(', ') : entry.subject}
                      </p>
                      <p className="text-sm text-foreground/80">
                        Classes: {Array.isArray(entry.className) ? entry.className.join(', ') : entry.className}
                      </p>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(entry)}><Edit className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleOpenDeleteDialog(entry)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No entries for {day}.</p>
            )}
          </CardContent>
        </Card>
      ))}
      {timetableEntries.length === 0 && !isLoading && (
        <Card className="mt-4">
            <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Your timetable is currently empty. Click "Add New Timetable Entry" to get started.</p>
            </CardContent>
        </Card>
      )}

    {/* Edit Dialog */}
    {currentEntryToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[525px]"> {/* Increased width */}
                <DialogHeader>
                    <DialogTitle>Edit Timetable Entry</DialogTitle>
                    <DialogDescription>Modify the details of this schedule item. Select multiple subjects/classes if needed.</DialogDescription>
                </DialogHeader>
                {renderTimetableForm(editForm, onEditEntrySubmit)}
            </DialogContent>
        </Dialog>
    )}

    {/* Delete Confirmation Dialog */}
    {entryToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this timetable entry: 
                        <strong> {(Array.isArray(entryToDelete.subject) ? entryToDelete.subject.join(', ') : entryToDelete.subject)} ({(Array.isArray(entryToDelete.className) ? entryToDelete.className.join(', ') : entryToDelete.className)}) on {entryToDelete.dayOfWeek} at {entryToDelete.startTime} - {entryToDelete.endTime}</strong>? 
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {setIsDeleteDialogOpen(false); setEntryToDelete(null);}}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteEntry} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Entry
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}

    </div>
  );
}

