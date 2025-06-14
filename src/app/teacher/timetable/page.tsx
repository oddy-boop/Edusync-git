
"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { CalendarDays, PlusCircle, Edit, Trash2, Loader2, AlertCircle, ChevronDown, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type UseFormReturn, Controller, type FieldValues } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, DAYS_OF_WEEK, TIMETABLE_ENTRIES_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfile {
  id: string; // Corresponds to Supabase 'teachers' table 'id' (UUID)
  full_name: string; // Corresponds to Supabase 'teachers' table 'full_name'
  email: string;
  assigned_classes: string[];
}

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

const periodSlotSchema = z.object({
  startTime: z.string().regex(timeRegex, "Invalid start time (HH:mm). Example: 09:00"),
  endTime: z.string().regex(timeRegex, "Invalid end time (HH:mm). Example: 10:30"),
  subjects: z.array(z.string()).min(1, "At least one subject is required."),
  classNames: z.array(z.string()).min(1, "At least one class/group is required."),
}).refine(data => {
    if (!data.startTime || !data.endTime || !timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) return true;
    const start = parse(data.startTime, "HH:mm", new Date());
    const end = parse(data.endTime, "HH:mm", new Date());
    return end > start;
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

const timetableEntrySchema = z.object({
  dayOfWeek: z.string().min(1, "Day of the week is required."),
  periods: z.array(periodSlotSchema).min(1, "At least one period slot is required for the day."),
});

type TimetableEntryFormData = z.infer<typeof timetableEntrySchema>;

interface TimetableEntry {
  id: string; // teacherId_dayOfWeek
  teacherId: string;
  dayOfWeek: string;
  periods: Array<{
    startTime: string;
    endTime: string;
    subjects: string[];
    classNames: string[];
  }>;
  createdAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}


export default function TeacherTimetablePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherUid, setTeacherUid] = useState<string | null>(null); // This will store the Supabase teacher ID (UUID)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingTimetable, setIsFetchingTimetable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentEntryToEdit, setCurrentEntryToEdit] = useState<TimetableEntry | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);

  const formHook = useForm<TimetableEntryFormData>({
    resolver: zodResolver(timetableEntrySchema),
    defaultValues: {
      dayOfWeek: "",
      periods: [{ startTime: "", endTime: "", subjects: [], classNames: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: formHook.control,
    name: "periods",
  });

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(true);
    supabaseRef.current = getSupabase();

    async function fetchTeacherAndTimetableData() {
      if (!isMounted.current || !supabaseRef.current) return;
      
      if (typeof window !== 'undefined') {
        const uidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
        if (uidFromStorage) {
          setTeacherUid(uidFromStorage);
          try {
            // Fetch teacher profile from Supabase
            const { data: profileData, error: profileError } = await supabaseRef.current
              .from('teachers')
              .select('id, full_name, email, assigned_classes')
              .eq('id', uidFromStorage)
              .single();

            if (profileError) throw profileError;
            
            if (profileData) {
              if (isMounted.current) {
                setTeacherProfile(profileData as TeacherProfile);
                await fetchTimetableEntriesFromLocalStorage(uidFromStorage);
              }
            } else {
              if (isMounted.current) setError("Teacher profile not found in Supabase records.");
            }
          } catch (e: any) {
            console.error("Error fetching teacher profile from Supabase:", e);
            if (isMounted.current) setError(`Failed to load teacher data from Supabase: ${e.message}`);
          }
        } else {
          if (isMounted.current) {
            setError("Not authenticated. Please login.");
            router.push("/auth/teacher/login");
          }
        }
      }
      if (isMounted.current) setIsLoading(false);
    }
    
    fetchTeacherAndTimetableData();
    
    return () => { isMounted.current = false; };
  }, [router]);


  const fetchTimetableEntriesFromLocalStorage = async (currentTeacherSupabaseId: string) => {
    if (!isMounted.current || !currentTeacherSupabaseId || typeof window === 'undefined') return;
    
    if (isMounted.current) setIsFetchingTimetable(true);
    try {
      const timetableRaw = localStorage.getItem(TIMETABLE_ENTRIES_KEY);
      const allEntries: TimetableEntry[] = timetableRaw ? JSON.parse(timetableRaw) : [];
      const teacherEntries = allEntries.filter(entry => entry.teacherId === currentTeacherSupabaseId);

      if (isMounted.current) {
        setTimetableEntries(teacherEntries.sort((a, b) =>
          DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek)
        ));
      }
    } catch (e: any) {
      console.error("Error fetching timetable entries from localStorage:", e);
      if (isMounted.current) setError(`Failed to fetch timetable from localStorage: ${e.message}`);
      toast({ title: "Error Fetching Timetable", description: `Could not load timetable from local storage: ${e.message}`, variant: "destructive" });
    } finally {
       if (isMounted.current) setIsFetchingTimetable(false);
    }
  };

  const handleOpenFormDialog = (entry?: TimetableEntry) => {
    if (entry) {
      setCurrentEntryToEdit(entry);
      formHook.reset({
        dayOfWeek: entry.dayOfWeek,
        periods: entry.periods.map(p => ({ ...p, subjects: [...p.subjects], classNames: [...p.classNames] })),
      });
    } else {
      setCurrentEntryToEdit(null);
      formHook.reset({
        dayOfWeek: "",
        periods: [{ startTime: "", endTime: "", subjects: [], classNames: [] }],
      });
    }
    setIsFormDialogOpen(true);
  };

  const onFormSubmit = async (data: TimetableEntryFormData) => {
    if (!teacherUid || !teacherProfile || typeof window === 'undefined') { // Use teacherUid (Supabase ID) and teacherProfile
      toast({ title: "Error", description: "Not authenticated or user profile missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const docId = currentEntryToEdit ? currentEntryToEdit.id : `${teacherUid}_${data.dayOfWeek}`;
    
    try {
      const timetableRaw = localStorage.getItem(TIMETABLE_ENTRIES_KEY);
      let allEntries: TimetableEntry[] = timetableRaw ? JSON.parse(timetableRaw) : [];
      const nowISO = new Date().toISOString();

      const newEntryData: Omit<TimetableEntry, 'id' | 'createdAt'> & { id?: string, createdAt?: string } = {
        teacherId: teacherUid, // Use Supabase ID
        dayOfWeek: data.dayOfWeek,
        periods: data.periods,
        updatedAt: nowISO,
      };

      if (currentEntryToEdit) {
        const index = allEntries.findIndex(e => e.id === currentEntryToEdit.id);
        if (index > -1) {
          allEntries[index] = { ...allEntries[index], ...newEntryData, id: currentEntryToEdit.id };
        } else { 
           toast({ title: "Error", description: "Entry to edit not found.", variant: "destructive" });
           setIsSubmitting(false); return;
        }
      } else {
        const existingIndex = allEntries.findIndex(e => e.id === docId);
        if (existingIndex > -1) { 
             allEntries[existingIndex] = { ...allEntries[existingIndex], ...newEntryData, id: docId, createdAt: allEntries[existingIndex].createdAt || nowISO };
        } else {
            (newEntryData as TimetableEntry).id = docId;
            (newEntryData as TimetableEntry).createdAt = nowISO;
            allEntries.push(newEntryData as TimetableEntry);
        }
      }
      
      localStorage.setItem(TIMETABLE_ENTRIES_KEY, JSON.stringify(allEntries));

      toast({ title: "Success", description: `Timetable for ${data.dayOfWeek} ${currentEntryToEdit ? 'updated' : 'saved'}.` });

      if (teacherUid) {
        await fetchTimetableEntriesFromLocalStorage(teacherUid);
      }
      setIsFormDialogOpen(false);
    } catch (e: any) {
      console.error("Error saving timetable entry to localStorage:", e);
      toast({ title: "Error Saving Timetable", description: `Failed to save entry: ${e.message}.`, variant: "destructive" });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (entry: TimetableEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete || !teacherUid || typeof window === 'undefined') {
        toast({ title: "Error", description: "Entry or user information missing for deletion.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const timetableRaw = localStorage.getItem(TIMETABLE_ENTRIES_KEY);
        let allEntries: TimetableEntry[] = timetableRaw ? JSON.parse(timetableRaw) : [];
        const updatedEntries = allEntries.filter(e => e.id !== entryToDelete.id);
        localStorage.setItem(TIMETABLE_ENTRIES_KEY, JSON.stringify(updatedEntries));

        toast({ title: "Success", description: "Timetable entry deleted."});
        if (teacherUid) {
            await fetchTimetableEntriesFromLocalStorage(teacherUid);
        }
        setIsDeleteDialogOpen(false);
        setEntryToDelete(null);
    } catch (e:any) {
        console.error("Error deleting timetable entry from localStorage:", e);
        toast({ title: "Error Deleting Timetable", description: `Failed to delete entry: ${e.message}`, variant: "destructive" });
    } finally {
        if(isMounted.current) setIsSubmitting(false);
    }
  };

  const renderTimetableForm = () => (
    <Form {...formHook}>
      <form onSubmit={formHook.handleSubmit(onFormSubmit)} className="space-y-4 py-2">
        <FormField control={formHook.control} name="dayOfWeek" render={({ field }) => (
          <FormItem><FormLabel>Day of the Week</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={!!currentEntryToEdit} 
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger></FormControl>
              <SelectContent>{DAYS_OF_WEEK.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
            </Select><FormMessage />
          </FormItem>)} />

        <div>
          <Label className="text-lg font-medium mb-2 block">Periods</Label>
          {fields.map((fieldItem, index) => (
            <Card key={fieldItem.id} className="mb-4 p-4 space-y-3 relative border-border">
               <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="absolute top-2 right-2 h-6 w-6 text-destructive hover:bg-destructive/10"
                disabled={fields.length <= 1}
              >
                <MinusCircle className="h-4 w-4" />
                <span className="sr-only">Remove Period</span>
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={formHook.control} name={`periods.${index}.startTime`} render={({ field }) => (
                  <FormItem><FormLabel>Start Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl><FormMessage />
                  </FormItem>)} />
                <FormField control={formHook.control} name={`periods.${index}.endTime`} render={({ field }) => (
                  <FormItem><FormLabel>End Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl><FormMessage />
                  </FormItem>)} />
              </div>
               <Controller
                  control={formHook.control}
                  name={`periods.${index}.subjects` as const}
                  defaultValue={[]}
                  render={({ field: controllerField, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Subject(s)</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            {controllerField.value && controllerField.value.length > 0 ? `${controllerField.value.length} subject(s) selected` : "Select subject(s)"}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                          <DropdownMenuLabel>Available Subjects</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SUBJECTS.map((subj) => (
                            <DropdownMenuCheckboxItem
                              key={subj}
                              checked={controllerField.value?.includes(subj)}
                              onCheckedChange={(isChecked) => {
                                const currentSelected = controllerField.value || [];
                                const newSelected = isChecked
                                  ? [...currentSelected, subj]
                                  : currentSelected.filter((s) => s !== subj);
                                controllerField.onChange(newSelected);
                              }}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {subj}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                    </FormItem>
                  )}
                />
                <Controller
                  control={formHook.control}
                  name={`periods.${index}.classNames` as const}
                  defaultValue={[]}
                  render={({ field: controllerField, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Class/Group(s)</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="justify-between w-full">
                            {controllerField.value && controllerField.value.length > 0 ? `${controllerField.value.length} class(es) selected` : "Select class(es)/group(s)"}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                          <DropdownMenuLabel>Available Classes/Groups</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {GRADE_LEVELS.map((grade) => (
                            <DropdownMenuCheckboxItem
                              key={grade}
                              checked={controllerField.value?.includes(grade)}
                              onCheckedChange={(isChecked) => {
                                const currentSelected = controllerField.value || [];
                                const newSelected = isChecked
                                  ? [...currentSelected, grade]
                                  : currentSelected.filter((c) => c !== grade);
                                controllerField.onChange(newSelected);
                              }}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {grade}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                    </FormItem>
                  )}
                />
            </Card>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ startTime: "", endTime: "", subjects: [], classNames: [] })}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Period Slot
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentEntryToEdit ? "Save Changes" : "Save Day's Schedule")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading timetable page...</p>
      </div>
    );
  }

  if (error && !isFetchingTimetable && !teacherProfile) { 
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Error</CardTitle></CardHeader>
        <CardContent>
            <p className="font-semibold mb-1">Failed to load page data.</p>
            <p className="text-sm mb-3">{error}</p>
            {error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}
        </CardContent>
      </Card>
    );
  }

  if (!teacherProfile && !isLoading) { 
    return <p className="text-muted-foreground text-center py-6">Teacher profile not available. Please ensure you are logged in and your profile is set up.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <CalendarDays className="mr-3 h-8 w-8" /> My Teaching Timetable
        </h2>
        <Button onClick={() => handleOpenFormDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add/Edit Day's Schedule
        </Button>
      </div>
      <CardDescription>
        Manage your weekly teaching schedule. Each day can have multiple period slots. Entries are saved to local browser storage.
      </CardDescription>

      {isFetchingTimetable && (
         <div className="flex justify-center items-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">Fetching timetable entries...</p>
        </div>
      )}

      {!isFetchingTimetable && error && teacherProfile && ( 
          <Card className="border-amber-500 bg-amber-500/10 text-amber-700">
            <CardHeader><CardTitle className="flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Timetable Notice</CardTitle></CardHeader>
            <CardContent><p className="text-sm mb-3">{error}</p></CardContent>
          </Card>
      )}

      {!isFetchingTimetable && !error && DAYS_OF_WEEK.map(day => {
        const dayEntry = timetableEntries.find(entry => entry.dayOfWeek === day);
        return (
          <Card key={day} className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-xl text-primary/90">{day}</CardTitle>
                {dayEntry && (
                    <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenFormDialog(dayEntry)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleOpenDeleteDialog(dayEntry)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
              {dayEntry && dayEntry.periods.length > 0 ? (
                dayEntry.periods.sort((a,b) => a.startTime.localeCompare(b.startTime)).map((period, periodIndex) => (
                  <Card key={periodIndex} className="bg-secondary/40 p-3 rounded-md">
                    <div>
                      <p className="font-semibold">{period.startTime} - {period.endTime}</p>
                      <p className="text-sm text-foreground/80">
                        Subjects: {(period.subjects || []).join(', ') || 'N/A'}
                      </p>
                      <p className="text-sm text-foreground/80">
                        Classes: {(period.classNames || []).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dayEntry ? "No periods scheduled for this day." : "No schedule for this day. Click 'Add/Edit Day's Schedule' to add entries."}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
      {!isFetchingTimetable && !error && timetableEntries.length === 0 && (
        <Card className="mt-4">
            <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Your timetable is currently empty. Click "Add/Edit Day's Schedule" to get started.</p>
            </CardContent>
        </Card>
      )}

    <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{currentEntryToEdit ? `Edit Schedule for ${currentEntryToEdit.dayOfWeek}` : "Add New Day's Schedule"}</DialogTitle>
                <DialogDescription>
                    {currentEntryToEdit ? "Modify periods for this day." : "Select a day and add period slots with their subjects and classes."}
                </DialogDescription>
            </DialogHeader>
            {renderTimetableForm()}
        </DialogContent>
    </Dialog>

    {entryToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the entire schedule for
                        <strong> {entryToDelete.dayOfWeek}</strong>?
                        This action cannot be undone and will remove all periods for this day.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {setIsDeleteDialogOpen(false); setEntryToDelete(null);}}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteEntry} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Day's Schedule
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </div>
  );
}
