
"use client";

import { useState, useEffect, type ReactNode, useRef, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Edit, Trash2, ChevronDown, UserCog, Search, Loader2, AlertCircle, Receipt as ReceiptIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, ADMIN_LOGGED_IN_KEY, TERMS_ORDER } from "@/lib/constants";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { format as formatDateFns } from "date-fns";
import html2pdf from 'html2pdf.js';
import { FeeStatement } from "@/components/shared/FeeStatement";


interface FeePaymentFromSupabase {
  id: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; 
  payment_id_display: string;
  term_paid_for: string;
}

interface StudentFromSupabase {
  id: string; 
  auth_user_id?: string | null;
  student_id_display: string;
  full_name: string;
  date_of_birth: string; 
  grade_level: string;
  guardian_name: string;
  guardian_contact: string;
  contact_email?: string;
  total_paid_override?: number | null;
  created_at: string;
  updated_at: string;
  totalFeesDue?: number; 
  totalAmountPaid?: number; 
}

interface TeacherFromSupabase {
  id: string; 
  auth_user_id: string; 
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string;
  assigned_classes: string[];
  created_at: string;
  updated_at: string;
}

interface FeeItemFromSupabase {
  id: string;
  grade_level: string;
  term: string;
  description: string;
  amount: number;
  academic_year: string;
}

interface SchoolBranding {
  school_name: string;
  school_address: string;
  school_logo_url: string;
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
  const [feeStructureForCurrentYear, setFeeStructureForCurrentYear] = useState<FeeItemFromSupabase[]>([]);
  const [allPaymentsFromSupabase, setAllPaymentsFromSupabase] = useState<FeePaymentFromSupabase[]>([]);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadingError, setDataLoadingError] = useState<string | null>(null);

  const [filteredAndSortedStudents, setFilteredAndSortedStudents] = useState<StudentFromSupabase[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [studentSortCriteria, setStudentSortCriteria] = useState<string>("full_name");
  const [viewMode, setViewMode] = useState<string>("term1");

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

  const [studentForStatement, setStudentForStatement] = useState<StudentFromSupabase | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);

  const loadAllDataFromSupabase = useCallback(async () => {
    if (!isMounted.current) return;
    console.log("[AdminUsersPage] loadAllDataFromSupabase: Starting data fetch.");
    setIsLoadingData(true);
    setDataLoadingError(null);
    let fetchedCurrentYear = "";

    try {
      const { data: appSettings, error: settingsError } = await supabase
        .from("app_settings")
        .select("current_academic_year, school_name, school_address, school_logo_url")
        .eq("id", 1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      if (isMounted.current) {
        setCurrentSystemAcademicYear(fetchedCurrentYear);
        setSchoolBranding({
            school_name: appSettings?.school_name || "St. Joseph's Montessori",
            school_address: appSettings?.school_address || "Accra, Ghana",
            school_logo_url: appSettings?.school_logo_url || "",
        });
      }
      console.log(`[AdminUsersPage] loadAllDataFromSupabase: Current System Academic Year: ${fetchedCurrentYear}`);

      const { data: feeData, error: feeError } = await supabase
        .from("school_fee_items")
        .select("id, grade_level, term, description, amount, academic_year")
        .eq("academic_year", fetchedCurrentYear);
      if (feeError) throw feeError;
      if (isMounted.current) {
        setFeeStructureForCurrentYear(feeData || []);
        console.log(`[AdminUsersPage] loadAllDataFromSupabase: Fetched ${feeData?.length || 0} fee items for year ${fetchedCurrentYear}.`);
      }

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .order("full_name", { ascending: true });
      if (studentError) throw studentError;
      if (isMounted.current) setAllStudents(studentData || []);
      console.log(`[AdminUsersPage] loadAllDataFromSupabase: Fetched ${studentData?.length || 0} students.`);

      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("*")
        .order("full_name", { ascending: true });
      if (teacherError) throw teacherError;
      if (isMounted.current) setTeachers(teacherData || []);
      console.log(`[AdminUsersPage] loadAllDataFromSupabase: Fetched ${teacherData?.length || 0} teachers.`);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("fee_payments")
        .select("id, student_id_display, amount_paid, payment_date, payment_id_display, term_paid_for")
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      if (isMounted.current) setAllPaymentsFromSupabase(paymentsData || []);
      console.log(`[AdminUsersPage] loadAllDataFromSupabase: Fetched ${paymentsData?.length || 0} total payments.`);

    } catch (e: any) {
        console.error("[AdminUsersPage] loadAllDataFromSupabase: Error loading data:", e);
        const errorMessage = `Could not load required data: ${e.message}. Some features might be affected.`;
        toast({title:"Error", description: errorMessage, variant:"destructive"});
        if (isMounted.current) setDataLoadingError(errorMessage);
    } finally {
        if (isMounted.current) setIsLoadingData(false);
        console.log("[AdminUsersPage] loadAllDataFromSupabase: Data fetching complete.");
    }
  }, [supabase, toast]);


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
            console.error("[AdminUsersPage] Supabase session error:", sessionError.message);
        }
        if (isMounted.current) {
            setIsAdminSessionActive(false);
            setIsLoadingData(false); 
        }
      }
      if (isMounted.current) setIsCheckingAdminSession(false);
    };

    checkAuthAndLoadData();
    return () => { isMounted.current = false; };
  }, [supabase, toast, loadAllDataFromSupabase]);
  
  useEffect(() => {
    if (!isAdminSessionActive) return;

    const handleFocus = () => {
        console.log('[AdminUsersPage] Window focused, re-fetching data.');
        loadAllDataFromSupabase();
    };

    window.addEventListener('focus', handleFocus);

    return () => { 
        window.removeEventListener('focus', handleFocus);
    };
  }, [isAdminSessionActive, loadAllDataFromSupabase]);


   useEffect(() => {
    if (!isMounted.current || feeStructureForCurrentYear === undefined || allPaymentsFromSupabase === undefined) {
      return;
    }
    
    let academicYearStartDate = "";
    let academicYearEndDate = "";
    if (currentSystemAcademicYear && /^\d{4}-\d{4}$/.test(currentSystemAcademicYear)) {
      const startYear = currentSystemAcademicYear.substring(0, 4);
      const endYear = currentSystemAcademicYear.substring(5, 9);
      academicYearStartDate = `${startYear}-08-01`; 
      academicYearEndDate = `${endYear}-07-31`;     
    }

    let tempStudents = [...allStudents].map(student => {
      let studentFeesDue = 0;
      
      const studentPaymentsThisYear = allPaymentsFromSupabase.filter(p => 
        p.student_id_display === student.student_id_display &&
        (!academicYearStartDate || p.payment_date >= academicYearStartDate) &&
        (!academicYearEndDate || p.payment_date <= academicYearEndDate)
      );
      const studentTotalPaidThisYear = studentPaymentsThisYear.reduce((sum, p) => sum + p.amount_paid, 0);

      const displayTotalPaid = student.total_paid_override !== undefined && student.total_paid_override !== null
        ? student.total_paid_override
        : studentTotalPaidThisYear;

      const studentSpecificFeeItems = feeStructureForCurrentYear.filter(item => item.grade_level === student.grade_level);

      const termIndex = TERMS_ORDER.indexOf(viewMode.replace('term', 'Term '));
      let cumulativeFees = 0;
      
      if (termIndex > -1) {
        for (let i = 0; i <= termIndex; i++) {
            cumulativeFees += studentSpecificFeeItems
            .filter(item => item.term === TERMS_ORDER[i])
            .reduce((sum, item) => sum + item.amount, 0);
        }
      }
      studentFeesDue = cumulativeFees;
      
      return {
        ...student,
        totalFeesDue: studentFeesDue,
        totalAmountPaid: displayTotalPaid,
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
  }, [allStudents, studentSearchTerm, studentSortCriteria, feeStructureForCurrentYear, allPaymentsFromSupabase, currentSystemAcademicYear, viewMode]);


  useEffect(() => {
    if (!isMounted.current) return;
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
      updated_at: new Date().toISOString(),
    };

    try {
        const { error: updateError } = await supabase
            .from("students")
            .update(studentUpdatePayload)
            .eq("id", id);

        if (updateError) throw updateError;

        if (isMounted.current) {
            await loadAllDataFromSupabase(); 
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

    const { id, email, auth_user_id, created_at, updated_at, ...dataToUpdate } = currentTeacher;

    const teacherUpdatePayload = {
        full_name: dataToUpdate.full_name,
        contact_number: dataToUpdate.contact_number,
        subjects_taught: dataToUpdate.subjects_taught,
        assigned_classes: selectedTeacherClasses,
        updated_at: new Date().toISOString(),
    };

    try {
        const { error: updateError } = await supabase
            .from("teachers")
            .update(teacherUpdatePayload)
            .eq("id", id);

        if (updateError) throw updateError;

        if (isMounted.current) {
            await loadAllDataFromSupabase();
        }
        toast({ title: "Success", description: "Teacher details updated in Supabase." });
        handleTeacherDialogClose();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update teacher: ${error.message}`, variant: "destructive" });
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete || !studentToDelete.id) return;
    if (!isAdminSessionActive) {
      toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" });
      setStudentToDelete(null);
      return;
    }

    try {
      await supabase.from("fee_payments").delete().eq("student_id_display", studentToDelete.student_id_display);
      await supabase.from("student_arrears").delete().eq("student_id_display", studentToDelete.student_id_display);
      
      const { error: studentDeleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentToDelete.id);

      if (studentDeleteError) throw studentDeleteError;
      
      toast({ title: "Success", description: `Student ${studentToDelete.full_name}'s profile and related data have been deleted. Their login access is now revoked.` });

      if (isMounted.current) {
        await loadAllDataFromSupabase(); 
      }
      setStudentToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete student profile: ${error.message}`, variant: "destructive" });
      setStudentToDelete(null);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete || !teacherToDelete.id) return;
    if (!isAdminSessionActive) {
      toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" });
      setTeacherToDelete(null);
      return;
    }
    
    try {
      const { error: profileDeleteError } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherToDelete.id);

      if (profileDeleteError) {
        throw profileDeleteError;
      }

      if (isMounted.current) {
        setTeachers(prev => prev.filter(t => t.id !== teacherToDelete!.id));
      }
      toast({ title: "Success", description: `Teacher ${teacherToDelete.full_name}'s profile has been deleted. Their login access is now revoked.` });
      setTeacherToDelete(null);

    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete teacher profile: ${error.message}`, variant: "destructive" });
      setTeacherToDelete(null);
    }
  };

  const handleTeacherClassToggle = (grade: string) => {
    const newSelectedClasses = selectedTeacherClasses.includes(grade)
      ? selectedTeacherClasses.filter((c) => c !== grade)
      : [...selectedTeacherClasses, grade];
    setSelectedTeacherClasses(newSelectedClasses);
  };

  const handleDownloadStatement = (student: StudentFromSupabase) => {
    if (!schoolBranding) {
      toast({ title: "Error", description: "School information not loaded yet. Please wait and try again.", variant: "destructive"});
      return;
    }
    setStudentForStatement(student);
  };
  
  const handleResetOverrides = async () => {
    setIsResettingOverrides(true);
    try {
        const { error } = await supabase
            .from('students')
            .update({ total_paid_override: null })
            .not('total_paid_override', 'is', null);

        if (error) throw error;

        toast({
            title: "Success",
            description: "All student payment overrides have been reset.",
        });
        await loadAllDataFromSupabase();
    } catch (error: any) {
        toast({
            title: "Error",
            description: `Could not reset overrides: ${error.message}`,
            variant: "destructive",
        });
    } finally {
        if (isMounted.current) setIsResettingOverrides(false);
    }
  };

  useEffect(() => {
    const generatePdf = async () => {
        if (studentForStatement && pdfRef.current) {
            setIsDownloading(true);
            const element = pdfRef.current;
            const opt = {
                margin: 0,
                filename: `Fee_Statement_${studentForStatement.full_name.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().from(element).set(opt).save();
            if (isMounted.current) {
                setStudentForStatement(null);
                setIsDownloading(false);
            }
        }
    };
    generatePdf();
  }, [studentForStatement]);


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
              value={currentStudent.total_paid_override ?? ""}
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

  const feesDueHeader = `Fees Due (${viewMode.replace('term', 'Term ')})`;
  const paidHeader = `Paid (This Year)`;
  const balanceHeader = `Balance`;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><UserCog /> User Management</h2>
      </div>
       <CardDescription>Displaying student fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong>.</CardDescription>


      {dataLoadingError && (
          <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading Data</CardTitle></CardHeader><CardContent><p>{dataLoadingError}</p></CardContent></Card>
      )}

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Students (from Supabase)</CardTitle><CardDescription>View, edit, or delete student records. Fees are calculated cumulatively up to the selected term for the academic year {currentSystemAcademicYear}.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[250px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortStudents">Sort by:</Label><Select value={studentSortCriteria} onValueChange={setStudentSortCriteria}><SelectTrigger id="sortStudents" className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full_name">Full Name</SelectItem><SelectItem value="student_id_display">Student ID</SelectItem><SelectItem value="grade_level">Grade Level</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="viewMode">View:</Label><Select value={viewMode} onValueChange={setViewMode}><SelectTrigger id="viewMode" className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent>{TERMS_ORDER.map((term, i) => <SelectItem key={term} value={`term${i + 1}`}>{term}</SelectItem>)}</SelectContent></Select></div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isResettingOverrides}>
                        {isResettingOverrides ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                        Reset All Overrides
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will clear all manual "Total Paid Overrides" for all students, recalculating their balances based on actual payment records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetOverrides} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, Reset Overrides</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/> Loading student data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Display ID</TableHead><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>{feesDueHeader}</TableHead><TableHead>{paidHeader}</TableHead><TableHead>{balanceHeader}</TableHead><TableHead>Guardian Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredAndSortedStudents.length === 0 ? <TableRow key="no-students-row"><TableCell colSpan={8} className="text-center h-24">No students found.</TableCell></TableRow> : filteredAndSortedStudents.map((student) => {
                    const balance = (student.totalFeesDue ?? 0) - (student.totalAmountPaid ?? 0);
                    return (<TableRow key={student.id}><TableCell>{student.student_id_display}</TableCell><TableCell>{student.full_name}</TableCell><TableCell>{student.grade_level}</TableCell><TableCell>{(student.totalFeesDue ?? 0).toFixed(2)}</TableCell><TableCell>{(student.totalAmountPaid ?? 0).toFixed(2)}{student.total_paid_override !== undefined && student.total_paid_override !== null && <span className="text-xs text-blue-500 ml-1">(Overridden)</span>}</TableCell><TableCell className={balance > 0 ? 'text-destructive' : 'text-green-600'}>{balance.toFixed(2)}</TableCell><TableCell>{student.guardian_contact}</TableCell><TableCell className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="outline" size="icon" onClick={() => handleDownloadStatement(student)} disabled={isDownloading && studentForStatement?.id === student.id} title="Download Fee Statement">
                            {isDownloading && studentForStatement?.id === student.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <ReceiptIcon className="h-4 w-4"/>}
                        </Button>
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Student Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the profile for {studentToDelete?.full_name}? This action deletes their public profile and related data like payments and arrears. It is not reversible. The underlying authentication account may remain for manual cleanup.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                    </TableCell></TableRow>);
                  })}
              </TableBody></Table></div>)}
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Teachers (from Supabase)</CardTitle><CardDescription>View, edit, or delete teacher records. Deleting a profile revokes application access.</CardDescription></CardHeader>
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
                          <AlertDialogHeader><AlertDialogTitle>Confirm Teacher Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the profile for {teacherToDelete?.full_name}? This will revoke their access to the application by removing their profile data. The underlying authentication account may remain for manual cleanup.</AlertDialogDescription></AlertDialogHeader>
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
        
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <div ref={pdfRef}>
            {studentForStatement && schoolBranding && (
                <FeeStatement
                    student={studentForStatement}
                    payments={allPaymentsFromSupabase.filter(p => p.student_id_display === studentForStatement.student_id_display)}
                    schoolBranding={schoolBranding}
                    feeStructureForYear={feeStructureForCurrentYear.filter(item => item.grade_level === studentForStatement.grade_level)}
                    currentAcademicYear={currentSystemAcademicYear}
                />
            )}
        </div>
      </div>
    </div>
  );
}
