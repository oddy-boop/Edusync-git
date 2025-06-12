
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
  AlertDialogTrigger, // Added AlertDialogTrigger
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
  DropdownMenuTrigger as DDMTrigger, // Renamed to avoid conflict if local trigger is named same
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit, Trash2, ChevronDown, UserCog, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, SCHOOL_FEE_STRUCTURE_KEY, FEE_PAYMENTS_KEY } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

// Interfaces based on registration forms
interface StudentData {
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
  contactEmail?: string;
  totalPaidOverride?: number | null; 
}
interface RegisteredStudent extends StudentData {
  studentId: string;
  totalFeesDue?: number;
  totalAmountPaid?: number;
}

interface RegisteredTeacher {
  uid: string; // Firebase Auth UID, also document ID in Firestore
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
  role?: string;
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [allStudents, setAllStudents] = useState<RegisteredStudent[]>([]);
  const [teachers, setTeachers] = useState<RegisteredTeacher[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeItem[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);


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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!authChecked) return; 

    const loadData = async () => {
      setIsLoading(true);

      if (!currentUser) {
          console.error("[AdminUsersPage] Critical: No authenticated user found. Cannot fetch user data.");
          toast({ title: "Authentication Error", description: "Cannot fetch user data: not authenticated. Please log in again.", variant: "destructive" });
          setIsLoading(false);
          return;
      }

      console.log("[AdminUsersPage] Attempting to fetch users. Current auth user object:", auth.currentUser);
      try {
        const idTokenResult = await currentUser.getIdTokenResult();
        console.log("[AdminUsersPage] Current user ID Token claims:", idTokenResult.claims);
        if (idTokenResult.claims.isAdmin !== true) {
            console.warn("[AdminUsersPage] User does not have 'isAdmin: true' custom claim. Data fetching may fail due to permissions.");
            toast({ title: "Permission Warning", description: "Current user may not have admin privileges according to token claims. Check console.", variant: "warning", duration: 7000 });
        }
      } catch (tokenError) {
          console.error("[AdminUsersPage] Error fetching ID token result:", tokenError);
          toast({ title: "Token Error", description: "Could not verify user claims.", variant: "destructive" });
      }


      // Load student data from Firestore
      try {
        const studentsCollectionRef = collection(db, "students");
        const studentSnapshots = await getDocs(studentsCollectionRef);
        const studentList = studentSnapshots.docs.map(docSnap => ({
          studentId: docSnap.id,
          ...(docSnap.data() as StudentData)
        })) as RegisteredStudent[];
        setAllStudents(studentList);
      } catch (error) {
        console.error("AdminUsersPage: Error fetching students from Firestore:", error);
        toast({ title: "Error Fetching Students", description: "Could not fetch student records from Firestore. Check permissions and console.", variant: "destructive" });
        setAllStudents([]);
      }

      // Load teacher data from Firestore
      try {
        const teachersCollectionRef = collection(db, "teachers");
        const teacherSnapshots = await getDocs(teachersCollectionRef);
        const teacherList = teacherSnapshots.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as RegisteredTeacher));
        setTeachers(teacherList);
      } catch (error) {
        console.error("AdminUsersPage: Error fetching teachers from Firestore:", error);
        toast({ title: "Error Fetching Teachers", description: "Couldn't fetch teachers data from Firebase. Ensure admin claims are set and Firestore rules allow admin access.", variant: "destructive", duration: 9000 });
        setTeachers([]);
      }

      // Load fee structure and payments from localStorage
      if (typeof window !== 'undefined') {
        const feeStructureRaw = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
        setFeeStructure(feeStructureRaw ? JSON.parse(feeStructureRaw) : []);
        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        setAllPayments(paymentsRaw ? JSON.parse(paymentsRaw) : []);
      }
      setIsLoading(false);
    };
    
    if (currentUser) { 
        loadData();
    } else if (authChecked && !currentUser) {
        toast({ title: "Not Authenticated", description: "Please log in as an admin to view this page.", variant: "destructive" });
        setIsLoading(false);
    }
  }, [authChecked, currentUser, toast]); 

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

        if (valA !== valB) {
            return valA - valB;
        }
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

    if (teacherSortCriteria === "fullName") {
      tempTeachers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (teacherSortCriteria === "email") {
      tempTeachers.sort((a, b) => a.email.localeCompare(b.email));
    }

    setFilteredTeachers(tempTeachers);
  }, [teachers, teacherSearchTerm, teacherSortCriteria]);


  const handleStudentDialogClose = () => {
    setIsStudentDialogOpen(false);
    setCurrentStudent(null);
  };

  const handleTeacherDialogClose = () => {
    setIsTeacherDialogOpen(false);
    setCurrentTeacher(null);
    setSelectedTeacherClasses([]);
  };

  const handleOpenEditStudentDialog = (student: RegisteredStudent) => {
    setCurrentStudent({ ...student });
    setIsStudentDialogOpen(true);
  };

  const handleOpenEditTeacherDialog = (teacher: RegisteredTeacher) => {
    setCurrentTeacher({ ...teacher });
    setSelectedTeacherClasses(teacher.assignedClasses || []);
    setIsTeacherDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!currentStudent || !currentStudent.studentId) {
        toast({ title: "Error", description: "Student ID not found for update.", variant: "destructive" });
        return;
    }
    if (!currentUser) { 
        toast({ title: "Authentication Error", description: "Admin not authenticated.", variant: "destructive" });
        return;
    }

    const { studentId, totalFeesDue, totalAmountPaid, ...studentDataToUpdate } = currentStudent;
    
    let overrideAmount: number | null = null;
    if (studentDataToUpdate.totalPaidOverride !== undefined && studentDataToUpdate.totalPaidOverride !== null && String(studentDataToUpdate.totalPaidOverride).trim() !== '') {
        const parsedAmount = parseFloat(String(studentDataToUpdate.totalPaidOverride));
        if (!isNaN(parsedAmount)) {
            overrideAmount = parsedAmount;
        }
    }
    const finalStudentData: Partial<StudentData> = {
      fullName: studentDataToUpdate.fullName,
      dateOfBirth: studentDataToUpdate.dateOfBirth,
      gradeLevel: studentDataToUpdate.gradeLevel,
      guardianName: studentDataToUpdate.guardianName,
      guardianContact: studentDataToUpdate.guardianContact,
      contactEmail: studentDataToUpdate.contactEmail,
      totalPaidOverride: overrideAmount, 
    };

    try {
        const studentDocRef = doc(db, "students", studentId);
        await updateDoc(studentDocRef, finalStudentData);

        const updatedStudentsList = allStudents.map(s =>
            s.studentId === studentId ? { ...s, ...finalStudentData, studentId } as RegisteredStudent : s
        );
        setAllStudents(updatedStudentsList);
        toast({ title: "Success", description: "Student details updated in Firestore." });
        handleStudentDialogClose();
    } catch (error) {
        console.error("Error updating student in Firestore:", error);
        toast({ title: "Error", description: "Could not update student details.", variant: "destructive" });
    }
  };

  const handleSaveTeacher = async () => {
    if (!currentTeacher || !currentTeacher.uid) {
        toast({ title: "Error", description: "Teacher UID not found for update.", variant: "destructive" });
        return;
    }
    if (!currentUser) { 
        toast({ title: "Authentication Error", description: "Admin not authenticated.", variant: "destructive" });
        return;
    }

    const { uid, email, role, ...teacherDataToUpdate } = currentTeacher; 
    const updatedTeacherPayload: Partial<Omit<RegisteredTeacher, 'uid' | 'email' | 'role'>> = {
        fullName: teacherDataToUpdate.fullName,
        subjectsTaught: teacherDataToUpdate.subjectsTaught,
        contactNumber: teacherDataToUpdate.contactNumber,
        assignedClasses: selectedTeacherClasses,
    };

    try {
        const teacherDocRef = doc(db, "teachers", uid);
        await updateDoc(teacherDocRef, updatedTeacherPayload);

        const updatedTeachers = teachers.map(t =>
            t.uid === uid ? { ...t, ...updatedTeacherPayload, uid, email, role } as RegisteredTeacher : t
        );
        setTeachers(updatedTeachers);
        toast({ title: "Success", description: "Teacher details updated in Firestore." });
        handleTeacherDialogClose();
    } catch (error) {
        console.error("Error updating teacher in Firestore:", error);
        toast({ title: "Error", description: "Could not update teacher details.", variant: "destructive" });
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete || !studentToDelete.studentId) {
        toast({ title: "Error", description: "Student ID not found for deletion.", variant: "destructive" });
        return;
    }
    if (!currentUser) { 
        toast({ title: "Authentication Error", description: "Admin not authenticated.", variant: "destructive" });
        setStudentToDelete(null);
        return;
    }
    try {
        const studentDocRef = doc(db, "students", studentToDelete.studentId);
        await deleteDoc(studentDocRef);

        const updatedStudents = allStudents.filter(s => s.studentId !== studentToDelete!.studentId);
        setAllStudents(updatedStudents);
        toast({ title: "Success", description: `Student ${studentToDelete.fullName} deleted from Firestore.` });
        setStudentToDelete(null);
    } catch (error) {
        console.error("Error deleting student from Firestore:", error);
        toast({ title: "Error", description: "Could not delete student.", variant: "destructive" });
        setStudentToDelete(null);
    }
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete || !teacherToDelete.uid) {
        toast({ title: "Error", description: "Teacher UID not found for deletion.", variant: "destructive" });
        return;
    }
    if (!currentUser) { 
        toast({ title: "Authentication Error", description: "Admin not authenticated.", variant: "destructive" });
        setTeacherToDelete(null);
        return;
    }
    try {
        const teacherDocRef = doc(db, "teachers", teacherToDelete.uid);
        await deleteDoc(teacherDocRef);

        const updatedTeachers = teachers.filter(t => t.uid !== teacherToDelete!.uid);
        setTeachers(updatedTeachers);
        toast({ title: "Success", description: `Teacher ${teacherToDelete.fullName} deleted from Firestore.` });
        setTeacherToDelete(null);
    } catch (error) {
        console.error("Error deleting teacher from Firestore:", error);
        toast({ title: "Error", description: "Could not delete teacher.", variant: "destructive" });
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
              id="sTotalPaidOverride"
              type="number"
              placeholder="Leave blank for auto-sum"
              value={currentStudent.totalPaidOverride === null || currentStudent.totalPaidOverride === undefined ? "" : String(currentStudent.totalPaidOverride)}
              onChange={(e) => setCurrentStudent(prev => ({ ...prev, totalPaidOverride: e.target.value.trim() === "" ? null : parseFloat(e.target.value) }))}
              className="col-span-3"
              step="0.01"
            />
          </div>
           <p className="col-span-4 text-xs text-muted-foreground px-1 text-center sm:text-left sm:pl-[calc(25%+0.75rem)]">
            Note: Overriding total paid affects display & balance on this page only. It does not alter individual payment records. The override value is saved to Firestore.
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
          <DialogDescription>Email: {currentTeacher.email} (cannot be changed)</DialogDescription>
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
            <DDMTrigger asChild className="col-span-3">
              <Button variant="outline" className="justify-between w-full">
                {selectedTeacherClasses.length > 0 ? `${selectedTeacherClasses.length} class(es) selected` : "Select classes"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DDMTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
              <DropdownMenuLabel>Available Grade Levels</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {GRADE_LEVELS.map((grade) => (
                <DropdownMenuCheckboxItem
                  key={grade}
                  checked={selectedTeacherClasses.includes(grade)}
                  onCheckedChange={() => handleTeacherClassToggle(grade)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {grade}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleTeacherDialogClose}>Cancel</Button>
          <Button onClick={handleSaveTeacher}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  if (!authChecked) {
    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Checking authentication status...</p>
        </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <UserCog className="mr-3 h-8 w-8" /> User Management
        </h2>
      </div>

      {/* Students Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6" /> Registered Students</CardTitle>
          <CardDescription>View, edit, or delete student records from Firestore. Search by name, ID, or class, and sort the list. Financial details are indicative and currently based on local fee/payment data. Balances reflect any manual 'Total Paid' overrides.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search students (name, ID, class)..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="sortStudents" className="shrink-0">Sort by:</Label>
                <Select value={studentSortCriteria} onValueChange={setStudentSortCriteria}>
                <SelectTrigger id="sortStudents" className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select criteria" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fullName">Full Name</SelectItem>
                    <SelectItem value="studentId">Student ID</SelectItem>
                    <SelectItem value="gradeLevel">Grade Level</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading student data from Firestore...</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead className="text-right">Total Fees Due (GHS)</TableHead>
                    <TableHead className="text-right">Total Paid (GHS)</TableHead>
                    <TableHead className="text-right">Balance (GHS)</TableHead>
                    <TableHead>Guardian Contact</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStudents.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        {studentSearchTerm ? "No students match your search." : "No students registered or found in Firestore. Please register a student first."}
                    </TableCell></TableRow>
                  )}
                  {filteredAndSortedStudents.map((student) => {
                    const displayTotalPaid = student.totalPaidOverride !== undefined && student.totalPaidOverride !== null
                      ? student.totalPaidOverride
                      : (student.totalAmountPaid ?? 0);

                    const feesDue = student.totalFeesDue ?? 0;
                    const balance = feesDue - displayTotalPaid;

                    return (
                      <TableRow key={student.studentId}><TableCell className="font-mono">{student.studentId}</TableCell><TableCell>{student.fullName}</TableCell><TableCell>{student.gradeLevel}</TableCell><TableCell className="text-right">{feesDue.toFixed(2)}</TableCell><TableCell className="text-right">
                          {displayTotalPaid.toFixed(2)}
                          {student.totalPaidOverride !== undefined && student.totalPaidOverride !== null && <span className="text-xs text-blue-500 ml-1">(Overridden)</span>}
                        </TableCell><TableCell className={`text-right font-medium ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {balance.toFixed(2)}
                        </TableCell><TableCell>{student.guardianContact}</TableCell><TableCell className="text-center space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete student {studentToDelete?.fullName}? This action cannot be undone and will remove the record from Firestore.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell></TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            )}
        </CardContent>
      </Card>

      {/* Teachers Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6" /> Registered Teachers</CardTitle>
          <CardDescription>View, edit, or delete teacher records from Firestore. Search by name, email, or subject, and sort the list.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search teachers (name, email, subject)..."
                    value={teacherSearchTerm}
                    onChange={(e) => setTeacherSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="sortTeachers" className="shrink-0">Sort by:</Label>
                <Select value={teacherSortCriteria} onValueChange={setTeacherSortCriteria}>
                <SelectTrigger id="sortTeachers" className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select criteria" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fullName">Full Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          {isLoading ? ( 
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading teacher data from Firestore...</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subjects Taught</TableHead>
                    <TableHead>Assigned Classes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      {teacherSearchTerm ? "No teachers match your search." : "No teachers registered or found in Firestore."}
                    </TableCell></TableRow>
                  )}
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.uid}><TableCell>{teacher.fullName}</TableCell><TableCell>{teacher.email}</TableCell><TableCell>{teacher.contactNumber}</TableCell><TableCell className="max-w-xs truncate">{teacher.subjectsTaught}</TableCell><TableCell>{teacher.assignedClasses && Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0 ? teacher.assignedClasses.join(", ") : "Not Assigned"}</TableCell><TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setTeacherToDelete(teacher)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete teacher {teacherToDelete?.fullName}? This action cannot be undone and will remove the record from Firestore.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={confirmDeleteTeacher} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
        </CardContent>
      </Card>

      {renderStudentEditDialog()}
      {renderTeacherEditDialog()}
    </div>
  );
}
    
