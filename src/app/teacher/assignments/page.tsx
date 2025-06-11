
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Edit, PlusCircle, ListChecks, Loader2, AlertCircle, BookUp } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form"; // Import Controller
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS } from "@/lib/constants"; // Import GRADE_LEVELS

// Firestore teacher profile
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  assignedClasses: string[]; // Still useful for other parts of the app or default views
}

// Assignment data structure in Firestore
interface Assignment {
  id: string; // Firestore document ID
  teacherId: string;
  teacherName: string;
  classId: string; // e.g., "Basic 1" from GRADE_LEVELS
  title: string;
  description: string;
  dueDate: Timestamp;
  createdAt: Timestamp;
}

const assignmentSchema = z.object({
  classId: z.string().min(1, "Target class is required."), // Add classId to schema
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  dueDate: z.date({ required_error: "Due date is required." }).refine(date => date >= startOfDay(new Date()), {
    message: "Due date cannot be in the past.",
  }),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function TeacherAssignmentsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [selectedClassForFiltering, setSelectedClassForFiltering] = useState<string>(""); // For viewing assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      classId: "",
      title: "",
      description: "",
      dueDate: undefined,
    },
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
            const profile = teacherDocSnap.data() as TeacherProfile;
            setTeacherProfile(profile);
            // No longer setting error if assignedClasses is empty for this page's primary purpose
          } else {
            setError("Teacher profile not found. Please contact admin.");
          }
        } catch (e: any) {
          console.error("Error fetching teacher profile:", e);
          setError(`Failed to load teacher data: ${e.message}`);
        }
      } else {
        setError("Not authenticated. Please login.");
        router.push("/auth/teacher/login");
      }
      setIsLoading(false);
    });
    return () => {
      isMounted.current = false;
      unsubscribeAuthState();
    };
  }, [router]);

  useEffect(() => {
    if (!selectedClassForFiltering || !currentUser) {
      setAssignments([]);
      return;
    }
    const fetchAssignments = async () => {
      if (!isMounted.current) return;
      setIsFetchingAssignments(true);
      try {
        const assignmentsQuery = query(
          collection(db, "assignments"),
          // No longer filtering by teacherId for viewing, so any teacher can see assignments for a class if needed.
          // OR, keep filtering by teacherId if only their own assignments for that class should be shown.
          // For now, let's assume a teacher sees assignments they created for that class.
          where("teacherId", "==", currentUser.uid),
          where("classId", "==", selectedClassForFiltering),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(assignmentsQuery);
        const fetchedAssignments = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Assignment));
        if (isMounted.current) setAssignments(fetchedAssignments);
      } catch (e: any) {
        console.error("Error fetching assignments:", e);
        toast({ title: "Error", description: `Failed to fetch assignments: ${e.message}`, variant: "destructive" });
      } finally {
        if (isMounted.current) setIsFetchingAssignments(false);
      }
    };
    fetchAssignments();
  }, [selectedClassForFiltering, currentUser, toast]);

  const onSubmitAssignment = async (data: AssignmentFormData) => {
    if (!currentUser || !teacherProfile ) { // Removed !selectedClass check here as it's part of form data
      toast({ title: "Error", description: "Missing required data (user or profile).", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newAssignment: Omit<Assignment, 'id'> = {
        teacherId: currentUser.uid,
        teacherName: teacherProfile.fullName,
        classId: data.classId, // Use classId from form data
        title: data.title,
        description: data.description,
        dueDate: Timestamp.fromDate(data.dueDate),
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "assignments"), newAssignment);
      toast({ title: "Success", description: "Assignment created successfully for " + data.classId });
      form.reset();
      setShowAssignmentForm(false);
      // Refresh assignments list if the created assignment was for the currently filtered class
      if (data.classId === selectedClassForFiltering) {
        setAssignments(prev => [{ id: docRef.id, ...newAssignment }, ...prev].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      }
    } catch (e: any) {
      console.error("Error creating assignment:", e);
      toast({ title: "Error", description: `Failed to create assignment: ${e.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading assignment data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!teacherProfile) { // Handles case where profile fetch failed or still loading (though isLoading should catch first)
     return <p className="text-muted-foreground">Teacher profile still loading or not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Edit className="mr-3 h-8 w-8" /> Assignment Management
        </h2>
        {/* This dropdown is now for FILTERING the list of assignments */}
        {teacherProfile && (
            <div className="w-full sm:w-auto min-w-[200px]">
                 <Select value={selectedClassForFiltering} onValueChange={setSelectedClassForFiltering}>
                    <SelectTrigger id="class-filter-select">
                        <SelectValue placeholder="View assignments for class..." />
                    </SelectTrigger>
                    <SelectContent>
                        {GRADE_LEVELS.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>
      <CardDescription>
        Create new assignments for any class, or select a class above to view its existing assignments.
      </CardDescription>

      {teacherProfile && ( // Only show creation form if teacher profile exists
        <>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-xl">Create New Assignment</CardTitle>
              <Button onClick={() => {
                setShowAssignmentForm(!showAssignmentForm);
                if (!showAssignmentForm) form.reset({ classId: "", title: "", description: "", dueDate: undefined }); // Reset form when opening
              }} variant="outline" size="sm">
                {showAssignmentForm ? "Cancel" : <><PlusCircle className="mr-2 h-4 w-4" /> Add Assignment</>}
              </Button>
            </CardHeader>
            {showAssignmentForm && (
              <form onSubmit={form.handleSubmit(onSubmitAssignment)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="classId-form">Target Class</Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger id="classId-form">
                              <SelectValue placeholder="Select target class for this assignment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADE_LEVELS.map(cls => (
                              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage>{form.formState.errors.classId?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="title">Assignment Title</Label>
                        <Input id="title" placeholder="e.g., Chapter 5 Reading Comprehension" {...field} />
                        <FormMessage>{form.formState.errors.title?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="description">Description / Instructions</Label>
                        <Textarea id="description" placeholder="Provide detailed instructions for the assignment..." {...field} rows={5}/>
                        <FormMessage>{form.formState.errors.description?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="dueDate"
                              variant={"outline"}
                              className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a due date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={(date) => date < startOfDay(new Date())}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage>{form.formState.errors.dueDate?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Saving..." : <><BookUp className="mr-2 h-4 w-4" /> Create Assignment</>}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>

          {selectedClassForFiltering && (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ListChecks className="mr-2 h-6 w-6 text-primary" /> Assignments for {selectedClassForFiltering}
                </CardTitle>
                <CardDescription>List of assignments you have created for this class.</CardDescription>
              </CardHeader>
              <CardContent>
                {isFetchingAssignments ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><p>Loading assignments...</p></div>
                ) : assignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No assignments found for {selectedClassForFiltering} yet. Use the form above to create one.</p>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <Card key={assignment.id} className="bg-secondary/30">
                        <CardHeader className="pb-3 pt-4 px-5">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <CardDescription className="text-xs">
                            Due: {format(assignment.dueDate.toDate(), "PPP 'at' h:mm a")} | Created: {format(assignment.createdAt.toDate(), "PPP")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                          <p className="text-sm whitespace-pre-wrap line-clamp-3">{assignment.description}</p>
                        </CardContent>
                        <CardFooter className="px-5 py-3 border-t">
                          <Button variant="link" size="sm" className="p-0 h-auto text-primary">View Details / Submissions</Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedClassForFiltering && teacherProfile && (
         <Card className="shadow-md border-dashed mt-6">
            <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Please select a class from the dropdown above to view its assignments, or use the form to create a new assignment for any class.</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}

    