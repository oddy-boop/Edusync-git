
"use client";

import { useState, useEffect, type ReactNode, useRef, useCallback, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Edit, Trash2, ChevronDown, UserCog, Search, Loader2, AlertCircle, Receipt as ReceiptIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, TERMS_ORDER } from "@/lib/constants";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { format as formatDateFns } from "date-fns";
import html2pdf from 'html2pdf.js';
import { FeeStatement } from "@/components/shared/FeeStatement";
import { cn } from "@/lib/utils";
import { deleteUserAction } from "@/lib/actions/user.actions";


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
}

interface StudentForDisplay extends StudentFromSupabase {
  feesForSelectedTerm?: number;
  paidForSelectedTerm?: number;
  totalAmountPaid?: number; 
  balance?: number;
}

interface TeacherFromSupabase {
  id: string; 
  auth_user_id: string; 
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string[];
  assigned_classes: string[];
  created_at: string;
  updated_at: string;
}

interface TeacherForEdit {
    id: string;
    auth_user_id: string;
    full_name: string;
    email: string;
    contact_number: string;
    subjects_taught: string; // Stored as a string for the textarea
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

  const [allStudents, setAllStudents] = useState<StudentFromSupabase[]>([]);
  const [teachers, setTeachers] = useState<TeacherFromSupabase[]>([]);
  const [feeStructureForCurrentYear, setFeeStructureForCurrentYear] = useState<FeeItemFromSupabase[]>([]);
  const [allPaymentsFromSupabase, setAllPaymentsFromSupabase] = useState<FeePaymentFromSupabase[]>([]);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataLoadingError, setDataLoadingError] = useState<string | null>(null);

  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [studentSortCriteria, setStudentSortCriteria] = useState<string>("full_name");
  const [viewMode, setViewMode] = useState<string>("term1");

  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>("");
  const [teacherSortCriteria, setTeacherSortCriteria] = useState<string>("full_name");

  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<StudentForDisplay> | null>(null);

  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<TeacherForEdit> | null>(null);
  const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<string[]>([]);

  const [studentForStatement, setStudentForStatement] = useState<StudentForDisplay | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoadingData(true);
    setDataLoadingError(null);
    let fetchedCurrentYear = "";

    try {
      const { data: appSettings, error: settingsError } = await supabase
        .from("app_settings")
        .select("current_academic_year, school_name, school_address, school_logo_url")
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      fetchedCurrentYear = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      const [
        { data: feeData, error: feeError },
        { data: studentData, error: studentError },
        { data: teacherData, error: teacherError },
        { data: paymentsData, error: paymentsError }
      ] = await Promise.all([
        supabase.from("school_fee_items").select("*").eq("academic_year", fetchedCurrentYear),
        supabase.from("students").select("*").order("full_name", { ascending: true }),
        supabase.from("teachers").select("*").order("full_name", { ascending: true }),
        supabase.from("fee_payments").select("*").order("payment_date", { ascending: false })
      ]);

      if (feeError) throw feeError;
      if (studentError) throw studentError;
      if (teacherError) throw teacherError;
      if (paymentsError) throw paymentsError;

      if (isMounted.current) {
        setCurrentSystemAcademicYear(fetchedCurrentYear);
        setSchoolBranding({
            school_name: appSettings?.school_name || "EduSync Platform",
            school_address: appSettings?.school_address || "Accra, Ghana",
            school_logo_url: appSettings?.school_logo_url || "",
        });
        setFeeStructureForCurrentYear(feeData || []);
        setAllStudents(studentData || []);
        setTeachers(teacherData || []);
        setAllPaymentsFromSupabase(paymentsData || []);
      }
    } catch (e: any) {
        console.error("[AdminUsersPage] loadAllData: Error loading data:", e);
        const errorMessage = `Could not load required data: ${e.message}. Some features might be affected.`;
        toast({title:"Error", description: errorMessage, variant:"destructive"});
        if (isMounted.current) setDataLoadingError(errorMessage);
    } finally {
        if (isMounted.current) setIsLoadingData(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    isMounted.current = true;
    const checkSessionAndLoad = async () => {
      if (!isMounted.current) return;
      setIsCheckingAdminSession(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (isMounted.current) {
            if (roleData?.role === 'admin' || roleData?.role === 'super_admin') {
              setIsAdminSessionActive(true);
              await loadAllData();
            } else {
              setIsAdminSessionActive(false);
              setIsLoadingData(false);
            }
          }
        } else {
          if (isMounted.current) {
            setIsAdminSessionActive(false);
            setIsLoadingData(false);
          }
        }
      } catch (e: any) {
        if (isMounted.current) {
          setIsAdminSessionActive(false);
          setIsLoadingData(false);
          setDataLoadingError("Failed to verify user session.");
        }
      } finally {
        if (isMounted.current) {
          setIsCheckingAdminSession(false);
        }
      }
    };
    checkSessionAndLoad();
    return () => { isMounted.current = false; };
  }, [supabase, loadAllData]);

  const filteredAndSortedStudents = useMemo(() => {
    if (isLoadingData) {
      return [];
    }
    
    const selectedTermName = viewMode.replace('term', 'Term ');
    
    let academicYearStartDate = "";
    let academicYearEndDate = "";
    if (currentSystemAcademicYear && /^\d{4}-\d{4}$/.test(currentSystemAcademicYear)) {
      const startYear = currentSystemAcademicYear.split('-')[0];
      const endYear = currentSystemAcademicYear.split('-')[1];
      academicYearStartDate = `${startYear}-08-01`; 
      academicYearEndDate = `${endYear}-07-31`;     
    }

    let tempStudents = [...allStudents].map(student => {
      const paymentsMadeForYear = allPaymentsFromSupabase.filter(p => 
        p.student_id_display === student.student_id_display &&
        (academicYearStartDate ? p.payment_date >= academicYearStartDate : true) &&
        (academicYearEndDate ? p.payment_date <= academicYearEndDate : true)
      );
      const totalPaidThisYear = paymentsMadeForYear.reduce((sum, p) => sum + p.amount_paid, 0);

      const studentAllFeeItemsForYear = feeStructureForCurrentYear.filter(item => item.grade_level === student.grade_level);
      const totalFeesForYear = studentAllFeeItemsForYear.reduce((sum, item) => sum + item.amount, 0);
      
      const overallBalance = totalFeesForYear - totalPaidThisYear;

      let paymentPool = totalPaidThisYear;
      let calculatedPaidForSelectedTerm = 0;

      for (const term of TERMS_ORDER) {
        const feesForThisLoopTerm = studentAllFeeItemsForYear
          .filter(item => item.term === term)
          .reduce((sum, item) => sum + item.amount, 0);

        const paymentAppliedToThisLoopTerm = Math.min(feesForThisLoopTerm, paymentPool);
        
        if (term === selectedTermName) {
          calculatedPaidForSelectedTerm = paymentAppliedToThisLoopTerm;
          break; 
        }
        
        paymentPool -= paymentAppliedToThisLoopTerm;
      }
      
      const feesForSelectedTerm = studentAllFeeItemsForYear
          .filter(item => item.term === selectedTermName)
          .reduce((sum, item) => sum + item.amount, 0);
      
      const paidForSelectedTerm = student.total_paid_override !== null && student.total_paid_override !== undefined 
        ? student.total_paid_override 
        : calculatedPaidForSelectedTerm;
      
      return {
        ...student,
        feesForSelectedTerm,
        paidForSelectedTerm,
        totalAmountPaid: totalPaidThisYear,
        balance: overallBalance,
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
        if (indexA !== indexB) return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        return a.full_name.localeCompare(b.full_name);
      });
    }
    return tempStudents;
  }, [allStudents, studentSearchTerm, studentSortCriteria, feeStructureForCurrentYear, allPaymentsFromSupabase, currentSystemAcademicYear, viewMode, isLoadingData]);


  const filteredTeachers = useMemo(() => {
    let tempTeachers = [...teachers];
    if (teacherSearchTerm) {
      tempTeachers = tempTeachers.filter(teacher =>
        teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        (teacher.subjects_taught && Array.isArray(teacher.subjects_taught) && teacher.subjects_taught.join(", ").toLowerCase().includes(teacherSearchTerm.toLowerCase())) ||
        (teacher.assigned_classes && teacher.assigned_classes.join(", ").toLowerCase().includes(teacherSearchTerm.toLowerCase()))
      );
    }
    if (teacherSortCriteria === "full_name") tempTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (teacherSortCriteria === "email") tempTeachers.sort((a, b) => a.email.localeCompare(b.email));
    return tempTeachers;
  }, [teachers, teacherSearchTerm, teacherSortCriteria]);


  const handleStudentDialogClose = () => { setIsStudentDialogOpen(false); setCurrentStudent(null); };
  const handleTeacherDialogClose = () => { setIsTeacherDialogOpen(false); setCurrentTeacher(null); setSelectedTeacherClasses([]); };
  
  const handleOpenEditStudentDialog = (student: StudentForDisplay) => { 
    setCurrentStudent({ ...student }); 
    setIsStudentDialogOpen(true); 
  };
  
  const handleOpenEditTeacherDialog = (teacher: TeacherFromSupabase) => { 
    setCurrentTeacher({
        ...teacher,
        subjects_taught: (teacher.subjects_taught || []).join(', ')
    }); 
    setSelectedTeacherClasses(teacher.assigned_classes || []); 
    setIsTeacherDialogOpen(true); 
  };

  const handleSaveStudent = async () => {
    if (!currentStudent || !currentStudent.id) {
        toast({ title: "Error", description: "Student ID missing for update.", variant: "destructive"});
        return;
    }
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); return; }

    const originalStudent = allStudents.find(s => s.id === currentStudent.id);
    if (!originalStudent) {
        toast({ title: "Error", description: "Cannot find original student data to compare changes. Update aborted.", variant: "destructive" });
        return;
    }

    const { id, feesForSelectedTerm, paidForSelectedTerm, totalAmountPaid, balance, ...dataToUpdate } = currentStudent as Partial<StudentForDisplay>;

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

    if (originalStudent && originalStudent.grade_level !== studentUpdatePayload.grade_level) {
        studentUpdatePayload.total_paid_override = null;
    }

    try {
        const { error: updateError } = await supabase.from("students").update(studentUpdatePayload).eq("id", id);
        if (updateError) throw updateError;
        
        let toastMessage = "Student details updated.";
        if (originalStudent && originalStudent.grade_level !== studentUpdatePayload.grade_level) {
            toastMessage += " Payment override was reset due to the grade level change.";
        }

        toast({ title: "Success", description: toastMessage });
        handleStudentDialogClose();
        await loadAllData();
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
        subjects_taught: (dataToUpdate.subjects_taught || '').split(',').map(s => s.trim()).filter(Boolean),
        assigned_classes: selectedTeacherClasses,
        updated_at: new Date().toISOString(),
    };

    try {
        const { error: updateError } = await supabase.from("teachers").update(teacherUpdatePayload).eq("id", id);
        if (updateError) throw updateError;
        toast({ title: "Success", description: "Teacher details updated." });
        handleTeacherDialogClose();
        await loadAllData();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update teacher: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (formData: FormData) => {
    const userId = formData.get('userId') as string;
    const profileTable = formData.get('profileTable') as 'students' | 'teachers';
    const userName = formData.get('userName') as string;
  
    if (!userId || !profileTable) {
      toast({ title: 'Error', description: 'User ID or profile type is missing.', variant: 'destructive' });
      return;
    }
  
    const result = await deleteUserAction({ userId, profileTable });
  
    if (result.success) {
      toast({ title: 'Success', description: `User ${userName} deleted successfully.` });
      await loadAllData(); 
    } else {
      toast({ title: 'Deletion Failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleTeacherClassToggle = (grade: string) => {
    const newSelectedClasses = selectedTeacherClasses.includes(grade)
      ? selectedTeacherClasses.filter((c) => c !== grade)
      : [...selectedTeacherClasses, grade];
    setSelectedTeacherClasses(newSelectedClasses);
  };

  const handleDownloadStatement = (student: StudentForDisplay) => {
    if (!schoolBranding) {
      toast({ title: "Error", description: "School information not loaded.", variant: "destructive"});
      return;
    }
    setStudentForStatement(student);
  };
  
  const handleResetOverrides = async () => {
    setIsResettingOverrides(true);
    try {
        const { error } = await supabase.from('students').update({ total_paid_override: null }).not('total_paid_override', 'is', null);
        if (error) throw error;
        toast({ title: "Success", description: "All student payment overrides have been reset." });
        await loadAllData();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not reset overrides: ${error.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) {
          setIsResettingOverrides(false);
        }
    }
  };

  useEffect(() => {
    const generatePdf = async () => {
        if (studentForStatement && pdfRef.current) {
            setIsDownloading(true);
            const element = pdfRef.current;
            const opt = { margin: 0, filename: `Fee_Statement_${studentForStatement.full_name.replace(/\s+/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().from(element).set(opt).save();
            if (isMounted.current) {
                setStudentForStatement(null);
                setIsDownloading(false);
            }
        }
    };
    if (studentForStatement) generatePdf();
  }, [studentForStatement]);


  const renderStudentEditDialog = () => currentStudent && (
    <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader><DialogTitle>Edit Student: {currentStudent.full_name}</DialogTitle><DialogDescription>Student ID: {currentStudent.student_id_display} (cannot be changed)</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sFullName" className="text-right">Full Name</Label><Input id="sFullName" value={currentStudent.full_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, full_name: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sDob" className="text-right">Date of Birth</Label><Input id="sDob" type="date" value={currentStudent.date_of_birth || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, date_of_birth: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sGradeLevel" className="text-right">Grade Level</Label><Select value={currentStudent.grade_level} onValueChange={(value) => setCurrentStudent(prev => ({ ...prev, grade_level: value }))}><SelectTrigger className="col-span-3" id="sGradeLevel"><SelectValue /></SelectTrigger><SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sGuardianName" className="text-right">Guardian Name</Label><Input id="sGuardianName" value={currentStudent.guardian_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_name: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sGuardianContact" className="text-right">Guardian Contact</Label><Input id="sGuardianContact" value={currentStudent.guardian_contact || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_contact: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sContactEmail" className="text-right">Contact Email</Label><Input id="sContactEmail" type="email" value={currentStudent.contact_email || ""} onChange={(e) => setCurrentStudent(prev => ({...prev, contact_email: e.target.value }))} className="col-span-3" placeholder="Optional email"/></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sTotalPaidOverride" className="text-right">Term Paid Override (GHS)</Label><Input id="sTotalPaidOverride" type="number" placeholder="Leave blank for auto-sum" value={currentStudent.total_paid_override ?? ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, total_paid_override: e.target.value.trim() === "" ? null : parseFloat(e.target.value) }))} className="col-span-3" step="0.01" /></div>
          <p className="col-span-4 text-xs text-muted-foreground px-1 text-center sm:text-left sm:pl-[calc(25%+0.75rem)]">Note: Overriding this amount affects the 'Paid (This Term)' column. It does not alter actual payment records or the 'Total Paid (Year)'.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={handleStudentDialogClose}>Cancel</Button><Button onClick={handleSaveStudent}>Save Changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderTeacherEditDialog = () => currentTeacher && (
    <Dialog open={isTeacherDialogOpen} onOpenChange={setIsTeacherDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader><DialogTitle>Edit Teacher: {currentTeacher.full_name}</DialogTitle><DialogDescription>Email: {currentTeacher.email} (cannot be changed here)</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tFullName" className="text-right">Full Name</Label><Input id="tFullName" value={currentTeacher.full_name || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, full_name: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="tSubjects" className="text-right pt-1">Subjects Taught</Label><Textarea id="tSubjects" value={currentTeacher.subjects_taught || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, subjects_taught: e.target.value }))} className="col-span-3 min-h-[80px]" placeholder="Comma-separated, e.g., Math, Science"/></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tContact" className="text-right">Contact Number</Label><Input id="tContact" value={currentTeacher.contact_number || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, contact_number: e.target.value }))} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Assigned Classes</Label>
            <DropdownMenu><DDMTrigger asChild className="col-span-3"><Button variant="outline" className="justify-between w-full">{selectedTeacherClasses.length > 0 ? `${selectedTeacherClasses.length} class(es) selected` : "Select classes"}<ChevronDown className="ml-2 h-4 w-4" /></Button></DDMTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto"><DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel><DropdownMenuSeparator />{GRADE_LEVELS.map((grade) => (<DropdownMenuCheckboxItem key={grade} checked={selectedTeacherClasses.includes(grade)} onCheckedChange={() => handleTeacherClassToggle(grade)} onSelect={(e) => e.preventDefault()}>{grade}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={handleTeacherDialogClose}>Cancel</Button><Button onClick={handleSaveTeacher}>Save Changes</Button></DialogFooter>
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
            <CardContent><p className="text-destructive/90">You must be logged in as an admin to view this page.</p><Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button></CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><UserCog /> User Management</h2>
        <Button variant="outline" onClick={loadAllData} disabled={isLoadingData}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingData && "animate-spin")} />Refresh All Data
        </Button>
      </div>
       <CardDescription>Displaying student fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong>.</CardDescription>

      {dataLoadingError && (<Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading Data</CardTitle></CardHeader><CardContent><p>{dataLoadingError}</p></CardContent></Card>)}

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Students</CardTitle><CardDescription>View, edit, or delete student records. Select a term to view the specific fees and payments for that period.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[250px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortStudents">Sort by:</Label><Select value={studentSortCriteria} onValueChange={setStudentSortCriteria}><SelectTrigger id="sortStudents" className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full_name">Full Name</SelectItem><SelectItem value="student_id_display">Student ID</SelectItem><SelectItem value="grade_level">Grade Level</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="viewMode">View Term:</Label><Select value={viewMode} onValueChange={setViewMode}><SelectTrigger id="viewMode" className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent>{TERMS_ORDER.map((term, i) => <SelectItem key={term} value={`term${i + 1}`}>{term}</SelectItem>)}</SelectContent></Select></div>
            <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={isResettingOverrides}>{isResettingOverrides ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <RefreshCw className="h-4 w-4 mr-2"/>}Reset All Overrides</Button></AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will clear all manual "Total Paid Overrides" for all students, recalculating their balances based on actual payment records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetOverrides} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, Reset Overrides</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/> Loading student data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>Fees (This Term)</TableHead><TableHead>Paid (This Term)</TableHead><TableHead>Total Paid (Year)</TableHead><TableHead>Overall Balance</TableHead><TableHead>Guardian Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredAndSortedStudents.length === 0 ? <TableRow key="no-students-row"><TableCell colSpan={8} className="text-center h-24">No students found.</TableCell></TableRow> : filteredAndSortedStudents.map((student) => {
                    const balance = student.balance ?? 0;
                    return (<TableRow key={student.id}><TableCell><div className="font-medium">{student.full_name}</div><div className="text-xs text-muted-foreground">{student.student_id_display}</div></TableCell><TableCell>{student.grade_level}</TableCell><TableCell>{(student.feesForSelectedTerm ?? 0).toFixed(2)}</TableCell><TableCell className="font-medium text-green-600">{(student.paidForSelectedTerm ?? 0).toFixed(2)}</TableCell><TableCell>{(student.totalAmountPaid ?? 0).toFixed(2)}</TableCell><TableCell className={balance > 0 ? 'text-destructive' : 'text-green-600'}>{balance.toFixed(2)}</TableCell><TableCell>{student.guardian_contact}</TableCell><TableCell className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="outline" size="icon" onClick={() => handleDownloadStatement(student)} disabled={isDownloading && studentForStatement?.id === student.id} title="Download Fee Statement">{isDownloading && studentForStatement?.id === student.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <ReceiptIcon className="h-4 w-4"/>}</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" disabled={!student.auth_user_id}>
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <form action={handleDeleteUser}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Student Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the profile and authentication account for {student.full_name}? This will permanently revoke their access and delete all their associated data (payments, results, etc.). This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <input type="hidden" name="userId" value={student.auth_user_id || ''} />
                                  <input type="hidden" name="userName" value={student.full_name} />
                                  <input type="hidden" name="profileTable" value="students" />
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete User</AlertDialogAction>
                              </AlertDialogFooter>
                            </form>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell></TableRow>);
                  })}
              </TableBody></Table></div>)}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Teachers</CardTitle><CardDescription>View, edit, or delete teacher records. Deleting a profile revokes application access.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search teachers..." value={teacherSearchTerm} onChange={(e) => setTeacherSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortTeachers">Sort by:</Label><Select value={teacherSortCriteria} onValueChange={setTeacherSortCriteria}><SelectTrigger id="sortTeachers"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full_name">Full Name</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin mr-2"/> Loading teacher data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Contact</TableHead><TableHead>Subjects</TableHead><TableHead>Classes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTeachers.length === 0 ? <TableRow key="no-teachers-row"><TableCell colSpan={6} className="text-center h-24">No teachers found.</TableCell></TableRow> :
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}><TableCell>{teacher.full_name}</TableCell><TableCell>{teacher.email}</TableCell><TableCell>{teacher.contact_number}</TableCell><TableCell className="max-w-xs truncate">{(teacher.subjects_taught || []).join(', ')}</TableCell><TableCell>{teacher.assigned_classes?.join(", ") || "N/A"}</TableCell><TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4"/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" disabled={!teacher.auth_user_id}>
                             <Trash2 className="h-4 w-4"/>
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <form action={handleDeleteUser}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Teacher Deletion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the profile and authentication account for {teacher.full_name}? This will permanently revoke their access. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <input type="hidden" name="userId" value={teacher.auth_user_id || ''} />
                              <input type="hidden" name="userName" value={teacher.full_name} />
                              <input type="hidden" name="profileTable" value="teachers" />
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete User</AlertDialogAction>
                            </AlertDialogFooter>
                          </form>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell></TableRow>
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
