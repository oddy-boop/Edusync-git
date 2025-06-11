
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
import { CalendarIcon, ClipboardList, PlusCircle, ListChecks, Loader2, AlertCircle, Users, Trash2, Edit } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, BEHAVIOR_INCIDENT_TYPES } from "@/lib/constants";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


// Firestore teacher profile
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[];
}

// Student data structure from Firestore
interface RegisteredStudent {
  studentId: string; // Document ID from Firestore
  fullName: string;
  gradeLevel: string;
}

// Behavior Incident data structure
interface BehaviorIncident {
  id: string; // Firestore document ID
  studentId: string;
  studentName: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  type: string;
  description: string;
  date: Timestamp;
  createdAt: Timestamp;
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

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  
  const [studentsByClass, setStudentsByClass] = useState<Record<string, RegisteredStudent[]>>({});
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<RegisteredStudent | null>(null);
  
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  
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
      setIsLoadingTeacherData(false);
    });
    return () => { isMounted.current = false; unsubscribeAuthState(); };
  }, [router]);

  const handleClassSelect = async (classId: string) => {
    if (!isMounted.current) return;
    setSelectedClass(classId);
    setSelectedStudent(null);
    setIncidents([]);
    setErrorStudents(null);
    setIsLoadingStudents(true);
    try {
      const studentsQuery = query(collection(db, "students"), where("gradeLevel", "==", classId));
      const studentSnapshots = await getDocs(studentsQuery);
      const fetchedStudents = studentSnapshots.docs.map(sDoc => ({
        studentId: sDoc.id, ...sDoc.data()
      } as RegisteredStudent)).sort((a,b) => a.fullName.localeCompare(b.fullName));
      if (isMounted.current) {
        setStudentsByClass(prev => ({ ...prev, [classId]: fetchedStudents }));
        if (fetchedStudents.length === 0) {
            setErrorStudents("No students found for this class.");
        }
      }
    } catch (e: any) {
      if (isMounted.current) setErrorStudents(`Failed to fetch students: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingStudents(false);
    }
  };

  const handleStudentSelect = async (studentId: string) => {
    if (!selectedClass || !studentsByClass[selectedClass]) return;
    const student = studentsByClass[selectedClass].find(s => s.studentId === studentId);
    if (!isMounted.current || !student) return;
    
    setSelectedStudent(student);
    setErrorIncidents(null);
    setIsLoadingIncidents(true);
    try {
      const incidentsQuery = query(
        collection(db, "behaviorIncidents"),
        where("studentId", "==", student.studentId),
        orderBy("date", "desc")
      );
      const incidentSnapshots = await getDocs(incidentsQuery);
      const fetchedIncidents = incidentSnapshots.docs.map(iDoc => ({
        id: iDoc.id, ...iDoc.data()
      } as BehaviorIncident));
      if (isMounted.current) setIncidents(fetchedIncidents);
    } catch (e: any) {
      if (isMounted.current) setErrorIncidents(`Failed to fetch incidents: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingIncidents(false);
    }
  };

  const onLogIncidentSubmit = async (data: IncidentFormData) => {
    if (!currentUser || !teacherProfile || !selectedStudent || !selectedClass) {
      toast({ title: "Error", description: "Missing required data.", variant: "destructive" });
      return;
    }
    try {
      const newIncident: Omit<BehaviorIncident, 'id'> = {
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.fullName,
        classId: selectedClass,
        teacherId: currentUser.uid,
        teacherName: teacherProfile.fullName,
        type: data.type,
        description: data.description,
        date: Timestamp.fromDate(data.date),
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "behaviorIncidents"), newIncident);
      toast({ title: "Success", description: "Behavior incident logged." });
      setIncidents(prev => [{ id: docRef.id, ...newIncident } as BehaviorIncident, ...prev].sort((a,b) => b.date.toMillis() - a.date.toMillis()));
      setIsLogIncidentDialogOpen(false);
      form.reset({ type: "", description: "", date: new Date() });
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to log incident: ${e.message}`, variant: "destructive" });
    }
  };
  
  const handleOpenEditDialog = (incident: BehaviorIncident) => {
    setCurrentIncidentToEdit(incident);
    editForm.reset({
        type: incident.type,
        description: incident.description,
        date: incident.date.toDate(),
    });
    setIsEditIncidentDialogOpen(true);
  };

  const onEditIncidentSubmit = async (data: IncidentFormData) => {
    if (!currentIncidentToEdit) return;
    try {
        const incidentRef = doc(db, "behaviorIncidents", currentIncidentToEdit.id);
        await updateDoc(incidentRef, {
            type: data.type,
            description: data.description,
            date: Timestamp.fromDate(data.date),
        });
        toast({ title: "Success", description: "Incident updated." });
        setIncidents(prev => prev.map(inc => inc.id === currentIncidentToEdit.id ? {...inc, ...data, date: Timestamp.fromDate(data.date)} : inc).sort((a,b) => b.date.toMillis() - a.date.toMillis()));
        setIsEditIncidentDialogOpen(false);
        setCurrentIncidentToEdit(null);
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to update incident: ${e.message}`, variant: "destructive"});
    }
  };

  const handleOpenDeleteDialog = (incident: BehaviorIncident) => {
    setIncidentToDelete(incident);
    setIsDeleteIncidentDialogOpen(true);
  };
  
  const confirmDeleteIncident = async () => {
    if (!incidentToDelete) return;
    try {
        await deleteDoc(doc(db, "behaviorIncidents", incidentToDelete.id));
        toast({ title: "Success", description: "Incident deleted."});
        setIncidents(prev => prev.filter(inc => inc.id !== incidentToDelete.id));
        setIsDeleteIncidentDialogOpen(false);
        setIncidentToDelete(null);
    } catch (e:any) {
        toast({ title: "Error", description: `Failed to delete incident: ${e.message}`, variant: "destructive"});
    }
  };


  if (isLoadingTeacherData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading teacher data...</p></div>;
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
          <ClipboardList className="mr-3 h-8 w-8" /> Student Behavior Tracking
        </h2>
        <p className="text-sm text-muted-foreground">Teacher: {teacherProfile.fullName}</p>
      </div>
      <CardDescription>
        Select a class and student to view or log behavior incidents. Incidents are saved to Firestore.
      </CardDescription>

      <div className="flex flex-col md:flex-row gap-6"> {/* Main layout: stacks on small, side-by-side on medium+ */}
        {/* Left Column: Selection Panel */}
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

        {/* Right Column: Incidents Display */}
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
                                {format(incident.date.toDate(), "PPP 'at' h:mm a")}
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

      {/* Log New Incident Dialog */}
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
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log Incident
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Incident Dialog */}
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
                        <Button type="submit" disabled={editForm.formState.isSubmitting}>
                            {editForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Incident Confirmation Dialog */}
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
                    <AlertDialogAction onClick={confirmDeleteIncident} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        Delete Incident
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}


    