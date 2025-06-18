
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
import { CalendarDays, PlusCircle, Edit, Trash2, Loader2, AlertCircle, ChevronDown, MinusCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type UseFormReturn, Controller, type FieldValues } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, DAYS_OF_WEEK, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TeacherProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  assigned_classes: string[];
}

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

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

// Matches Supabase `timetable_entries` table
interface TimetableEntryFromSupabase {
  id: string; // UUID from Supabase
  teacher_id: string; // PK from `teachers` table
  day_of_week: string;
  periods: Array<{
    startTime: string;
    endTime: string;
    subjects: string[];
    classNames: string[];
  }>;
  created_at: string;
  updated_at?: string;
}

export default function TeacherTimetablePage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntryFromSupabase[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingTimetable, setIsFetchingTimetable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentEntryToEdit, setCurrentEntryToEdit] = useState<TimetableEntryFromSupabase | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntryFromSupabase | null>(null);

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
        const authUidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
        if (authUidFromStorage) {
          setTeacherAuthUid(authUidFromStorage);
          try {
            const { data: profileData, error: profileError } = await supabaseRef.current
              .from('teachers')
              .select('id, auth_user_id, full_name, email, assigned_classes')
              .eq('auth_user_id', authUidFromStorage)
              .single();

            if (profileError) throw profileError;

            if (profileData) {
              if (isMounted.current) {
                setTeacherProfile(profileData as TeacherProfile);
                await fetchTimetableEntriesFromSupabase(profileData.id); // Use teacherProfile.id
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

  const fetchTimetableEntriesFromSupabase = async (currentTeacherProfileId: string) => {
    if (!isMounted.current || !currentTeacherProfileId || !supabaseRef.current) return;

    if (isMounted.current) setIsFetchingTimetable(true);
    try {
      const { data, error: fetchError } = await supabaseRef.current
        .from('timetable_entries')
        .select('*')
        .eq('teacher_id', currentTeacherProfileId); // Filter by teacher's profile ID

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setTimetableEntries((data as TimetableEntryFromSupabase[] || []).sort((a, b) =>
          DAYS_OF_WEEK.indexOf(a.day_of_week) - DAYS_OF_WEEK.indexOf(b.day_of_week)
        ));
      }
    } catch (e: any) {
      let userMessage = "An unknown error occurred while fetching timetable entries.";
      let consoleErrorMessage = `Error fetching timetable entries from Supabase: ${e}`; // Default for non-standard errors

      if (e && typeof e === 'object' && Object.keys(e).length === 0 && !(e instanceof Error)) {
        userMessage = "Could not fetch timetable entries. This might be due to access permissions (RLS) or no entries being available for your account. Please check console for technical details.";
        consoleErrorMessage = "Error fetching timetable entries from Supabase: Received an empty error object. This often indicates RLS issues. Ensure: \n1. The 'timetable_entries' table exists and has correct RLS policies allowing teachers to SELECT their own entries (e.g., based on matching 'teacher_id' which is the PK from the 'teachers' table). \n2. The 'teachers' table RLS policy allows the logged-in teacher to SELECT their own profile (to correctly obtain 'teacher_id' for the timetable query). \n3. The 'teacher_id' column in 'timetable_entries' is correctly populated and matches the 'id' (PK) from the 'teachers' table.";
      } else if (e instanceof Error) {
        userMessage = `Could not load timetable: ${e.message}`;
        consoleErrorMessage = `Error fetching timetable entries from Supabase: ${e.message}`;
        if (e.message.toLowerCase().includes("relation \"public.timetable_entries\" does not exist")) {
          userMessage = "Failed to load timetable: The database table 'timetable_entries' is missing. Please create this table in your Supabase project using the SQL provided previously.";
          consoleErrorMessage = "CRITICAL: The 'timetable_entries' table does not exist in the public schema of your Supabase database.";
        }
      } else if (e && typeof e === 'object') { // Catch other object errors that are not empty and not Error instances
        consoleErrorMessage = "Error fetching timetable entries from Supabase. Raw error object details:\n";
        for (const key in e) {
          if (Object.prototype.hasOwnProperty.call(e, key)) {
            consoleErrorMessage += `  ${key}: ${e[key]}\n`;
          }
        }
        if (Object.keys(e).length === 0) { // Should be caught above, but as fallback
            consoleErrorMessage = "Error fetching timetable entries from Supabase: Received an empty object that wasn't an Error instance.";
        }
      }


      console.error(consoleErrorMessage, e);
      if (isMounted.current) setError(userMessage);
      toast({ title: "Error Fetching Timetable", description: userMessage, variant: "destructive" });
    } finally {
       if (isMounted.current) setIsFetchingTimetable(false);
    }
  };

  const handleOpenFormDialog = (entry?: TimetableEntryFromSupabase) => {
    if (entry) {
      setCurrentEntryToEdit(entry);
      formHook.reset({
        dayOfWeek: entry.day_of_week,
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
    if (!teacherAuthUid || !teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "Not authenticated or user profile missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      teacher_id: teacherProfile.id, // Use the PK from 'teachers' table
      day_of_week: data.dayOfWeek,
      periods: data.periods,
      updated_at: new Date().toISOString(),
    };

    try {
      if (currentEntryToEdit) { // Editing existing entry
        const { data: updatedData, error: updateError } = await supabaseRef.current
          .from('timetable_entries')
          .update(payload)
          .eq('id', currentEntryToEdit.id)
          .eq('teacher_id', teacherProfile.id) // Ensure teacher owns the record
          .select()
          .single();
        if (updateError) throw updateError;
        toast({ title: "Success", description: `Timetable for ${data.dayOfWeek} updated in Supabase.` });
      } else { // Creating new entry
        // Check if an entry for this teacher and day already exists
        const { data: existingEntry, error: checkError } = await supabaseRef.current
            .from('timetable_entries')
            .select('id')
            .eq('teacher_id', teacherProfile.id)
            .eq('day_of_week', data.dayOfWeek)
            .maybeSingle();
        if (checkError) throw checkError;

        if (existingEntry) { // If exists, update it
             const { data: updatedData, error: updateError } = await supabaseRef.current
                .from('timetable_entries')
                .update(payload)
                .eq('id', existingEntry.id)
                .select()
                .single();
            if (updateError) throw updateError;
            toast({ title: "Success", description: `Timetable for ${data.dayOfWeek} updated in Supabase (existing entry found).` });
        } else { // Else, insert new
            const { data: insertedData, error: insertError } = await supabaseRef.current
                .from('timetable_entries')
                .insert({ ...payload, created_at: new Date().toISOString()})
                .select()
                .single();
            if (insertError) throw insertError;
            toast({ title: "Success", description: `Timetable for ${data.dayOfWeek} saved to Supabase.` });
        }
      }

      if (teacherProfile.id) {
        await fetchTimetableEntriesFromSupabase(teacherProfile.id);
      }
      setIsFormDialogOpen(false);
    } catch (e: any) {
      console.error("Error saving timetable entry to Supabase:", e);
      toast({ title: "Database Error", description: `Failed to save entry to Supabase: ${e.message}.`, variant: "destructive" });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (entry: TimetableEntryFromSupabase) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete || !teacherProfile || !supabaseRef.current) {
        toast({ title: "Error", description: "Entry or user information missing for deletion.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const { error: deleteError } = await supabaseRef.current
            .from('timetable_entries')
            .delete()
            .eq('id', entryToDelete.id)
            .eq('teacher_id', teacherProfile.id); // Ensure teacher owns the record

        if (deleteError) throw deleteError;

        toast({ title: "Success", description: "Timetable entry deleted from Supabase."});
        if (teacherProfile.id) {
            await fetchTimetableEntriesFromSupabase(teacherProfile.id);
        }
        setIsDeleteDialogOpen(false);
        setEntryToDelete(null);
    } catch (e:any) {
        console.error("Error deleting timetable entry from Supabase:", e);
        toast({ title: "Database Error", description: `Failed to delete entry from Supabase: ${e.message}`, variant: "destructive" });
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
                          {(teacherProfile?.assigned_classes || GRADE_LEVELS).map((grade) => (
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
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            {currentEntryToEdit ? "Save Changes" : "Save Day's Schedule"}
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
        Manage your weekly teaching schedule. Each day can have multiple period slots. Entries are saved to Supabase.
      </CardDescription>

      {isFetchingTimetable && (
         <div className="flex justify-center items-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">Fetching timetable entries from Supabase...</p>
        </div>
      )}

      {!isFetchingTimetable && error && teacherProfile && (
          <Card className="border-amber-500 bg-amber-500/10 text-amber-700">
            <CardHeader><CardTitle className="flex items-center"><AlertCircle className="h-5 w-5 mr-2"/> Timetable Notice</CardTitle></CardHeader>
            <CardContent><p className="text-sm mb-3">{error}</p></CardContent>
          </Card>
      )}

      {!isFetchingTimetable && !error && DAYS_OF_WEEK.map(day => {
        const dayEntry = timetableEntries.find(entry => entry.day_of_week === day);
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
                <DialogTitle>{currentEntryToEdit ? `Edit Schedule for ${currentEntryToEdit.day_of_week}` : "Add New Day's Schedule"}</DialogTitle>
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
                        <strong> {entryToDelete.day_of_week}</strong> from Supabase?
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

