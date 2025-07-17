
"use client";

import { useEffect, useState, useRef } from "react";
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
import { CalendarIcon, ClipboardList, PlusCircle, ListChecks, Loader2, AlertCircle, Users, Trash2, Edit, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BEHAVIOR_INCIDENT_TYPES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface TeacherProfileFromSupabase {
  id: string; 
  auth_user_id: string; 
  full_name: string;
  email: string;
  assigned_classes: string[];
}

interface StudentFromSupabase {
  student_id_display: string;
  full_name: string;
  grade_level: string;
}

interface BehaviorIncident {
  id: string;
  student_id_display: string;
  student_name: string;
  class_id: string; 
  teacher_id: string;
  teacher_name: string;
  type: string;
  description: string;
  date: string; // YYYY-MM-DD
  created_at: string; 
  updated_at?: string; 
}

const incidentSchema = z.object({
  type: z.string().min(1, "Incident type is required."),
  description: z.string().min(5, "Description must be at least 5 characters.").max(500, "Description must be 500 characters or less."),
  date: z.date({ required_error: "Incident date is required." }),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function TeacherBehaviorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileFromSupabase | null>(null);
  
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentFromSupabase[]>>({});
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentFromSupabase | null>(null);
  
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isLogIncidentDialogOpen, setIsLogIncidentDialogOpen] = useState(false);
  const [isEditIncidentDialogOpen, setIsEditIncidentDialogOpen] = useState(false);
  const [currentIncidentToEdit, setCurrentIncidentToEdit] = useState<BehaviorIncident | null>(null);
  const [isDeleteIncidentDialogOpen, setIsDeleteIncidentDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<BehaviorIncident | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [errorStudents, setErrorStudents] = useState<string | null>(null);
  const [errorIncidents, setErrorIncidents] = useState<string | null>(null);

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: "", description: "", date: new Date() },
  });

  const editForm = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
  });

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    async function fetchTeacherProfile() {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoadingTeacherData(true);
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabaseRef.current.auth.getSession();
      if (sessionError || !session?.user) {
        if(isMounted.current) {
          setError("Not authenticated. Please login.");
          router.push("/auth/teacher/login");
        }
        setIsLoadingTeacherData(false);
        return;
      }
      
      try {
        const { data: profileData, error: profileError } = await supabaseRef.current
          .from('teachers')
          .select('id, auth_user_id, full_name, email, assigned_classes')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profileError) throw profileError;
        
        if (isMounted.current) {
            setTeacherProfile(profileData as TeacherProfileFromSupabase);
        }
      } catch (e: any) { 
        if (isMounted.current) setError(`Failed to load teacher data: ${e.message}`); 
      } finally {
        if (isMounted.current) setIsLoadingTeacherData(false);
      }
    }
    
    fetchTeacherProfile();
    
    return () => { isMounted.current = false; };
  }, [router]);

  const handleClassSelect = async (classId: string) => {
    if (!isMounted.current || !supabaseRef.current) return;
    setSelectedClass(classId);
    setSelectedStudent(null);
    setIncidents([]);
    setErrorStudents(null);
    setIsLoadingStudents(true);
    try {
      const { data: fetchedStudents, error: studentsError } = await supabaseRef.current
        .from('students')
        .select('student_id_display, full_name, grade_level')
        .eq('grade_level', classId)
        .order('full_name', { ascending: true });

      if (studentsError) throw studentsError;

      if (isMounted.current) {
        setStudentsByClass(prev => ({ ...prev, [classId]: fetchedStudents as StudentFromSupabase[] || [] }));
        if (!fetchedStudents || fetchedStudents.length === 0) {
            setErrorStudents("No students found for this class in records.");
        }
      }
    } catch (e: any) {
      if (isMounted.current) setErrorStudents(`Failed to fetch students: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingStudents(false);
    }
  };

  const handleStudentSelect = async (student_id_display: string) => {
    if (!selectedClass || !studentsByClass[selectedClass] || !supabaseRef.current) return;
    const student = studentsByClass[selectedClass].find(s => s.student_id_display === student_id_display);
    if (!isMounted.current || !student) return;
    
    setSelectedStudent(student);
    setErrorIncidents(null);
    setIsLoadingIncidents(true);
    try {
      const { data: fetchedIncidents, error: fetchError } = await supabaseRef.current
        .from('behavior_incidents')
        .select('*')
        .eq('student_id_display', student.student_id_display)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (isMounted.current) setIncidents(fetchedIncidents as BehaviorIncident[] || []);

    } catch (e: any) {
      if (isMounted.current) setErrorIncidents(`Failed to fetch incidents: ${e.message}`);
      toast({title: "Error", description: `Could not fetch incidents: ${e.message}`, variant: "destructive"});
    } finally {
      if (isMounted.current) setIsLoadingIncidents(false);
    }
  };

  const onLogIncidentSubmit = async (data: IncidentFormData) => {
    if (!teacherProfile || !selectedStudent || !selectedClass || !supabaseRef.current) {
      toast({ title: "Error", description: "Missing required teacher, student, or class data.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newIncidentPayload = {
        student_id_display: selectedStudent.student_id_display,
        student_name: selectedStudent.full_name,
        class_id: selectedClass, 
        teacher_id: teacherProfile.id,
        teacher_name: teacherProfile.full_name,
        type: data.type,
        description: data.description,
        date: format(data.date, "yyyy-MM-dd"),
      };

      const { data: insertedIncident, error: insertError } = await supabaseRef.current
        .from('behavior_incidents')
        .insert(newIncidentPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      
      toast({ title: "Success", description: "Behavior incident logged." });
      if (isMounted.current && insertedIncident) {
        setIncidents(prev => [insertedIncident as BehaviorIncident, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      setIsLogIncidentDialogOpen(false);
      form.reset({ type: "", description: "", date: new Date() });
    } catch (e: any) {
      const isRLSError = (e.message && e.message.toLowerCase().includes("violates row-level security policy")) || (JSON.stringify(e) === '{}');
      const errorMessage = isRLSError 
        ? "Permission denied. Please ensure the latest database security policies from `policies.md` have been applied in the Supabase SQL Editor."
        : e.message || "An unknown error occurred.";
        
      console.error("Error logging incident:", errorMessage, isRLSError ? "(Likely RLS Policy Error)" : "", e);
      
      toast({
        title: "Error Logging Incident",
        description: `Failed to log incident: ${errorMessage}`,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };
  
  const handleOpenEditDialog = (incident: BehaviorIncident) => {
    setCurrentIncidentToEdit(incident);
    editForm.reset({
        type: incident.type,
        description: incident.description,
        date: new Date(incident.date + "T00:00:00"),
    });
    setIsEditIncidentDialogOpen(true);
  };

  const onEditIncidentSubmit = async (data: IncidentFormData) => {
    if (!currentIncidentToEdit || !teacherProfile || !supabaseRef.current) {
         toast({ title: "Error", description: "Data missing for edit.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const incidentUpdatePayload = {
            type: data.type,
            description: data.description,
            date: format(data.date, "yyyy-MM-dd"),
            updated_at: new Date().toISOString(),
        };
        
        const { data: updatedIncident, error: updateError } = await supabaseRef.current
            .from('behavior_incidents')
            .update(incidentUpdatePayload)
            .eq('id', currentIncidentToEdit.id)
            .eq('teacher_id', teacherProfile.id)
            .select()
            .single();

        if (updateError) throw updateError;
        
        toast({ title: "Success", description: "Incident updated." });
        if (isMounted.current && updatedIncident) {
            setIncidents(prev => prev.map(inc => inc.id === currentIncidentToEdit.id ? (updatedIncident as BehaviorIncident) : inc).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
        setIsEditIncidentDialogOpen(false);
        setCurrentIncidentToEdit(null);
    } catch (e:any) {
        const isRLSError = (e.message && e.message.toLowerCase().includes("violates row-level security policy")) || (JSON.stringify(e) === '{}');
        const errorMessage = isRLSError 
            ? "Permission denied. Please ensure the latest database security policies from `policies.md` have been applied."
            : e.message || "An unknown error occurred.";

        console.error("Error updating incident:", errorMessage, isRLSError ? "(Likely RLS Policy Error)" : "", e);
        
        toast({
            title: "Error Updating Incident",
            description: `Failed to update incident: ${errorMessage}`,
            variant: "destructive",
            duration: 9000,
        });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (incident: BehaviorIncident) => {
    setIncidentToDelete(incident);
    setIsDeleteIncidentDialogOpen(true);
  };
  
  const confirmDeleteIncident = async () => {
    if (!incidentToDelete || !teacherProfile || !supabaseRef.current) {
        toast({ title: "Error", description: "Data missing for delete.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const { error: deleteError } = await supabaseRef.current
            .from('behavior_incidents')
            .delete()
            .eq('id', incidentToDelete.id)
            .eq('teacher_id', teacherProfile.id);

        if (deleteError) throw deleteError;

        toast({ title: "Success", description: "Incident deleted."});
        if (isMounted.current) {
            setIncidents(prev => prev.filter(inc => inc.id !== incidentToDelete.id));
        }
        setIsDeleteIncidentDialogOpen(false);
        setIncidentToDelete(null);
    } catch (e:any) {
        console.error("Error deleting incident:", e);
        toast({ title: "Error", description: `Failed to delete incident: ${e.message}`, variant: "destructive"});
    } finally {
       if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (isLoadingTeacherData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading teacher data...</p></div>;
  }
  if (error && !teacherProfile) { 
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile && !isLoadingTeacherData) { 
    return <p className="text-muted-foreground">Teacher profile not available. Please contact an administrator.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8" /> Student Behavior Tracking
        </h2>
        <p className="text-sm text-muted-foreground">Teacher: {teacherProfile.full_name}</p>
      </div>
      <CardDescription>
        Select a class and student to view or log behavior incidents.
      </CardDescription>
      {error && teacherProfile && ( 
         <Card className="border-amber-500 bg-amber-500/10 text-amber-700 my-4"><CardHeader><CardTitle className="flex items-center"><AlertCircle/>Notice</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 xl:w-1/4 space-y-4 flex-shrink-0">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">1. Select Class</CardTitle></CardHeader>
            <CardContent>
              <Select onValueChange={handleClassSelect} value={selectedClass || ""} disabled={!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0}>
                <SelectTrigger><SelectValue placeholder={teacherProfile.assigned_classes.length === 0 ? "No classes assigned" : "Choose a class"} /></SelectTrigger>
                <SelectContent>
                  {(teacherProfile.assigned_classes || []).map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                </SelectContent>
              </Select>
               {!teacherProfile.assigned_classes || teacherProfile.assigned_classes.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">You are not assigned to any classes.</p>
              )}
            </CardContent>
          </Card>

          {selectedClass && (
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">2. Select Student</CardTitle></CardHeader>
              <CardContent>
                {isLoadingStudents && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading students...</span></div>}
                {errorStudents && <p className="text-sm text-destructive">{errorStudents}</p>}
                {!isLoadingStudents && !errorStudents && studentsByClass[selectedClass] && studentsByClass[selectedClass].length > 0 && (
                  <Select onValueChange={handleStudentSelect} value={selectedStudent?.student_id_display || ""}>
                    <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                    <SelectContent>
                      {studentsByClass[selectedClass].map(s => <SelectItem key={s.student_id_display} value={s.student_id_display}>{s.full_name} ({s.student_id_display})</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {!isLoadingStudents && !errorStudents && (!studentsByClass[selectedClass] || studentsByClass[selectedClass].length === 0) && !errorStudents && (
                    <p className="text-sm text-muted-foreground">No students found for {selectedClass}.</p>
                )}
              </CardContent>
            </Card>
          )}

          {selectedStudent && (
            <Button onClick={() => { form.reset({ type: "", description: "", date: new Date() }); setIsLogIncidentDialogOpen(true);}} className="w-full py-3 text-base" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Log New Incident
            </Button>
          )}
        </div>

        <div className="w-full md:flex-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <ListChecks className="mr-2 h-6 w-6" /> Logged Incidents
                {selectedStudent ? ` for ${selectedStudent.full_name}` : (selectedClass ? ` for ${selectedClass}` : "")}
              </CardTitle>
              <CardDescription>
                {selectedStudent ? `Showing incidents for ${selectedStudent.full_name}.` : selectedClass ? "Select a student to see their incidents." : "Select a class and student to view incidents."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingIncidents && <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>Loading incidents...</span></div>}
              {errorIncidents && <p className="text-destructive text-center py-4">{errorIncidents}</p>}
              {!isLoadingIncidents && !errorIncidents && incidents.length === 0 && selectedStudent && (
                <p className="text-muted-foreground text-center py-6">No behavior incidents logged for {selectedStudent.full_name} yet.</p>
              )}
              {!selectedStudent && !isLoadingIncidents && (
                  <p className="text-muted-foreground text-center py-6">Select a student to view their incidents.</p>
              )}
              {!isLoadingIncidents && !errorIncidents && incidents.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {incidents.map((incident) => (
                    <Card key={incident.id} className="bg-secondary/30 shadow-sm">
                      <CardHeader className="pb-2 flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-md">{incident.type}</CardTitle>
                            <CardDescription className="text-xs">
                                {format(new Date(incident.date + "T00:00:00"), "PPP")} 
                            </CardDescription>
                        </div>
                        {incident.teacher_id === teacherProfile.id && (
                          <div className="flex space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(incident)} className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(incident)} className="h-7 w-7 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Reported by: {incident.teacher_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isLogIncidentDialogOpen} onOpenChange={setIsLogIncidentDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Log New Behavior Incident for {selectedStudent?.full_name}</DialogTitle>
            <DialogDescription>Fill in the details of the incident. This will be saved.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onLogIncidentSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date of Incident</FormLabel>
                  <Popover><PopoverTrigger asChild>
                      <FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus />
                  </PopoverContent></Popover><FormMessage />
                </FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type of Incident</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select incident type" /></SelectTrigger></FormControl>
                    <SelectContent>{BEHAVIOR_INCIDENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Detailed description of the incident..." {...field} rows={4} /></FormControl>
                <FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLogIncidentDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
                  {(isSubmitting || form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log Incident
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {currentIncidentToEdit && (
        <Dialog open={isEditIncidentDialogOpen} onOpenChange={setIsEditIncidentDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>Edit Behavior Incident for {currentIncidentToEdit.student_name}</DialogTitle>
                <DialogDescription>Modify the details of the incident.</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditIncidentSubmit)} className="space-y-4 py-4">
                    <FormField control={editForm.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date of Incident</FormLabel>
                        <Popover><PopoverTrigger asChild>
                            <FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl>
                        </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus />
                        </PopoverContent></Popover><FormMessage />
                        </FormItem>)} />
                    <FormField control={editForm.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Type of Incident</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select incident type" /></SelectTrigger></FormControl>
                            <SelectContent>{BEHAVIOR_INCIDENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>)} />
                    <FormField control={editForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel>
                        <FormControl><Textarea placeholder="Detailed description of the incident..." {...field} rows={4} /></FormControl>
                        <FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditIncidentDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || editForm.formState.isSubmitting}>
                            {(isSubmitting || editForm.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {incidentToDelete && (
        <AlertDialog open={isDeleteIncidentDialogOpen} onOpenChange={setIsDeleteIncidentDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this incident for {incidentToDelete.student_name} (Type: {incidentToDelete.type})? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsDeleteIncidentDialogOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteIncident} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Incident
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
