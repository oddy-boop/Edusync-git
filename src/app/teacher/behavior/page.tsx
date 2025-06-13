
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
import { CalendarIcon, ClipboardList, PlusCircle, ListChecks, Loader2, AlertCircle, Users, Trash2, Edit } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
// Firebase auth imports removed
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, BEHAVIOR_INCIDENT_TYPES, REGISTERED_TEACHERS_KEY, REGISTERED_STUDENTS_KEY, BEHAVIOR_INCIDENTS_KEY, TEACHER_LOGGED_IN_UID_KEY } from "@/lib/constants";

// Teacher profile structure from localStorage
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[];
}

// Student data structure from localStorage
interface RegisteredStudent {
  studentId: string;
  fullName: string;
  gradeLevel: string;
}

// Behavior Incident data structure for localStorage
interface BehaviorIncident {
  id: string; // Unique ID for the incident
  studentId: string;
  studentName: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  type: string;
  description: string;
  date: string; // ISO Date string
  createdAt: string; // ISO DateTime string
  updatedAt?: string; // ISO DateTime string
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

  const [teacherUid, setTeacherUid] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<RegisteredStudent | null>(null);
  
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
    setIsLoadingTeacherData(true);
    if (typeof window !== 'undefined') {
      const uidFromStorage = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (uidFromStorage) {
        setTeacherUid(uidFromStorage);
        try {
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          const allTeachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          const profile = allTeachers.find(t => t.uid === uidFromStorage);
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
    if (isMounted.current) setIsLoadingTeacherData(false);
    
    return () => { isMounted.current = false; };
  }, [router]);

  const handleClassSelect = async (classId: string) => {
    if (!isMounted.current || typeof window === 'undefined') return;
    setSelectedClass(classId);
    setSelectedStudent(null);
    setIncidents([]);
    setErrorStudents(null);
    setIsLoadingStudents(true);
    try {
      const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      const allStudents: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      const fetchedStudents = allStudents
        .filter(s => s.gradeLevel === classId)
        .sort((a,b) => a.fullName.localeCompare(b.fullName));
      if (isMounted.current) {
        setStudentsByClass(prev => ({ ...prev, [classId]: fetchedStudents }));
        if (fetchedStudents.length === 0) {
            setErrorStudents("No students found for this class in local records.");
        }
      }
    } catch (e: any) {
      if (isMounted.current) setErrorStudents(`Failed to fetch students from localStorage: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingStudents(false);
    }
  };

  const handleStudentSelect = async (studentId: string) => {
    if (!selectedClass || !studentsByClass[selectedClass] || typeof window === 'undefined') return;
    const student = studentsByClass[selectedClass].find(s => s.studentId === studentId);
    if (!isMounted.current || !student) return;
    
    setSelectedStudent(student);
    setErrorIncidents(null);
    setIsLoadingIncidents(true);
    try {
      const incidentsRaw = localStorage.getItem(BEHAVIOR_INCIDENTS_KEY);
      const allIncidents: BehaviorIncident[] = incidentsRaw ? JSON.parse(incidentsRaw) : [];
      const fetchedIncidents = allIncidents
        .filter(inc => inc.studentId === student.studentId)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by incident date
      if (isMounted.current) setIncidents(fetchedIncidents);
    } catch (e: any) {
      if (isMounted.current) setErrorIncidents(`Failed to fetch incidents from localStorage: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingIncidents(false);
    }
  };

  const onLogIncidentSubmit = async (data: IncidentFormData) => {
    if (!teacherUid || !teacherProfile || !selectedStudent || !selectedClass || typeof window === 'undefined') {
      toast({ title: "Error", description: "Missing required data or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const incidentsRaw = localStorage.getItem(BEHAVIOR_INCIDENTS_KEY);
      let allIncidents: BehaviorIncident[] = incidentsRaw ? JSON.parse(incidentsRaw) : [];
      const nowISO = new Date().toISOString();

      const newIncident: BehaviorIncident = {
        id: `BHV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.fullName,
        classId: selectedClass,
        teacherId: teacherUid, // Use UID from local session
        teacherName: teacherProfile.fullName,
        type: data.type,
        description: data.description,
        date: data.date.toISOString().split('T')[0], // Store date as YYYY-MM-DD string
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      allIncidents.push(newIncident);
      localStorage.setItem(BEHAVIOR_INCIDENTS_KEY, JSON.stringify(allIncidents));
      
      toast({ title: "Success", description: "Behavior incident logged." });
      setIncidents(prev => [newIncident, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLogIncidentDialogOpen(false);
      form.reset({ type: "", description: "", date: new Date() });
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to log incident: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };
  
  const handleOpenEditDialog = (incident: BehaviorIncident) => {
    setCurrentIncidentToEdit(incident);
    editForm.reset({
        type: incident.type,
        description: incident.description,
        date: new Date(incident.date), // Convert ISO string back to Date object for calendar
    });
    setIsEditIncidentDialogOpen(true);
  };

  const onEditIncidentSubmit = async (data: IncidentFormData) => {
    if (!currentIncidentToEdit || typeof window === 'undefined') return;
    setIsSubmitting(true);
    try {
        const incidentsRaw = localStorage.getItem(BEHAVIOR_INCIDENTS_KEY);
        let allIncidents: BehaviorIncident[] = incidentsRaw ? JSON.parse(incidentsRaw) : [];
        const incidentIndex = allIncidents.findIndex(inc => inc.id === currentIncidentToEdit.id);

        if (incidentIndex > -1) {
          allIncidents[incidentIndex] = {
            ...allIncidents[incidentIndex],
            type: data.type,
            description: data.description,
            date: data.date.toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(BEHAVIOR_INCIDENTS_KEY, JSON.stringify(allIncidents));
          toast({ title: "Success", description: "Incident updated." });
          setIncidents(prev => prev.map(inc => inc.id === currentIncidentToEdit.id ? allIncidents[incidentIndex] : inc).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setIsEditIncidentDialogOpen(false);
          setCurrentIncidentToEdit(null);
        } else {
          toast({title: "Error", description: "Incident to edit not found in local storage.", variant: "destructive"})
        }
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to update incident: ${e.message}`, variant: "destructive"});
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (incident: BehaviorIncident) => {
    setIncidentToDelete(incident);
    setIsDeleteIncidentDialogOpen(true);
  };
  
  const confirmDeleteIncident = async () => {
    if (!incidentToDelete || typeof window === 'undefined') return;
    setIsSubmitting(true);
    try {
        const incidentsRaw = localStorage.getItem(BEHAVIOR_INCIDENTS_KEY);
        let allIncidents: BehaviorIncident[] = incidentsRaw ? JSON.parse(incidentsRaw) : [];
        const updatedIncidents = allIncidents.filter(inc => inc.id !== incidentToDelete.id);
        localStorage.setItem(BEHAVIOR_INCIDENTS_KEY, JSON.stringify(updatedIncidents));

        toast({ title: "Success", description: "Incident deleted."});
        setIncidents(prev => prev.filter(inc => inc.id !== incidentToDelete.id));
        setIsDeleteIncidentDialogOpen(false);
        setIncidentToDelete(null);
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to delete incident: ${e.message}`, variant: "destructive"});
    } finally {
       if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (isLoadingTeacherData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading teacher data...</p></div>;
  }
  if (error && !teacherProfile) { // Show critical error only if profile couldn't be loaded
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile && !isLoadingTeacherData) { // Fallback if profile is null after loading
    return <p className="text-muted-foreground">Teacher profile not available. Please contact an administrator.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <ClipboardList className="mr-3 h-8 w-8" /> Student Behavior Tracking
        </h2>
        <p className="text-sm text-muted-foreground">Teacher: {teacherProfile.fullName}</p>
      </div>
      <CardDescription>
        Select a class and student to view or log behavior incidents. Incidents are saved to local browser storage.
      </CardDescription>
      {error && teacherProfile && ( // Display non-critical error if profile loaded but other issues occurred
         <Card className="border-amber-500 bg-amber-500/10 text-amber-700 my-4"><CardHeader><CardTitle className="flex items-center"><AlertCircle/>Notice</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 xl:w-1/4 space-y-4 flex-shrink-0">
          <Card className="shadow-md">
            <CardHeader><CardTitle className="text-lg">1. Select Class</CardTitle></CardHeader>
            <CardContent>
              <Select onValueChange={handleClassSelect} value={selectedClass || ""}>
                <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                <SelectContent>
                  {teacherProfile.assignedClasses.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedClass && (
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">2. Select Student</CardTitle></CardHeader>
              <CardContent>
                {isLoadingStudents && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Loading students...</span></div>}
                {errorStudents && <p className="text-sm text-destructive">{errorStudents}</p>}
                {!isLoadingStudents && !errorStudents && studentsByClass[selectedClass] && studentsByClass[selectedClass].length > 0 && (
                  <Select onValueChange={handleStudentSelect} value={selectedStudent?.studentId || ""}>
                    <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                    <SelectContent>
                      {studentsByClass[selectedClass].map(s => <SelectItem key={s.studentId} value={s.studentId}>{s.fullName} ({s.studentId})</SelectItem>)}
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
                {selectedStudent ? ` for ${selectedStudent.fullName}` : (selectedClass ? ` for ${selectedClass}` : "")}
              </CardTitle>
              <CardDescription>
                {selectedStudent ? `Showing incidents for ${selectedStudent.fullName}.` : selectedClass ? "Select a student to see their incidents." : "Select a class and student to view incidents."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingIncidents && <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>Loading incidents...</span></div>}
              {errorIncidents && <p className="text-destructive text-center py-4">{errorIncidents}</p>}
              {!isLoadingIncidents && !errorIncidents && incidents.length === 0 && selectedStudent && (
                <p className="text-muted-foreground text-center py-6">No behavior incidents logged for {selectedStudent.fullName} yet.</p>
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
                                {format(new Date(incident.date), "PPP")} {/* Format date for display */}
                            </CardDescription>
                        </div>
                        <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(incident)} className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(incident)} className="h-7 w-7 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
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
            <DialogTitle>Log New Behavior Incident for {selectedStudent?.fullName}</DialogTitle>
            <DialogDescription>Fill in the details of the incident.</DialogDescription>
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
                <DialogTitle>Edit Behavior Incident for {currentIncidentToEdit.studentName}</DialogTitle>
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
                        Are you sure you want to delete this incident for {incidentToDelete.studentName} (Type: {incidentToDelete.type})? This action cannot be undone.
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
    
