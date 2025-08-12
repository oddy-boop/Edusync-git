
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
import { Users, Edit, Trash2, ChevronDown, UserCog, Search, Loader2, AlertCircle, Receipt as ReceiptIcon, RefreshCw, GraduationCap, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, TERMS_ORDER, SUBJECTS } from "@/lib/constants";
import Link from "next/link";
import pool from "@/lib/db";
import { format as formatDateFns } from "date-fns";
import { FeeStatement } from "@/components/shared/FeeStatement";
import { cn } from "@/lib/utils";
import { deleteUserAction } from "@/lib/actions/user.actions";
import { useAuth } from "@/lib/auth-context";


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
  user_id?: string | null;
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
  feesForSelectedTerm: number;
  paidForSelectedTerm: number;
  balanceForTerm: number;
}

interface TeacherFromSupabase {
  id: string; 
  user_id: string; 
  full_name: string;
  email: string;
  contact_number: string;
  subjects_taught: string[];
  assigned_classes: string[];
  date_of_birth?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface TeacherForEdit {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    contact_number: string;
    subjects_taught: string[];
    assigned_classes: string[];
    date_of_birth?: string | null;
    location?: string | null;
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

// SERVER ACTIONS
async function fetchUsersPageData(schoolId: number, currentYear: string) {
    const client = await pool.connect();
    try {
        const [
            { rows: feeData },
            { rows: studentData },
            { rows: teacherData },
            { rows: paymentsData }
        ] = await Promise.all([
            client.query("SELECT * FROM school_fee_items WHERE school_id = $1 AND academic_year = $2", [schoolId, currentYear]),
            client.query("SELECT * FROM students WHERE school_id = $1 AND is_deleted = false ORDER BY full_name", [schoolId]),
            client.query("SELECT * FROM teachers WHERE school_id = $1 AND is_deleted = false ORDER BY full_name", [schoolId]),
            client.query("SELECT * FROM fee_payments WHERE school_id = $1 ORDER BY payment_date DESC", [schoolId])
        ]);

        return { 
            feeStructure: feeData, 
            students: studentData, 
            teachers: teacherData, 
            payments: paymentsData, 
            error: null 
        };
    } catch (e: any) {
        console.error("[UsersPage] Error fetching page data:", e);
        return { error: e.message };
    } finally {
        client.release();
    }
}

async function updateStudent(studentId: string, payload: any) {
    const client = await pool.connect();
    try {
        await client.query("UPDATE students SET full_name = $1, date_of_birth = $2, grade_level = $3, guardian_name = $4, guardian_contact = $5, contact_email = $6, total_paid_override = $7, updated_at = now() WHERE id = $8",
            [payload.full_name, payload.date_of_birth, payload.grade_level, payload.guardian_name, payload.guardian_contact, payload.contact_email, payload.total_paid_override, studentId]);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

async function updateTeacher(teacherId: string, payload: any) {
    const client = await pool.connect();
    try {
        await client.query("UPDATE teachers SET full_name = $1, date_of_birth = $2, location = $3, contact_number = $4, subjects_taught = $5, assigned_classes = $6, updated_at = now() WHERE id = $7",
            [payload.full_name, payload.date_of_birth, payload.location, payload.contact_number, payload.subjects_taught, payload.assigned_classes, teacherId]);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

async function resetAllOverrides(schoolId: number) {
     const client = await pool.connect();
    try {
        await client.query('UPDATE students SET total_paid_override = NULL WHERE school_id = $1 AND total_paid_override IS NOT NULL', [schoolId]);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}


export default function AdminUsersPage() {
  const { toast } = useToast();
  const { user, schoolId, role } = useAuth();
  const isMounted = useRef(true);

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
  const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState<string[]>([]);
  
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string, type: 'students' | 'teachers' } | null>(null);

  const [studentForStatement, setStudentForStatement] = useState<StudentForDisplay | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [isResettingOverrides, setIsResettingOverrides] = useState(false);
  
  const loadAllData = useCallback(async () => {
    if (!isMounted.current || !schoolId) return;
    setIsLoadingData(true);
    setDataLoadingError(null);
    
    // Fetch school settings and academic year first
    const client = await pool.connect();
    let year = '';
    try {
        const { rows } = await client.query('SELECT name, address, logo_url, current_academic_year FROM schools WHERE id = $1', [schoolId]);
        if (rows.length > 0) {
            if(isMounted.current) {
                year = rows[0].current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
                setCurrentSystemAcademicYear(year);
                setSchoolBranding({ school_name: rows[0].name, school_address: rows[0].address, school_logo_url: rows[0].logo_url });
            }
        }
    } catch(e) {
        console.error("Failed to get school settings:", e);
    } finally {
        client.release();
    }
    if (!year) year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const { feeStructure, students, teachers, payments, error } = await fetchUsersPageData(schoolId, year);

    if (isMounted.current) {
        if(error) {
            setDataLoadingError(error);
        } else {
            setFeeStructureForCurrentYear(feeStructure || []);
            setAllStudents(students || []);
            setTeachers(teachers || []);
            setAllPaymentsFromSupabase(payments || []);
        }
        setIsLoadingData(false);
    }
  }, [schoolId]);

  useEffect(() => {
    isMounted.current = true;
    if(schoolId && user) {
        loadAllData();
    } else if (!user) {
        setIsLoadingData(false);
        setDataLoadingError("You must be logged in as an admin to view this page.");
    }
    return () => { isMounted.current = false; };
  }, [user, schoolId, loadAllData]);

  const filteredAndSortedStudents = useMemo(() => {
    if (isLoadingData) return [];

    const selectedTermIndex = parseInt(viewMode.replace('term', ''), 10) - 1;
    const selectedTermName = TERMS_ORDER[selectedTermIndex];
    
    let academicYearStartDate = "";
    let academicYearEndDate = "";
    if (currentSystemAcademicYear && /^\d{4}-\d{4}$/.test(currentSystemAcademicYear)) {
      const startYear = currentSystemAcademicYear.split('-')[0];
      const endYear = currentSystemAcademicYear.split('-')[1];
      academicYearStartDate = `${startYear}-08-01`; 
      academicYearEndDate = `${endYear}-07-31`;     
    }

    let tempStudents = allStudents.map(student => {
      const studentAllFeeItemsForYear = feeStructureForCurrentYear.filter(item => item.grade_level === student.grade_level);

      const feesForSelectedTerm = studentAllFeeItemsForYear
          .filter(item => item.term === selectedTermName)
          .reduce((sum, item) => sum + item.amount, 0);

      const paymentsForYear = allPaymentsFromSupabase.filter(p =>
        p.student_id_display === student.student_id_display &&
        (academicYearStartDate ? new Date(p.payment_date) >= new Date(academicYearStartDate) : true) &&
        (academicYearEndDate ? new Date(p.payment_date) <= new Date(academicYearEndDate) : true)
      );
      
      let paidForSelectedTerm = 0;
      if (student.total_paid_override !== null && student.total_paid_override !== undefined) {
        paidForSelectedTerm = student.total_paid_override;
      } else {
        paidForSelectedTerm = paymentsForYear
            .filter(p => p.term_paid_for === selectedTermName || p.term_paid_for === 'Online Payment') // Include both term-specific and general online payments
            .reduce((sum, p) => sum + p.amount_paid, 0);
      }
      
      const balanceForTerm = feesForSelectedTerm - paidForSelectedTerm;

      return {
        ...student,
        feesForSelectedTerm,
        paidForSelectedTerm,
        balanceForTerm,
      };
    });

    if (studentSearchTerm) {
      tempStudents = tempStudents.filter(student =>
        student.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.student_id_display.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.grade_level.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    tempStudents.sort((a, b) => {
      if (studentSortCriteria === "full_name") {
        return a.full_name.localeCompare(b.full_name);
      } else if (studentSortCriteria === "student_id_display") {
        return a.student_id_display.localeCompare(b.student_id_display);
      } else if (studentSortCriteria === "grade_level") {
        const indexA = GRADE_LEVELS.indexOf(a.grade_level || "");
        const indexB = GRADE_LEVELS.indexOf(b.grade_level || "");
        if (indexA !== indexB) return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        return a.full_name.localeCompare(b.full_name);
      }
      return 0;
    });

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
  const handleTeacherDialogClose = () => { setIsTeacherDialogOpen(false); setCurrentTeacher(null); setSelectedTeacherClasses([]); setSelectedTeacherSubjects([]); };
  
  const handleOpenEditStudentDialog = (student: StudentForDisplay) => { 
    setCurrentStudent({ ...student }); 
    setIsStudentDialogOpen(true); 
  };
  
  const handleOpenEditTeacherDialog = (teacher: TeacherFromSupabase) => { 
    setCurrentTeacher({
        ...teacher,
        subjects_taught: teacher.subjects_taught || [],
    }); 
    setSelectedTeacherClasses(teacher.assigned_classes || []); 
    setSelectedTeacherSubjects(teacher.subjects_taught || []);
    setIsTeacherDialogOpen(true); 
  };

  const handleSaveStudent = async () => {
    if (!currentStudent || !currentStudent.id || !user) {
        toast({ title: "Error", description: "Student ID missing or not authenticated.", variant: "destructive"});
        return;
    }
    
    const originalStudent = allStudents.find(s => s.id === currentStudent.id);
    if (!originalStudent) {
        toast({ title: "Error", description: "Cannot find original student data. Update aborted.", variant: "destructive" });
        return;
    }

    const { id, feesForSelectedTerm, paidForSelectedTerm, balanceForTerm, ...dataToUpdate } = currentStudent as Partial<StudentForDisplay>;

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
    };

    if (originalStudent && originalStudent.grade_level !== studentUpdatePayload.grade_level) {
        studentUpdatePayload.total_paid_override = 0;
    }

    const result = await updateStudent(id, studentUpdatePayload);

    if(result.success) {
        let toastMessage = "Student details updated.";
        if (originalStudent && originalStudent.grade_level !== studentUpdatePayload.grade_level) {
            toastMessage += " Payment override was reset to 0 due to the grade level change.";
        }
        toast({ title: "Success", description: toastMessage });
        handleStudentDialogClose();
        await loadAllData();
    } else {
        toast({ title: "Error", description: `Could not update student: ${result.message}`, variant: "destructive" });
    }
  };
  
  const handleSaveTeacher = async () => {
    if (!currentTeacher || !currentTeacher.id || !user) {
        toast({ title: "Error", description: "Teacher ID missing or not authenticated.", variant: "destructive"});
        return;
    }

    const { id, email, user_id, created_at, updated_at, is_deleted, ...dataToUpdate } = currentTeacher;

    const teacherUpdatePayload = {
        full_name: dataToUpdate.full_name,
        date_of_birth: dataToUpdate.date_of_birth,
        location: dataToUpdate.location,
        contact_number: dataToUpdate.contact_number,
        subjects_taught: selectedTeacherSubjects,
        assigned_classes: selectedTeacherClasses,
    };
    
    const result = await updateTeacher(id, teacherUpdatePayload);
    
    if(result.success) {
        toast({ title: "Success", description: "Teacher details updated." });
        handleTeacherDialogClose();
        await loadAllData();
    } else {
        toast({ title: "Error", description: `Could not update teacher: ${result.message}`, variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !userToDelete.id) return;
    
    const result = await deleteUserAction(userToDelete.id);

    if (result.success) {
      toast({ title: "Success", description: result.message });
      await loadAllData();
    } else {
      toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
    }
    setUserToDelete(null);
  };

  const handleTeacherClassToggle = (grade: string) => {
    const newSelectedClasses = selectedTeacherClasses.includes(grade)
      ? selectedTeacherClasses.filter((c) => c !== grade)
      : [...selectedTeacherClasses, grade];
    setSelectedTeacherClasses(newSelectedClasses);
  };

  const handleTeacherSubjectToggle = (subject: string) => {
    const newSelectedSubjects = selectedTeacherSubjects.includes(subject)
      ? selectedTeacherSubjects.filter((s) => s !== subject)
      : [...selectedTeacherSubjects, subject];
    setSelectedTeacherSubjects(newSelectedSubjects);
  };


  const handleDownloadStatement = async (student: StudentForDisplay) => {
    if (!schoolBranding) {
      toast({ title: "Error", description: "School information not loaded.", variant: "destructive"});
      return;
    }
    setStudentForStatement(student);
  
    await new Promise(resolve => setTimeout(resolve, 100));
  
    if (pdfRef.current && typeof window !== 'undefined') {
      setIsDownloading(true);
      const html2pdf = (await import('html2pdf.js')).default;
      const element = pdfRef.current;
      const opt = { margin: 0, filename: `Fee_Statement_${student.full_name.replace(/\s+/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 1.5, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      await html2pdf().from(element).set(opt).save();
      if (isMounted.current) {
        setStudentForStatement(null);
        setIsDownloading(false);
      }
    }
  };

  
  const handleResetOverrides = async () => {
    if(!schoolId) return;
    setIsResettingOverrides(true);
    const result = await resetAllOverrides(schoolId);
    if(result.success) {
        toast({ title: "Success", description: "All student payment overrides have been reset." });
        await loadAllData();
    } else {
        toast({ title: "Error", description: `Could not reset overrides: ${result.message}`, variant: "destructive" });
    }
    if (isMounted.current) {
        setIsResettingOverrides(false);
    }
  };

  const renderStudentEditDialog = () => currentStudent && (
    <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader><DialogTitle>Edit Student: {currentStudent.full_name}</DialogTitle><DialogDescription>Student ID: {currentStudent.student_id_display} (cannot be changed)</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
          <div><Label htmlFor="sFullName">Full Name</Label><Input id="sFullName" value={currentStudent.full_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, full_name: e.target.value }))} /></div>
          <div><Label htmlFor="sDob">Date of Birth</Label><Input id="sDob" type="date" value={currentStudent.date_of_birth || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, date_of_birth: e.target.value }))} /></div>
          <div><Label htmlFor="sGradeLevel">Grade Level</Label><Select value={currentStudent.grade_level} onValueChange={(value) => setCurrentStudent(prev => ({ ...prev, grade_level: value }))}><SelectTrigger id="sGradeLevel"><SelectValue /></SelectTrigger><SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="sGuardianName">Guardian Name</Label><Input id="sGuardianName" value={currentStudent.guardian_name || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_name: e.target.value }))} /></div>
          <div><Label htmlFor="sGuardianContact">Guardian Contact</Label><Input id="sGuardianContact" value={currentStudent.guardian_contact || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardian_contact: e.target.value }))} /></div>
          <div><Label htmlFor="sContactEmail">Contact Email</Label><Input id="sContactEmail" type="email" value={currentStudent.contact_email || ""} onChange={(e) => setCurrentStudent(prev => ({...prev, contact_email: e.target.value }))} placeholder="Optional email"/></div>
          <div><Label htmlFor="sTotalPaidOverride">Term Paid Override (GHS)</Label><Input id="sTotalPaidOverride" type="number" placeholder="Leave blank for auto-sum" value={currentStudent.total_paid_override ?? ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, total_paid_override: e.target.value.trim() === "" ? null : parseFloat(e.target.value) }))} step="0.01" /><p className="text-xs text-muted-foreground mt-1">Note: Overriding this amount affects the 'Paid (This Term)' column. It does not alter actual payment records or the 'Total Paid (Year)'.</p></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={handleStudentDialogClose}>Cancel</Button><Button onClick={handleSaveStudent}>Save Changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderTeacherEditDialog = () => currentTeacher && (
    <Dialog open={isTeacherDialogOpen} onOpenChange={setIsTeacherDialogOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader><DialogTitle>Edit Teacher: {currentTeacher.full_name}</DialogTitle><DialogDescription>Email: {currentTeacher.email} (cannot be changed here)</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
          <div><Label htmlFor="tFullName">Full Name</Label><Input id="tFullName" value={currentTeacher.full_name || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, full_name: e.target.value }))} /></div>
          <div><Label htmlFor="tDob">Date of Birth</Label><Input id="tDob" type="date" value={currentTeacher.date_of_birth || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, date_of_birth: e.target.value }))} /></div>
          <div><Label htmlFor="tLocation" className="flex items-center"><MapPin className="mr-1 h-4 w-4"/>Location</Label><Input id="tLocation" value={currentTeacher.location || ""} onChange={(e) => setCurrentTeacher(prev => ({...prev, location: e.target.value }))} /></div>
          <div><Label htmlFor="tContact">Contact Number</Label><Input id="tContact" value={currentTeacher.contact_number || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, contact_number: e.target.value }))} /></div>
          <div><Label>Subjects Taught</Label>
            <DropdownMenu><DDMTrigger asChild><Button variant="outline" className="justify-between w-full">{selectedTeacherSubjects.length > 0 ? `${selectedTeacherSubjects.length} subject(s) selected` : "Select subjects"}<ChevronDown className="ml-2 h-4 w-4" /></Button></DDMTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto"><DropdownMenuLabel>Available Subjects</DropdownMenuLabel><DropdownMenuSeparator />{SUBJECTS.map((subject) => (<DropdownMenuCheckboxItem key={subject} checked={selectedTeacherSubjects.includes(subject)} onCheckedChange={() => handleTeacherSubjectToggle(subject)} onSelect={(e) => e.preventDefault()}>{subject}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div><Label>Assigned Classes</Label>
            <DropdownMenu><DDMTrigger asChild><Button variant="outline" className="justify-between w-full">{selectedTeacherClasses.length > 0 ? `${selectedTeacherClasses.length} class(es) selected` : "Select classes"}<ChevronDown className="ml-2 h-4 w-4" /></Button></DDMTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto"><DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel><DropdownMenuSeparator />{GRADE_LEVELS.map((grade) => (<DropdownMenuCheckboxItem key={grade} checked={selectedTeacherClasses.includes(grade)} onCheckedChange={() => handleTeacherClassToggle(grade)} onSelect={(e) => e.preventDefault()}>{grade}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={handleTeacherDialogClose}>Cancel</Button><Button onClick={handleSaveTeacher}>Save Changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!user && !isLoadingData) {
    return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Access Denied</CardTitle></CardHeader>
            <CardContent><p className="text-destructive/90">You must be logged in as an admin to view this page.</p><Button asChild className="mt-4"><Link href="/auth/admin/login">Go to Admin Login</Link></Button></CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><UserCog /> User Management</h2>
          <CardDescription className="mt-1">Displaying student fees for academic year: <strong>{currentSystemAcademicYear || "Loading..."}</strong>.</CardDescription>
        </div>
        <Button variant="outline" onClick={loadAllData} disabled={isLoadingData}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingData && "animate-spin")} />Refresh All Data
        </Button>
      </div>

      {dataLoadingError && (<Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading Data</CardTitle></CardHeader><CardContent><p>{dataLoadingError}</p></CardContent></Card>)}

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {userToDelete?.type === 'students' ? 'Student' : 'Teacher'} Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the profile and authentication account for {userToDelete?.name}? This will permanently revoke their access and delete all their associated data (payments, results, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Grade</TableHead><TableHead>Fees (This Term)</TableHead><TableHead>Paid (This Term)</TableHead><TableHead>Balance (This Term)</TableHead><TableHead className="hidden sm:table-cell">Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredAndSortedStudents.length === 0 ? <TableRow key="no-students-row"><TableCell colSpan={8} className="text-center h-24">No students found.</TableCell></TableRow> : filteredAndSortedStudents.map((student) => {
                    const balance = student.balanceForTerm;
                    return (<TableRow key={student.id}><TableCell><div className="font-medium">{student.full_name}</div><div className="text-xs text-muted-foreground">{student.student_id_display}</div></TableCell><TableCell className="hidden md:table-cell">{student.grade_level}</TableCell><TableCell>{(student.feesForSelectedTerm).toFixed(2)}</TableCell><TableCell className="font-medium text-green-600">{(student.paidForSelectedTerm).toFixed(2)}{student.total_paid_override !== undefined && student.total_paid_override !== null && <span className="text-xs text-blue-500 ml-1">(Overridden)</span>}</TableCell><TableCell className={balance > 0 ? 'text-destructive' : 'text-green-600'}>{balance.toFixed(2)}</TableCell><TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                        <span>{student.guardian_contact}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" asChild><a href={`tel:${student.guardian_contact}`}><Phone className="h-4 w-4"/></a></Button>
                        </div>
                    </TableCell><TableCell className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="outline" size="icon" onClick={() => handleDownloadStatement(student)} disabled={isDownloading && studentForStatement?.id === student.id} title="Download Fee Statement">{isDownloading && studentForStatement?.id === student.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <ReceiptIcon className="h-4 w-4"/>}</Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => student.user_id && setUserToDelete({ id: student.user_id, name: student.full_name, type: 'students' })} disabled={!student.user_id}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
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
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name / Contact</TableHead><TableHead className="hidden sm:table-cell">Email</TableHead><TableHead className="hidden md:table-cell">Subjects</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTeachers.length === 0 ? <TableRow key="no-teachers-row"><TableCell colSpan={6} className="text-center h-24">No teachers found.</TableCell></TableRow> :
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="font-medium">{teacher.full_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{teacher.contact_number}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" asChild><a href={`tel:${teacher.contact_number}`}><Phone className="h-3 w-3"/></a></Button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{teacher.email}</TableCell>
                    <TableCell className="max-w-xs truncate hidden md:table-cell">{(teacher.subjects_taught || []).join(', ')}</TableCell><TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => teacher.user_id && setUserToDelete({ id: teacher.user_id, name: teacher.full_name, type: 'teachers' })} disabled={!teacher.user_id}>
                        <Trash2 className="h-4 w-4"/>
                      </Button>
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
                    payments={allPaymentsFromSupabase.filter(p => {
                        const paymentDate = new Date(p.payment_date);
                        const startYear = parseInt(currentSystemAcademicYear.split('-')[0], 10);
                        const endYear = parseInt(currentSystemAcademicYear.split('-')[1], 10);
                        const startDate = new Date(startYear, 7, 1); // August 1st of start year
                        const endDate = new Date(endYear, 6, 31);   // July 31st of end year
                        return p.student_id_display === studentForStatement.student_id_display && new Date(p.payment_date) >= startDate && new Date(p.payment_date) <= endDate;
                    })}
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
