
"use client";

import { useState, useEffect, type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  DropdownMenuTrigger as DDMTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit, Trash2, ChevronDown, UserCog, Search, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, ADMIN_LOGGED_IN_KEY } from "@/lib/constants";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

// Interface for payments from Supabase
interface FeePaymentFromSupabase {
  id: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; // YYYY-MM-DD
}

interface StudentFromSupabase {
  id: string; // UUID from Supabase
  student_id_display: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string;
  total_paid_override?: number | null;
  created_at: string; 
  updated_at: string;
  totalFeesDue?: number; // Calculated
  totalAmountPaid?: number; // Calculated from Supabase payments or override
}

interface TeacherFromSupabase {
  id: string; // UUID from Supabase
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
  password?: string; 
  created_at: string;
  updated_at: string;
}

interface FeeItemFromSupabase { 
  id: string;
  grade_level: string;
  term: string;
  description: string;
  amount: number;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);
  
  const [isAdminSessionActive, setIsAdminSessionActive] = useState(false);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [allStudents, setAllStudents] = useState<StudentFromSupabase[]>([]);
  const [teachers, setTeachers] = useState<TeacherFromSupabase[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeItemFromSupabase[]>([]);
  const [allPaymentsFromSupabase, setAllPaymentsFromSupabase] = useState<FeePaymentFromSupabase[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadingError, setDataLoadingError] = useState<string | null>(null);

  const [filteredAndSortedStudents, setFilteredAndSortedStudents] = useState<StudentFromSupabase[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [studentSortCriteria, setStudentSortCriteria] = useState<string>("full_name");

  const [filteredTeachers, setFilteredTeachers] = useState<TeacherFromSupabase[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>("");
  const [teacherSortCriteria, setTeacherSortCriteria] = useState<string>("full_name");

  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<StudentFromSupabase> | null>(null);

  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<TeacherFromSupabase> | null>(null);
  const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<string[]>([]);

  const [studentToDelete, setStudentToDelete] = useState<StudentFromSupabase | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherFromSupabase | null>(null);

  useEffect(() => {
    isMounted.current = true;

    const checkAuthAndLoadData = async () => {
      if (!isMounted.current) return;
      setIsCheckingAdminSession(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;
      
      if (session?.user && localAdminFlag) {
        if (isMounted.current) {
            setCurrentUser(session.user);
            setIsAdminSessionActive(true);
            await loadAllDataFromSupabase();
        }
      } else {
        if (sessionError) {
            console.error("User Management: Supabase session error:", sessionError.message);
        }
        if (isMounted.current) {
            setIsAdminSessionActive(false);
            setIsLoadingData(false); // Don't attempt to load data if not admin
        }
      }
      if (isMounted.current) setIsCheckingAdminSession(false);
    };
    
    const loadAllDataFromSupabase = async () => {
        if (!isMounted.current) return;
        setIsLoadingData(true);
        setDataLoadingError(null);
        try {
          const { data: feeData, error: feeError } = await supabase
            .from("school_fee_items")
            .select("id, grade_level, term, description, amount");
          if (feeError) throw feeError;
          if (isMounted.current) setFeeStructure(feeData || []);

          const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select("*")
            .order("full_name", { ascending: true });
          if (studentError) throw studentError;
          if (isMounted.current) setAllStudents(studentData || []);
          
          const { data: teacherData, error: teacherError } = await supabase
            .from("teachers")
            .select("*") 
            .order("full_name", { ascending: true });
          if (teacherError) throw teacherError;
          if (isMounted.current) setTeachers(teacherData || []);
          
          const { data: paymentsData, error: paymentsError } = await supabase
            .from("fee_payments")
            .select("id, student_id_display, amount_paid, payment_date");
          if (paymentsError) throw paymentsError;
          if (isMounted.current) setAllPaymentsFromSupabase(paymentsData || []);

        } catch (e: any) { 
            console.error("Error loading data for User Management from Supabase:", e);
            const errorMessage = `Could not load required data: ${e.message}. Some features might be affected.`;
            toast({title:"Error", description: errorMessage, variant:"destructive"});
            if (isMounted.current) setDataLoadingError(errorMessage);
        } finally {
            if (isMounted.current) setIsLoadingData(false);
        }
    };

    checkAuthAndLoadData();
    return () => { isMounted.current = false; };
  }, [supabase, toast]);

  
   useEffect(() => {
    if (!feeStructure || !allPaymentsFromSupabase) return; 

    let tempStudents = [...allStudents].map(student => {
      const studentFeesDue = feeStructure
        .filter(item => item.grade_level === student.grade_level)
        .reduce((sum, item) => sum + item.amount, 0);

      const studentTotalPaidFromSupabase = allPaymentsFromSupabase
        .filter(p => p.student_id_display === student.student_id_display)
        .reduce((sum, p) => sum + p.amount_paid, 0);

      return {
        ...student,
        totalFeesDue: studentFeesDue,
        totalAmountPaid: studentTotalPaidFromSupabase,
      };
    });

    if (studentSearchTerm) {
      tempStudents = tempStudents.filter(student =>
        student.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.student_id_display.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.grade_level.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    if (studentSortCriteria === "full_name") {
      tempStudents.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (studentSortCriteria === "student_id_display") {
      tempStudents.sort((a, b) => a.student_id_display.localeCompare(b.student_id_display));
    } else if (studentSortCriteria === "grade_level") {
      tempStudents.sort((a, b) => {
        const gradeA = a.grade_level || "";
        const gradeB = b.grade_level || "";
        const indexA = GRADE_LEVELS.indexOf(gradeA);
        const indexB = GRADE_LEVELS.indexOf(gradeB);
        const valA = indexA === -1 ? Infinity : indexA;
        const valB = indexB === -1 ? Infinity : indexB;

        if (valA !== valB) { return valA - valB; }
        return a.full_name.localeCompare(b.full_name);
      });
    }
    if (isMounted.current) setFilteredAndSortedStudents(tempStudents);
  }, [allStudents, studentSearchTerm, studentSortCriteria, feeStructure, allPaymentsFromSupabase]);

  
  useEffect(() => {
    let tempTeachers = [...teachers];
    if (teacherSearchTerm) {
      tempTeachers = tempTeachers.filter(teacher =>
        teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        (teacher.subjects_taught && teacher.subjects_taught.toLowerCase().includes(teacherSearchTerm.toLowerCase())) ||
        (teacher.assigned_classes && teacher.assigned_classes.join(", ").toLowerCase().includes(teacherSearchTerm.toLowerCase()))
      );
    }
    if (teacherSortCriteria === "full_name") tempTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (teacherSortCriteria === "email") tempTeachers.sort((a, b) => a.email.localeCompare(b.email));
    if (isMounted.current) setFilteredTeachers(tempTeachers);
  }, [teachers, teacherSearchTerm, teacherSortCriteria]);


  const handleStudentDialogClose = () => { setIsStudentDialogOpen(false); setCurrentStudent(null); };
  const handleTeacherDialogClose = () => { setIsTeacherDialogOpen(false); setCurrentTeacher(null); setSelectedTeacherClasses([]); };
  const handleOpenEditStudentDialog = (student: StudentFromSupabase) => { setCurrentStudent({ ...student }); setIsStudentDialogOpen(true); };
  const handleOpenEditTeacherDialog = (teacher: TeacherFromSupabase) => { setCurrentTeacher({ ...teacher }); setSelectedTeacherClasses(teacher.assigned_classes || []); setIsTeacherDialogOpen(true); };

  const handleSaveStudent = async () => {
    if (!currentStudent || !currentStudent.id) {
        toast({ title: "Error", description: "Student ID missing for update.", variant: "destructive"});
        return;
    }
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); return; }

    const { id, student_id_display, created_at, updated_at, totalFeesDue, totalAmountPaid, ...dataToUpdate } = currentStudent;

    let overrideAmount: number | null = null;
    if (dataToUpdate.total_paid_override !== undefined && dataToUpdate.total_paid_override !== null && String(dataToUpdate.total_paid_override).trim() !== '') {
        const parsedAmount = parseFloat(String(dataToUpdate.total_paid_override));
        if (!isNaN(parsedAmount)) { overrideAmount = parsedAmount; }
    }
    
    const studentUpdatePayload = { 
      full_name: dataToUpdate.full_name,
      date_of_birth: dataToUpdate.date_of_birth,
      grade_level: dataToUpdate.grade_level,
      guardian_name: dataToUpdate.guardian_name,
      guardian_contact: dataToUpdate.guardian_contact,
      contact_email: dataToUpdate.contact_email,
      total_paid_override: overrideAmount,
      updated_at: new Date().toISOString(), // Explicitly set updated_at
    };

    try {
        const { data: updatedData, error: updateError } = await supabase
            .from("students")
            .update(studentUpdatePayload)
            .eq("id", id)
            .select()
            .single();

        if (updateError) throw updateError;
        
        if (isMounted.current && updatedData) {
            setAllStudents(prev => prev.map(s => s.id === updatedData.id ? updatedData : s));
        }
        toast({ title: "Success", description: "Student details updated in Supabase." });
        handleStudentDialogClose();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update student: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveTeacher = async () => {
    if (!currentTeacher || !currentTeacher.id) {
        toast({ title: "Error", description: "Teacher ID missing for update.", variant: "destructive"});
        return;
    }
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); return; }

    const { id, email, password, created_at, updated_at, ...dataToUpdate } = currentTeacher; 
    
    const teacherUpdatePayload = {
        full_name: dataToUpdate.full_name,
        contact_number: dataToUpdate.contact_number,
        subjects_taught: dataToUpdate.subjects_taught,
        assigned_classes: selectedTeacherClasses,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
    };

    try {
        const { data: updatedData, error: updateError } = await supabase
            .from("teachers")
            .update(teacherUpdatePayload)
            .eq("id", id)
            .select()
            .single();
        
        if (updateError) throw updateError;

        if (isMounted.current && updatedData) {
            setTeachers(prev => prev.map(t => t.id === updatedData.id ? updatedData : t));
        }
        toast({ title: "Success", description: "Teacher details updated in Supabase." });
        handleTeacherDialogClose();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update teacher: ${error.message}`, variant: "destructive" });
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete || !studentToDelete.id) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); setStudentToDelete(null); return; }
    try {
        // Also delete related fee_payments for this student
        const { error: paymentsDeleteError } = await supabase
            .from("fee_payments")
            .delete()
            .eq("student_id_display", studentToDelete.student_id_display); // Using student_id_display for cascading

        if (paymentsDeleteError) {
            console.warn("Could not delete student's fee payments, but proceeding with student deletion:", paymentsDeleteError.message);
            toast({ title: "Warning", description: `Could not delete associated fee payments for student: ${paymentsDeleteError.message}. Student record will still be deleted.`, variant: "default", duration: 7000});
        }

        const { error: studentDeleteError } = await supabase
            .from("students")
            .delete()
            .eq("id", studentToDelete.id);
        
        if (studentDeleteError) throw studentDeleteError;

        if (isMounted.current) {
            setAllStudents(prev => prev.filter(s => s.id !== studentToDelete!.id));
            // Also filter out payments for the deleted student from local state if needed,
            // though full re-fetch on next data load is also an option
            setAllPaymentsFromSupabase(prev => prev.filter(p => p.student_id_display !== studentToDelete!.student_id_display));
        }
        toast({ title: "Success", description: `Student ${studentToDelete.full_name} and their associated fee payments deleted from Supabase.` });
        setStudentToDelete(null);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not delete student: ${error.message}`, variant: "destructive" });
        setStudentToDelete(null);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete || !teacherToDelete.id) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); setTeacherToDelete(null); return; }
    try {
        const { error: deleteError } = await supabase
            .from("teachers")
            .delete()
            .eq("id", teacherToDelete.id);
        
        if (deleteError) throw deleteError;
        
        if (isMounted.current) setTeachers(prev => prev.filter(t => t.id !== teacherToDelete!.id));
        toast({ title: "Success", description: `Teacher ${teacherToDelete.full_name} deleted from Supabase.` });
        setTeacherToDelete(null);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not delete teacher: ${error.message}`, variant: "destructive" });
        setTeacherToDelete(null);
    }
  };

  const handleTeacherClassToggle = (grade: string) => {
    const newSelectedClasses = selectedTeacherClasses.includes(grade)
      ? selectedTeacherClasses.filter((c) => c !== grade)
      : [...selectedTeacherClasses, grade];
    setSelectedTeacherClasses(newSelectedClasses);
  };

  const renderStudentEditDialog = () => currentStudent && (
    <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Student: {currentStudent.full_name}</DialogTitle>
          <DialogDescription>Student ID: {currentStudent.student_id_display} (cannot be changed)</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sFullName" className="text-right">Full Name</Label>
            <Input id="sFullName" value={currentStudent.full_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, full_name: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sDob" className="text-right">Date of Birth</Label>
            <Input id="sDob" type="date" value={currentStudent.date_of_birth || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, date_of_birth: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGradeLevel" className="text-right">Grade Level</Label>
            <Select value={currentStudent.grade_level} onValueChange={(value) => setCurrentStudent(prev => ({ ...prev, grade_level: value }))}>
              <SelectTrigger className="col-span-3" id="sGradeLevel"><SelectValue /></SelectTrigger>
              <SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGuardianName" className="text-right">Guardian Name</Label>
            <Input id="sGuardianName" value={currentStudent.guardian_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_name: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGuardianContact" className="text-right">Guardian Contact</Label>
            <Input id="sGuardianContact" value={currentStudent.guardian_contact || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_contact: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sContactEmail" className="text-right">Contact Email</Label>
            <Input id="sContactEmail" type="email" value={currentStudent.contact_email || ""} onChange={(e) => setCurrentStudent(prev => ({...prev, contact_email: e.target.value }))} className="col-span-3" placeholder="Optional email"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sTotalPaidOverride" className="text-right">Total Paid Override (GHS)</Label>
            <Input
              id="sTotalPaidOverride" type="number" placeholder="Leave blank for auto-sum"
              value={currentStudent.total_paid_override === null || currentStudent.total_paid_override === undefined ? "" : String(currentStudent.total_paid_override)}
              onChange={(e) => setCurrentStudent(prev => ({ ...prev, total_paid_override: e.target.value.trim() === "" ? null : parseFloat(e.target.value) }))}
              className="col-span-3" step="0.01"
            />
          </div>
           <p className="col-span-4 text-xs text-muted-foreground px-1 text-center sm:text-left sm:pl-[calc(25%+0.75rem)]">
            Note: Overriding total paid affects display & balance. It does not alter individual payment records in Supabase.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleStudentDialogClose}>Cancel</Button>
          <Button onClick={handleSaveStudent}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderTeacherEditDialog = () => currentTeacher && (
    <Dialog open={isTeacherDialogOpen} onOpenChange={setIsTeacherDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Teacher: {currentTeacher.full_name}</DialogTitle>
          <DialogDescription>Email: {currentTeacher.email} (cannot be changed here)</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tFullName" className="text-right">Full Name</Label>
            <Input id="tFullName" value={currentTeacher.full_name || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, full_name: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="tSubjects" className="text-right pt-1">Subjects Taught</Label>
            <Textarea id="tSubjects" value={currentTeacher.subjects_taught || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, subjects_taught: e.target.value }))} className="col-span-3 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tContact" className="text-right">Contact Number</Label>
            <Input id="tContact" value={currentTeacher.contact_number || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, contact_number: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Assigned Classes</Label>
            <DropdownMenu>
              <DDMTrigger asChild className="col-span-3">
                  <Button variant="outline" className="justify-between w-full">
                      {selectedTeacherClasses.length > 0 ? `${selectedTeacherClasses.length} class(es) selected` : "Select classes"}
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
              </DDMTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                  <DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel><DropdownMenuSeparator />
                  {GRADE_LEVELS.map((grade) => (<DropdownMenuCheckboxItem key={grade} checked={selectedTeacherClasses.includes(grade)} onCheckedChange={() => handleTeacherClassToggle(grade)} onSelect={(e) => e.preventDefault()}>{grade}</DropdownMenuCheckboxItem>))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleTeacherDialogClose}>Cancel</Button>
          <Button onClick={handleSaveTeacher}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isCheckingAdminSession) {
    return <div className="flex flex-col items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/> Verifying admin session...</div>;
  }

  if (!isAdminSessionActive) {
    return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Access Denied</CardTitle></CardHeader>
            <CardContent>
            <p className="text-destructive/90">You must be logged in as an admin to view this page.</p>
            <Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center"><h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><UserCog /> User Management</h2></div>
      
      {dataLoadingError && (
          <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading Data</CardTitle></CardHeader><CardContent><p>{dataLoadingError}</p></CardContent></Card>
      )}

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Students (from Supabase)</CardTitle><CardDescription>View, edit, or delete student records. Payments are from Supabase.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortStudents">Sort by:</Label><Select value={studentSortCriteria} onValueChange={setStudentSortCriteria}><SelectTrigger id="sortStudents"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full_name">Full Name</SelectItem><SelectItem value="student_id_display">Student ID</SelectItem><SelectItem value="grade_level">Grade Level</SelectItem></SelectContent></Select></div>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/> Loading student data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Display ID</TableHead><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>Fees Due</TableHead><TableHead>Paid (Supabase)</TableHead><TableHead>Balance</TableHead><TableHead>Guardian Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredAndSortedStudents.length === 0 ? <TableRow key="no-students-row"><TableCell colSpan={8} className="text-center h-24">No students found.</TableCell></TableRow> : filteredAndSortedStudents.map((student) => {
                    const displayTotalPaid = student.total_paid_override !== undefined && student.total_paid_override !== null ? student.total_paid_override : (student.totalAmountPaid ?? 0);
                    const feesDue = student.totalFeesDue ?? 0; const balance = feesDue - displayTotalPaid;
                    return (<TableRow key={student.id}><TableCell>{student.student_id_display}</TableCell><TableCell>{student.full_name}</TableCell><TableCell>{student.grade_level}</TableCell><TableCell>{feesDue.toFixed(2)}</TableCell><TableCell>{displayTotalPaid.toFixed(2)}{student.total_paid_override !== undefined && student.total_paid_override !== null && <span className="text-xs text-blue-500 ml-1">(Overridden)</span>}</TableCell><TableCell className={balance > 0 ? 'text-destructive' : 'text-green-600'}>{balance.toFixed(2)}</TableCell><TableCell>{student.guardian_contact}</TableCell><TableCell className="space-x-1"><Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete student {studentToDelete?.full_name}? This action cannot be undone and will remove the record (and associated fee payments) from Supabase.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>);
                  })}
              </TableBody></Table></div>)}
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Teachers (from Supabase)</CardTitle><CardDescription>View, edit, or delete teacher records.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search teachers..." value={teacherSearchTerm} onChange={(e) => setTeacherSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortTeachers">Sort by:</Label><Select value={teacherSortCriteria} onValueChange={setTeacherSortCriteria}><SelectTrigger id="sortTeachers"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full_name">Full Name</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
          </div>
          {isLoadingData ? (
             <div className="py-10 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2"/> Loading teacher data...</div>
          ) : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Contact</TableHead><TableHead>Subjects</TableHead><TableHead>Classes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTeachers.length === 0 ? <TableRow key="no-teachers-row"><TableCell colSpan={6} className="text-center h-24">No teachers found.</TableCell></TableRow> : 
                filteredTeachers
                  .map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.full_name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.contact_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{teacher.subjects_taught}</TableCell>
                    <TableCell>{teacher.assigned_classes?.join(", ") || "N/A"}</TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4"/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setTeacherToDelete(teacher)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete teacher {teacherToDelete?.full_name}? This action cannot be undone and will remove the record from Supabase.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel onClick={() => setTeacherToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteTeacher} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody></Table></div>)}
        </CardContent>
      </Card>
      {renderStudentEditDialog()}
      {renderTeacherEditDialog()}
    </div>
  );
}
