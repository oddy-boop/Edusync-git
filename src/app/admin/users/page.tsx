
"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import { 
  GRADE_LEVELS, 
  SCHOOL_FEE_STRUCTURE_KEY, 
  FEE_PAYMENTS_KEY, 
  REGISTERED_STUDENTS_KEY, 
  REGISTERED_TEACHERS_KEY,
  ADMIN_LOGGED_IN_KEY 
} from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt";
import Link from "next/link";


interface StudentData {
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
  contactEmail?: string;
  totalPaidOverride?: number | null;
  createdAt: string; 
}
interface RegisteredStudent extends StudentData {
  studentId: string;
  totalFeesDue?: number;
  totalAmountPaid?: number;
}

interface RegisteredTeacher {
  uid: string;
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role?: string;
  createdAt: string; 
}

interface FeeItem {
  id: string;
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  
  const [isAdminSessionActive, setIsAdminSessionActive] = useState(false);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState(true);

  const [allStudents, setAllStudents] = useState<RegisteredStudent[]>([]);
  const [teachers, setTeachers] = useState<RegisteredTeacher[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeItem[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentDetails[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // Combined data loading state

  const [filteredAndSortedStudents, setFilteredAndSortedStudents] = useState<RegisteredStudent[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [studentSortCriteria, setStudentSortCriteria] = useState<string>("fullName");

  const [filteredTeachers, setFilteredTeachers] = useState<RegisteredTeacher[]>([]);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>("");
  const [teacherSortCriteria, setTeacherSortCriteria] = useState<string>("fullName");

  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<RegisteredStudent> | null>(null);

  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<RegisteredTeacher> | null>(null);
  const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<string[]>([]);

  const [studentToDelete, setStudentToDelete] = useState<RegisteredStudent | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<RegisteredTeacher | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminLoggedIn = localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true";
      setIsAdminSessionActive(adminLoggedIn);
      setIsCheckingAdminSession(false);
      
      if (adminLoggedIn) {
        setIsLoadingData(true);
        try {
          const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
          setAllStudents(studentsRaw ? JSON.parse(studentsRaw) : []);
        } catch (e) { console.error("Error loading students from localStorage", e); toast({title:"Error", description:"Could not load students.", variant:"destructive"});}

        try {
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          setTeachers(teachersRaw ? JSON.parse(teachersRaw) : []);
        } catch (e) { console.error("Error loading teachers from localStorage", e); toast({title:"Error", description:"Could not load teachers.", variant:"destructive"});}
        
        try {
          const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
          setFeeStructure(feeStructureRaw ? JSON.parse(feeStructureRaw) : []);
        } catch (e) { console.error("Error loading fee structure from localStorage", e); }
        
        try {
          const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
          setAllPayments(paymentsRaw ? JSON.parse(paymentsRaw) : []);
        } catch (e) { console.error("Error loading payments from localStorage", e); }
        setIsLoadingData(false);
      } else {
        setIsLoadingData(false); // Not loading data if not admin
      }
    }
  }, [toast]);

  
   useEffect(() => {
    let tempStudents = [...allStudents].map(student => {
      const studentFeesDue = feeStructure
        .filter(item => item.gradeLevel === student.gradeLevel)
        .reduce((sum, item) => sum + item.amount, 0);

      const studentTotalPaidFromPayments = allPayments
        .filter(p => p.studentId === student.studentId)
        .reduce((sum, p) => sum + p.amountPaid, 0);

      return {
        ...student,
        totalFeesDue: studentFeesDue,
        totalAmountPaid: studentTotalPaidFromPayments,
      };
    });

    if (studentSearchTerm) {
      tempStudents = tempStudents.filter(student =>
        student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.gradeLevel.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }

    if (studentSortCriteria === "fullName") {
      tempStudents.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (studentSortCriteria === "studentId") {
      tempStudents.sort((a, b) => a.studentId.localeCompare(b.studentId));
    } else if (studentSortCriteria === "gradeLevel") {
      tempStudents.sort((a, b) => {
        const gradeA = a.gradeLevel || "";
        const gradeB = b.gradeLevel || "";
        const indexA = GRADE_LEVELS.indexOf(gradeA);
        const indexB = GRADE_LEVELS.indexOf(gradeB);
        const valA = indexA === -1 ? Infinity : indexA;
        const valB = indexB === -1 ? Infinity : indexB;

        if (valA !== valB) { return valA - valB; }
        return a.fullName.localeCompare(b.fullName);
      });
    }
    setFilteredAndSortedStudents(tempStudents);
  }, [allStudents, studentSearchTerm, studentSortCriteria, feeStructure, allPayments]);

  
  useEffect(() => {
    let tempTeachers = [...teachers];
    if (teacherSearchTerm) {
      tempTeachers = tempTeachers.filter(teacher =>
        teacher.fullName.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        (teacher.subjectsTaught && teacher.subjectsTaught.toLowerCase().includes(teacherSearchTerm.toLowerCase())) ||
        (teacher.assignedClasses && teacher.assignedClasses.join(", ").toLowerCase().includes(teacherSearchTerm.toLowerCase()))
      );
    }
    if (teacherSortCriteria === "fullName") tempTeachers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (teacherSortCriteria === "email") tempTeachers.sort((a, b) => a.email.localeCompare(b.email));
    setFilteredTeachers(tempTeachers);
  }, [teachers, teacherSearchTerm, teacherSortCriteria]);


  const handleStudentDialogClose = () => { setIsStudentDialogOpen(false); setCurrentStudent(null); };
  const handleTeacherDialogClose = () => { setIsTeacherDialogOpen(false); setCurrentTeacher(null); setSelectedTeacherClasses([]); };
  const handleOpenEditStudentDialog = (student: RegisteredStudent) => { setCurrentStudent({ ...student }); setIsStudentDialogOpen(true); };
  const handleOpenEditTeacherDialog = (teacher: RegisteredTeacher) => { setCurrentTeacher({ ...teacher }); setSelectedTeacherClasses(teacher.assignedClasses || []); setIsTeacherDialogOpen(true); };

  const handleSaveStudent = async () => {
    if (typeof window === 'undefined' || !currentStudent || !currentStudent.studentId) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); return; }

    const { studentId, totalFeesDue, totalAmountPaid, ...studentDataToUpdate } = currentStudent;
    let overrideAmount: number | null = null;
    if (studentDataToUpdate.totalPaidOverride !== undefined && studentDataToUpdate.totalPaidOverride !== null && String(studentDataToUpdate.totalPaidOverride).trim() !== '') {
        const parsedAmount = parseFloat(String(studentDataToUpdate.totalPaidOverride));
        if (!isNaN(parsedAmount)) { overrideAmount = parsedAmount; }
    }
    const updatedStudent: Partial<RegisteredStudent> = { 
      fullName: studentDataToUpdate.fullName,
      dateOfBirth: studentDataToUpdate.dateOfBirth,
      gradeLevel: studentDataToUpdate.gradeLevel,
      guardianName: studentDataToUpdate.guardianName,
      guardianContact: studentDataToUpdate.guardianContact,
      contactEmail: studentDataToUpdate.contactEmail,
      totalPaidOverride: overrideAmount,
      createdAt: currentStudent.createdAt || new Date().toISOString(),
    };

    try {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        let studentsList: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const studentIndex = studentsList.findIndex(s => s.studentId === studentId);
        if (studentIndex !== -1) {
            studentsList[studentIndex] = { ...studentsList[studentIndex], ...updatedStudent, studentId };
            localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(studentsList));
            setAllStudents(studentsList);
            toast({ title: "Success", description: "Student details updated in localStorage." });
            handleStudentDialogClose();
        } else {
            toast({ title: "Error", description: "Student not found for update.", variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update student: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveTeacher = async () => {
    if (typeof window === 'undefined' || !currentTeacher || !currentTeacher.uid) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); return; }

    const { uid, email, role, createdAt, ...teacherDataToUpdate } = currentTeacher; 
    const updatedTeacherPayload: RegisteredTeacher = {
        uid,
        email: email || "", 
        role: role || "teacher",
        createdAt: createdAt || new Date().toISOString(), 
        fullName: teacherDataToUpdate.fullName || "",
        subjectsTaught: teacherDataToUpdate.subjectsTaught || "",
        contactNumber: teacherDataToUpdate.contactNumber || "",
        assignedClasses: selectedTeacherClasses,
    };

    try {
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        let teachersList: RegisteredTeacher[] = teachersRaw ? JSON.parse(teachersRaw) : [];
        const teacherIndex = teachersList.findIndex(t => t.uid === uid);
        if (teacherIndex !== -1) {
            teachersList[teacherIndex] = updatedTeacherPayload;
            localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(teachersList));
            setTeachers(teachersList);
            toast({ title: "Success", description: "Teacher details updated in localStorage." });
            handleTeacherDialogClose();
        } else {
            toast({ title: "Error", description: "Teacher not found for update.", variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update teacher: ${error.message}`, variant: "destructive" });
    }
  };

  const confirmDeleteStudent = async () => {
    if (typeof window === 'undefined' || !studentToDelete || !studentToDelete.studentId) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); setStudentToDelete(null); return; }
    try {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        let studentsList: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const updatedStudents = studentsList.filter(s => s.studentId !== studentToDelete!.studentId);
        localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(updatedStudents));
        setAllStudents(updatedStudents);
        toast({ title: "Success", description: `Student ${studentToDelete.fullName} deleted from localStorage.` });
        setStudentToDelete(null);
    } catch (error: any) {
        toast({ title: "Error", description: `Could not delete student: ${error.message}`, variant: "destructive" });
        setStudentToDelete(null);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (typeof window === 'undefined' || !teacherToDelete || !teacherToDelete.uid) return;
    if (!isAdminSessionActive) { toast({ title: "Permission Error", description: "Admin action required.", variant: "destructive" }); setTeacherToDelete(null); return; }
    try {
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        let teachersList: RegisteredTeacher[] = teachersRaw ? JSON.parse(teachersRaw) : [];
        const updatedTeachers = teachersList.filter(t => t.uid !== teacherToDelete!.uid);
        localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(updatedTeachers));
        setTeachers(updatedTeachers);
        toast({ title: "Success", description: `Teacher ${teacherToDelete.fullName} deleted from localStorage.` });
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
          <DialogTitle>Edit Student: {currentStudent.fullName}</DialogTitle>
          <DialogDescription>Student ID: {currentStudent.studentId} (cannot be changed)</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sFullName" className="text-right">Full Name</Label>
            <Input id="sFullName" value={currentStudent.fullName || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, fullName: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sDob" className="text-right">Date of Birth</Label>
            <Input id="sDob" type="date" value={currentStudent.dateOfBirth || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, dateOfBirth: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGradeLevel" className="text-right">Grade Level</Label>
            <Select value={currentStudent.gradeLevel} onValueChange={(value) => setCurrentStudent(prev => ({ ...prev, gradeLevel: value }))}>
              <SelectTrigger className="col-span-3" id="sGradeLevel"><SelectValue /></SelectTrigger>
              <SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGuardianName" className="text-right">Guardian Name</Label>
            <Input id="sGuardianName" value={currentStudent.guardianName || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardianName: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sGuardianContact" className="text-right">Guardian Contact</Label>
            <Input id="sGuardianContact" value={currentStudent.guardianContact || ""} onChange={(e) => setCurrentStudent(prev => ({ ...prev, guardianContact: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sContactEmail" className="text-right">Contact Email</Label>
            <Input id="sContactEmail" type="email" value={currentStudent.contactEmail || ""} onChange={(e) => setCurrentStudent(prev => ({...prev, contactEmail: e.target.value }))} className="col-span-3" placeholder="Optional email"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sTotalPaidOverride" className="text-right">Total Paid Override (GHS)</Label>
            <Input
              id="sTotalPaidOverride" type="number" placeholder="Leave blank for auto-sum"
              value={currentStudent.totalPaidOverride === null || currentStudent.totalPaidOverride === undefined ? "" : String(currentStudent.totalPaidOverride)}
              onChange={(e) => setCurrentStudent(prev => ({ ...prev, totalPaidOverride: e.target.value.trim() === "" ? null : parseFloat(e.target.value) }))}
              className="col-span-3" step="0.01"
            />
          </div>
           <p className="col-span-4 text-xs text-muted-foreground px-1 text-center sm:text-left sm:pl-[calc(25%+0.75rem)]">
            Note: Overriding total paid affects display & balance. It does not alter individual payment records.
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
          <DialogTitle>Edit Teacher: {currentTeacher.fullName}</DialogTitle>
          <DialogDescription>Email: {currentTeacher.email} (cannot be changed here)</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tFullName" className="text-right">Full Name</Label>
            <Input id="tFullName" value={currentTeacher.fullName || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, fullName: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tSubjects" className="text-right">Subjects Taught</Label>
            <Textarea id="tSubjects" value={currentTeacher.subjectsTaught || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, subjectsTaught: e.target.value }))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tContact" className="text-right">Contact Number</Label>
            <Input id="tContact" value={currentTeacher.contactNumber || ""} onChange={(e) => setCurrentTeacher(prev => ({ ...prev, contactNumber: e.target.value }))} className="col-span-3" />
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
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Students</CardTitle><CardDescription>View, edit, or delete student records from localStorage.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortStudents">Sort by:</Label><Select value={studentSortCriteria} onValueChange={setStudentSortCriteria}><SelectTrigger id="sortStudents"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fullName">Full Name</SelectItem><SelectItem value="studentId">Student ID</SelectItem><SelectItem value="gradeLevel">Grade Level</SelectItem></SelectContent></Select></div>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/> Loading student data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>Fees Due</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Guardian Contact</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredAndSortedStudents.length === 0 ? <TableRow key="no-students-row"><TableCell colSpan={8} className="text-center h-24">No students found.</TableCell></TableRow> : filteredAndSortedStudents.map((student) => {
                    const displayTotalPaid = student.totalPaidOverride !== undefined && student.totalPaidOverride !== null ? student.totalPaidOverride : (student.totalAmountPaid ?? 0);
                    const feesDue = student.totalFeesDue ?? 0; const balance = feesDue - displayTotalPaid;
                    return (<TableRow key={student.studentId}><TableCell>{student.studentId}</TableCell><TableCell>{student.fullName}</TableCell><TableCell>{student.gradeLevel}</TableCell><TableCell>{feesDue.toFixed(2)}</TableCell><TableCell>{displayTotalPaid.toFixed(2)}{student.totalPaidOverride !== undefined && student.totalPaidOverride !== null && <span className="text-xs text-blue-500 ml-1">(Overridden)</span>}</TableCell><TableCell className={balance > 0 ? 'text-destructive' : 'text-green-600'}>{balance.toFixed(2)}</TableCell><TableCell>{student.guardianContact}</TableCell><TableCell className="space-x-1"><Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete student {studentToDelete?.fullName}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>);
                  })}
              </TableBody></Table></div>)}
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Registered Teachers</CardTitle><CardDescription>View, edit, or delete teacher records from localStorage.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search teachers..." value={teacherSearchTerm} onChange={(e) => setTeacherSearchTerm(e.target.value)} className="pl-8"/></div>
            <div className="flex items-center gap-2 w-full sm:w-auto"><Label htmlFor="sortTeachers">Sort by:</Label><Select value={teacherSortCriteria} onValueChange={setTeacherSortCriteria}><SelectTrigger id="sortTeachers"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fullName">Full Name</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
          </div>
          {isLoadingData ? <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin"/> Loading teacher data...</div> : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Contact</TableHead><TableHead>Subjects</TableHead><TableHead>Classes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTeachers.length === 0 ? <TableRow key="no-teachers-row"><TableCell colSpan={6} className="text-center h-24">No teachers found.</TableCell></TableRow> : 
                filteredTeachers
                  .filter(teacher => teacher && teacher.uid) 
                  .map((teacher) => (
                  <TableRow key={teacher.uid}>
                    <TableCell>{teacher.fullName}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.contactNumber}</TableCell>
                    <TableCell className="max-w-xs truncate">{teacher.subjectsTaught}</TableCell>
                    <TableCell>{teacher.assignedClasses?.join(", ") || "N/A"}</TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4"/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setTeacherToDelete(teacher)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete teacher {teacherToDelete?.fullName}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
    

    
