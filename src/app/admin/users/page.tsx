
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit, Trash2, ChevronDown, UserCog, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, REGISTERED_STUDENTS_KEY, REGISTERED_TEACHERS_KEY } from "@/lib/constants";

// Interfaces based on registration forms
interface StudentData {
  fullName: string;
  dateOfBirth: string;
  gradeLevel: string;
  guardianName: string;
  guardianContact: string;
}
interface RegisteredStudent extends StudentData {
  studentId: string;
}

interface TeacherData {
  fullName: string;
  email: string;
  subjectsTaught: string;
  contactNumber: string;
  assignedClasses: string[];
}
interface RegisteredTeacher extends TeacherData {}

export default function AdminUsersPage() {
  const { toast } = useToast();

  const [allStudents, setAllStudents] = useState<RegisteredStudent[]>([]);
  const [teachers, setTeachers] = useState<RegisteredTeacher[]>([]);

  const [filteredAndSortedStudents, setFilteredAndSortedStudents] = useState<RegisteredStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortCriteria, setSortCriteria] = useState<string>("fullName");


  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<RegisteredStudent> | null>(null);
  
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<RegisteredTeacher> | null>(null);
  const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<string[]>([]);

  const [studentToDelete, setStudentToDelete] = useState<RegisteredStudent | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<RegisteredTeacher | null>(null);

  useEffect(() => {
    const loadUsers = () => {
      if (typeof window !== 'undefined') {
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        setAllStudents(studentsRaw ? JSON.parse(studentsRaw) : []);
        const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
        setTeachers(teachersRaw ? JSON.parse(teachersRaw) : []);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    let tempStudents = [...allStudents];

    // Filtering
    if (searchTerm) {
      tempStudents = tempStudents.filter(student =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    if (sortCriteria === "fullName") {
      tempStudents.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (sortCriteria === "studentId") {
      tempStudents.sort((a, b) => a.studentId.localeCompare(b.studentId));
    } else if (sortCriteria === "gradeLevel") {
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
        return a.fullName.localeCompare(b.fullName); // Secondary sort by name
      });
    }
    setFilteredAndSortedStudents(tempStudents);
  }, [allStudents, searchTerm, sortCriteria]);

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
  
  const handleSaveStudent = () => {
    if (!currentStudent || !currentStudent.studentId) return;
    const updatedStudents = allStudents.map(s => 
      s.studentId === currentStudent.studentId ? { ...s, ...currentStudent } as RegisteredStudent : s
    );
    setAllStudents(updatedStudents);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(updatedStudents));
    }
    toast({ title: "Success", description: "Student details updated." });
    handleStudentDialogClose();
  };

  const handleSaveTeacher = () => {
    if (!currentTeacher || !currentTeacher.email) return;
    const updatedTeacherData = { ...currentTeacher, assignedClasses: selectedTeacherClasses } as RegisteredTeacher;
    const updatedTeachers = teachers.map(t =>
      t.email === currentTeacher.email ? updatedTeacherData : t
    );
    setTeachers(updatedTeachers);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(updatedTeachers));
    }
    toast({ title: "Success", description: "Teacher details updated." });
    handleTeacherDialogClose();
  };

  const confirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const updatedStudents = allStudents.filter(s => s.studentId !== studentToDelete.studentId);
    setAllStudents(updatedStudents);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(updatedStudents));
    }
    toast({ title: "Success", description: `Student ${studentToDelete.fullName} deleted.` });
    setStudentToDelete(null);
  };

  const confirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    const updatedTeachers = teachers.filter(t => t.email !== teacherToDelete.email);
    setTeachers(updatedTeachers);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTERED_TEACHERS_KEY, JSON.stringify(updatedTeachers));
    }
    toast({ title: "Success", description: `Teacher ${teacherToDelete.fullName} deleted.` });
    setTeacherToDelete(null);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="col-span-3">
                <Button variant="outline" className="justify-between w-full">
                  {selectedTeacherClasses.length > 0 ? `${selectedTeacherClasses.length} class(es) selected` : "Select classes"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
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
          <CardDescription>View, edit, or delete student records. You can search by name, ID, or class, and sort the list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search students (name, ID, class)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="sortStudents" className="shrink-0">Sort by:</Label>
                <Select value={sortCriteria} onValueChange={setSortCriteria}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Guardian Contact</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedStudents.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    {searchTerm ? "No students match your search." : "No students registered."}
                </TableCell></TableRow>
              )}
              {filteredAndSortedStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-mono">{student.studentId}</TableCell>
                  <TableCell>{student.fullName}</TableCell>
                  <TableCell>{student.gradeLevel}</TableCell>
                  <TableCell>{student.guardianContact}</TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditStudentDialog(student)}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete student {studentToDelete?.fullName}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Teachers Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6" /> Registered Teachers</CardTitle>
          <CardDescription>View, edit, or delete teacher records.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned Classes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">No teachers registered.</TableCell></TableRow>
              )}
              {teachers.map((teacher) => (
                <TableRow key={teacher.email}>
                  <TableCell>{teacher.fullName}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.contactNumber}</TableCell>
                  <TableCell>{teacher.assignedClasses && Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0 ? teacher.assignedClasses.join(", ") : "Not Assigned"}</TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditTeacherDialog(teacher)}><Edit className="h-4 w-4" /></Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setTeacherToDelete(teacher)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete teacher {teacherToDelete?.fullName}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDeleteTeacher} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {renderStudentEditDialog()}
      {renderTeacherEditDialog()}
    </div>
  );
}
