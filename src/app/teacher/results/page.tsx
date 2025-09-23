
"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ClipboardCheck, PlusCircle, Edit, Trash2, Loader2, AlertCircle, BookMarked, MinusCircle, Users, Save, CalendarIcon, Send, CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, type FieldValues } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GRADE_LEVELS, SUBJECTS, ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface TeacherProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  assigned_classes: string[];
  school_id?: number | null;
}

interface StudentForSelection {
  student_id_display: string;
  full_name: string;
  auth_user_id?: string | null;
  grade_level: string;
}

const subjectResultSchema = z.object({
  subjectName: z.string().min(1, "Subject name is required."),
  classScore: z.string().optional(),
  examScore: z.string().optional(),
  grade: z.string().min(1, "Grade is required (e.g., A, B+, Pass)."),
  remarks: z.string().optional(),
});

interface SubjectResultDisplay {
  subjectName: string;
  classScore?: string;
  examScore?: string;
  totalScore?: string;
  grade: string;
  remarks?: string;
}

const academicResultSchema = z.object({
  classId: z.string().min(1, "Class selection is required."),
  studentId: z.string().min(1, "Student selection is required."),
  term: z.string().min(1, "Term/Semester is required (e.g., Term 1, Semester 2)."),
  year: z.string().regex(/^\d{4}-\d{4}$/, "Year must be in YYYY-YYYY format (e.g., 2023-2024)."),
  subjectResults: z.array(subjectResultSchema).min(1, "At least one subject result must be added."),
  overallAverage: z.string().optional(),
  overallGrade: z.string().optional(),
  overallRemarks: z.string().optional(),
  requestedPublishedAt: z.date().optional(),
});

type AcademicResultFormData = z.infer<typeof academicResultSchema>;

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
}

interface AcademicResultEntryFromSupabase {
  auth_user_id: any;
  submitted_by: string;
  id: string;
  teacher_id: string;
  teacher_name: string;
  student_id_display: string;
  student_name: string;
  class_id: string;
  term: string;
  year: string;
  subject_results: SubjectResultDisplay[];
  overall_average?: string | null;
  overall_grade?: string | null;
  overall_remarks?: string | null;
  published_at?: string | null;
  requested_published_at?: string | null;
  approval_status: typeof ACADEMIC_RESULT_APPROVAL_STATUSES[keyof typeof ACADEMIC_RESULT_APPROVAL_STATUSES];
  admin_remarks?: string | null;
  attendance_summary?: AttendanceSummary | null;
  created_at: string;
  updated_at: string;
}

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

export default function TeacherManageResultsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const auth = useAuth();

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);

  const [studentsInClass, setStudentsInClass] = useState<StudentForSelection[]>([]);
  const [existingResults, setExistingResults] = useState<AcademicResultEntryFromSupabase[]>([]);
  const [groupedResults, setGroupedResults] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentResultToEdit, setCurrentResultToEdit] = useState<AcademicResultEntryFromSupabase | null>(null);
  const [resultToView, setResultToView] = useState<AcademicResultEntryFromSupabase | null>(null);
  const [isViewResultDialogOpen, setIsViewResultDialogOpen] = useState(false);


  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<AcademicResultEntryFromSupabase | null>(null);

  const formHook = useForm<AcademicResultFormData>({
    resolver: zodResolver(academicResultSchema),
    defaultValues: {
      classId: "",
      studentId: "",
      term: "",
      year: currentAcademicYear,
      subjectResults: [{ subjectName: "", classScore: "", examScore: "", grade: "", remarks: "" }],
      overallAverage: "",
      overallGrade: "",
      overallRemarks: "",
      requestedPublishedAt: new Date(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: formHook.control,
    name: "subjectResults",
  });

  const watchClassId = formHook.watch("classId");
  const watchStudentId = formHook.watch("studentId");
  const watchTerm = formHook.watch("term");
  const watchYear = formHook.watch("year");
  const watchedSubjectScores = formHook.watch("subjectResults");

  // Helper to safely format dates (returns fallback when invalid)
  const safeFormatDate = (value: unknown, fmt: string, fallback = "") => {
    try {
      if (!value) return fallback;
      const d = value instanceof Date ? value : new Date(String(value));
      if (isNaN(d.getTime())) return fallback;
      return format(d, fmt);
    } catch (e) {
      return fallback;
    }
  };

  useEffect(() => {
  isMounted.current = true;
  supabaseRef.current = createClient();

    async function fetchTeacherData() {
      if (!supabaseRef.current) {
        if (isMounted.current) setError("Supabase client not initialized.");
        setIsLoading(false);
        return;
      }

      if (auth.isLoading) {
        setIsLoading(true);
        return;
      }

      if (!auth.user) {
        if (isMounted.current) {
          setError("Not authenticated. Please login.");
          // Layout will render login UI; avoid router.push here
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabaseRef.current
          .from('teachers')
          .select('id, auth_user_id, full_name, email, assigned_classes, school_id')
          .eq('auth_user_id', auth.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Supabase returned an error fetching teacher profile', profileError);
          throw profileError;
        }

        if (isMounted.current) {
          // map DB `name` to UI `full_name`
          const mapped = { ...(profileData as any), full_name: (profileData as any)?.name };
          setTeacherProfile(mapped as TeacherProfile);
        } else {
          setError("Teacher profile not found for the logged-in user.");
        }
      } catch (e: any) {
        let serialized = "";
        try { serialized = JSON.stringify(e, Object.getOwnPropertyNames(e), 2); } catch { serialized = String(e); }
        console.error("Error fetching teacher profile from Supabase:", e, "-- serialized:", serialized);
        if (isMounted.current) {
          const msg = (e && typeof e === 'object' && Object.keys(e).length === 0)
            ? "Permission denied or database row-level security prevented the query. Check Supabase RLS/policies and that your teacher record exists."
            : (e?.message || 'Unknown error');
          setError(`Failed to load teacher data from Supabase: ${msg}`);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchTeacherData();

    return () => { isMounted.current = false; };
  }, [router, auth.isLoading, auth.user]);

  useEffect(() => {
    const fetchStudentsForClass = async () => {
      if (watchClassId && isMounted.current && supabaseRef.current) {
        setIsFetchingStudents(true);
        setStudentsInClass([]);
        formHook.setValue("studentId", "");
        try {
          console.debug("[TeacherResultsPage] fetchStudentsForClass starting", { watchClassId, authUser: auth.user ? { id: auth.user.id, email: (auth.user as any).email } : null, supabasePresent: !!supabaseRef.current });
          const { data, error: studentFetchError } = await supabaseRef.current
            .from('students')
            // request both full_name and name where available; prefer full_name in the UI
            .select('student_id_display, full_name, name, grade_level, auth_user_id')
            .eq('grade_level', watchClassId)
            // order by full_name when available, else fall back to name
            .order('full_name', { ascending: true });

          if (studentFetchError) {
            console.error("[TeacherResultsPage] studentFetchError", studentFetchError);
            throw studentFetchError;
          }
          const mapped = (data as any[] || []).map(s => ({
            ...s,
            // prefer DB full_name, then name, else fallback to student_id_display
            full_name: s.full_name || s.name || s.student_id_display || "",
            auth_user_id: (s as any).auth_user_id || null,
          }));
          // Debug: show fetched/mapped students for the selected class to verify full_name exists
          console.debug("[TeacherResultsPage] fetched students for class", watchClassId, { raw: data, mapped });
          if (isMounted.current) setStudentsInClass(mapped as StudentForSelection[] || []);

        } catch (e:any) {
          console.error("[TeacherResultsPage] error fetching students", e);
          toast({title: "Error", description: `Failed to fetch students for ${watchClassId} from Supabase: ${e?.message || String(e)}`, variant: "destructive"});
        } finally {
          if (isMounted.current) setIsFetchingStudents(false);
        }
      }
    };
    fetchStudentsForClass();
  }, [watchClassId, formHook, toast]);

  useEffect(() => {
    const fetchExistingData = async () => {
      if (!teacherProfile || !isMounted.current || !supabaseRef.current) {
        if (isMounted.current) {
          setExistingResults([]);
          setGroupedResults([]);
        }
        return;
      }

      setIsFetchingResults(true);
      try {
        let query = supabaseRef.current.from('student_results').select('*').eq('teacher_id', teacherProfile.id);

        if (watchStudentId) query = query.eq('student_id_display', watchStudentId);
        if (watchTerm) query = query.eq('term', watchTerm as any);
        if (watchYear) query = query.eq('year', watchYear as any);

        // limit to recent 1000 rows to avoid huge responses
        const { data: resultsData, error: resultsFetchError } = await query.order('created_at', { ascending: false }).limit(1000);
        if (resultsFetchError) throw resultsFetchError;

        const rows = resultsData as any[] || [];
        if (isMounted.current) setExistingResults(rows as AcademicResultEntryFromSupabase[]);

        // With the new grouped approach, each row represents a complete student result
        // With the new grouped approach, each row represents a complete student result
        // Convert each row to the format expected by the UI
        const grouped = rows.map(row => ({
          id: row.id,
          // Include the row id for delete operations
          rowIds: [row.id],
          student_id_display: row.student_id_display,
          student_name: row.student_name || row.student_id_display,
          class_id: row.class_id,
          term: row.term || null,
          year: row.year || null,
          approval_status: row.approval_status || null,
          requested_published_at: row.published_at || null,
          updated_at: row.updated_at || '',
          average_score: row.average_score || 0,
          total_subjects: row.total_subjects || 0,
          // Convert JSON subjects data to the format expected by the UI
          subject_results: (row.subjects_data || []).map((subject: any) => ({
            subjectName: subject.subject || 'N/A',
            classScore: String(subject.class_score || ''),
            examScore: String(subject.exam_score || ''),
            totalScore: String(subject.total_score || ''),
            grade: subject.grade || '',
            remarks: subject.remarks || '',
          }))
        }));

        if (isMounted.current) setGroupedResults(grouped);

      } catch (e:any) {
        toast({title: "Error", description: `Failed to fetch existing data: ${e?.message || String(e)}`, variant: "destructive"});
        if (isMounted.current) {
          setExistingResults([]);
          setGroupedResults([]);
        }
      } finally {
        if (isMounted.current) setIsFetchingResults(false);
      }
    };
    fetchExistingData();
  }, [watchStudentId, watchTerm, watchYear, teacherProfile, toast]);


  useEffect(() => {
    if (watchedSubjectScores && Array.isArray(watchedSubjectScores)) {
      let overallTotalScore = 0;
      let validSubjectsCount = 0;
      
      watchedSubjectScores.forEach((subject) => {
        const classScore = parseFloat(subject.classScore || "");
        const examScore = parseFloat(subject.examScore || "");
        
        if (!isNaN(classScore) || !isNaN(examScore)) {
          const totalSubjectScore = (isNaN(classScore) ? 0 : classScore) + (isNaN(examScore) ? 0 : examScore);
          if (totalSubjectScore > 0) {
            overallTotalScore += totalSubjectScore;
            validSubjectsCount++;
          }
        }
      });

      if (validSubjectsCount > 0) {
        const average = overallTotalScore / validSubjectsCount;
        formHook.setValue("overallAverage", average.toFixed(1));
      } else {
        formHook.setValue("overallAverage", "");
      }
    }
  }, [watchedSubjectScores, formHook]);


  const handleOpenFormDialog = (result?: any) => {
    if (result) {
      // result may be a grouped entry (subject_results array) or single-row entry
      setCurrentResultToEdit(result);
      // normalize subject_results for various DB shapes:
      // - legacy: subject_results is an array of objects
      // - prior single-row schema: row has `subject` and `score` fields
      // - possible JSON string
      let subjectResultsForForm: any[] = [];
      try {
        // If grouped entry: subject_results already an array
        if (Array.isArray((result as any).subject_results)) {
          subjectResultsForForm = (result as any).subject_results.map((sr: any) => ({
            subjectName: sr.subjectName || sr.subject || "",
            classScore: sr.classScore || "",
            examScore: sr.examScore || "",
            grade: sr.grade || "",
            remarks: sr.remarks || "",
          }));
        } else if ((result as any).subject && ((result as any).score !== undefined)) {
          subjectResultsForForm = [{
            subjectName: (result as any).subject,
            classScore: "",
            examScore: "",
            grade: "",
            remarks: "",
          }];
        } else if (typeof (result as any).subject_results === 'string') {
          const parsed = JSON.parse((result as any).subject_results);
          if (Array.isArray(parsed)) {
            subjectResultsForForm = parsed.map((sr: any) => ({
              subjectName: sr.subjectName || sr.subject || "",
              classScore: sr.classScore || "",
              examScore: sr.examScore || "",
              grade: sr.grade || "",
              remarks: sr.remarks || "",
            }));
          }
        }
      } catch (err) {
        console.error("Failed to normalize subject_results for editing", err, result);
      }

      if (subjectResultsForForm.length === 0) {
        subjectResultsForForm = [{ subjectName: "", classScore: "", examScore: "", grade: "", remarks: "" }];
      }

      formHook.reset({
        classId: (result as any).class_id || formHook.getValues("classId") || "",
        studentId: (result as any).student_id_display || formHook.getValues("studentId") || "",
        term: (result as any).term || formHook.getValues("term") || "",
        year: (result as any).year || formHook.getValues("year") || currentAcademicYear,
        subjectResults: subjectResultsForForm,
        overallAverage: (result as any).overall_average || "",
        overallGrade: (result as any).overall_grade || "",
        overallRemarks: (result as any).overall_remarks || "",
        requestedPublishedAt: (result as any).requested_published_at ? new Date((result as any).requested_published_at) : ((result as any).published_at ? new Date((result as any).published_at) : new Date()),
      });
    } else {
      setCurrentResultToEdit(null);
      formHook.reset({
        classId: formHook.getValues("classId") || "",
        studentId: formHook.getValues("studentId") || "",
        term: formHook.getValues("term") || "",
        year: formHook.getValues("year") || currentAcademicYear,
        subjectResults: [{ subjectName: "", classScore: "", examScore: "", grade: "", remarks: "" }],
        overallAverage: "",
        overallGrade: "",
        overallRemarks: "",
        requestedPublishedAt: new Date(),
      });
    }
    setIsFormDialogOpen(true);
  };

  const handleOpenViewResultDialog = (result: AcademicResultEntryFromSupabase) => {
    setResultToView(result);
    setIsViewResultDialogOpen(true);
  };

  const onFormSubmit = async (data: AcademicResultFormData) => {
    if (!teacherProfile || !supabaseRef.current) {
      toast({ title: "Error", description: "Authentication, profile error, or Supabase client not available.", variant: "destructive" });
      return;
    }
  // find the selected student and prefer the canonical student_id_display from DB
  const student = studentsInClass.find(s => s.student_id_display === data.studentId);
    if (!student) {
      toast({ title: "Error", description: "Selected student not found.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    let attendanceSummary: AttendanceSummary | null = null;
    try {
        const year = data.year;
        let academicYearStartDate = "";
        let academicYearEndDate = "";
        if (year && /^\d{4}-\d{4}$/.test(year)) {
            const startYear = year.substring(0, 4);
            const endYear = year.substring(5, 9);
            academicYearStartDate = `${startYear}-08-01`;
            academicYearEndDate = `${endYear}-07-31`;
        }

        let attendanceQuery = supabaseRef.current
            .from('attendance_records')
            .select('status')
            .eq('student_id_display', data.studentId);
            
        if (academicYearStartDate && academicYearEndDate) {
            attendanceQuery = attendanceQuery
              .gte('date', academicYearStartDate)
              .lte('date', academicYearEndDate);
        }

        const { data: attendanceData, error: attendanceError } = await attendanceQuery;
        if (attendanceError) {
            toast({ title: "Warning", description: `Could not fetch attendance data: ${attendanceError.message}. Result will be saved without it.`, variant: "default" });
        } else {
            let present = 0, absent = 0, late = 0;
            (attendanceData || []).forEach(record => {
                if (record.status === 'present') present++;
                else if (record.status === 'absent') absent++;
                else if (record.status === 'late') late++;
            });
            attendanceSummary = { present, absent, late };
        }
    } catch (e: any) {
        toast({ title: "Warning", description: `An error occurred while fetching attendance data: ${e.message}. Result will be saved without it.`, variant: "default" });
    }
    
    const processedSubjectResults = data.subjectResults.map(sr => {
      const classScore = parseFloat(sr.classScore || "");
      const examScore = parseFloat(sr.examScore || "");
      const totalScore = (isNaN(classScore) ? 0 : classScore) + (isNaN(examScore) ? 0 : examScore);
      return {
        subjectName: sr.subjectName,
        classScore: sr.classScore || "",
        examScore: sr.examScore || "",
        totalScore: totalScore.toFixed(1),
        grade: sr.grade,
        remarks: sr.remarks || "",
      };
    });

    const payload = {
      teacher_id: teacherProfile.id,
      teacher_name: teacherProfile.full_name,
  school_id: teacherProfile?.school_id ?? null,
      // use canonical student_id_display from the students table (avoid case/format mismatches)
      student_id_display: student.student_id_display,
      student_name: student.full_name,
      // include the student's auth_user_id so RLS policies that check auth_user_id can work
      auth_user_id: (student as any).auth_user_id || null,
      class_id: data.classId,
      term: data.term,
      year: data.year,
      subject_results: processedSubjectResults,
      overall_average: data.overallAverage || null,
      overall_grade: data.overallGrade || null,
      overall_remarks: data.overallRemarks || null,
  requested_published_at: data.requestedPublishedAt ? safeFormatDate(data.requestedPublishedAt, "yyyy-MM-dd HH:mm:ss", "") : null,
      approval_status: ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING,
      admin_remarks: currentResultToEdit?.approval_status === ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED ? "Resubmitted by teacher." : null,
      published_at: null,
      attendance_summary: attendanceSummary,
    };
    
    console.log("[TeacherResultsPage] Submitting result with payload containing approval_status:", payload.approval_status, "Full payload:", JSON.stringify(payload, null, 2));

    try {
      // New approach: Group all subjects for a student into a single record in student_results table
      // This makes approval and management much easier as each student has one record instead of multiple
      
      // Prepare subjects data as JSON array
      const subjectsData = processedSubjectResults.map(sr => ({
        subject: sr.subjectName,
        class_score: parseFloat(sr.classScore || "0") || 0,
        exam_score: parseFloat(sr.examScore || "0") || 0,
        total_score: parseFloat(sr.totalScore || "0") || 0,
        grade: sr.grade || null,
        remarks: sr.remarks || null
      }));
      
      // Calculate average score for this student
      const totalScore = subjectsData.reduce((sum, subject) => sum + subject.total_score, 0);
      const averageScore = subjectsData.length > 0 ? totalScore / subjectsData.length : 0;
      
      const studentResultRecord = {
        school_id: teacherProfile?.school_id ?? null,
        student_id_display: student.student_id_display,
        auth_user_id: (student as any).auth_user_id || null,
        class_id: data.classId,
        teacher_id: teacherProfile.id,
        term: data.term || null,
        year: data.year || null,
        student_name: student.full_name || null,
        teacher_name: teacherProfile.full_name || null,
        submitted_by: teacherProfile.full_name || null,
        subjects_data: subjectsData,
        total_subjects: subjectsData.length,
        average_score: averageScore,
        approval_status: ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (currentResultToEdit) {
        // Update existing student result record
        const { data: updatedData, error: updateError } = await supabaseRef.current
          .from('student_results')
          .update({
            subjects_data: subjectsData,
            total_subjects: subjectsData.length,
            average_score: averageScore,
            approval_status: ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING,
            updated_at: new Date().toISOString(),
            term: data.term || currentResultToEdit.term || null,
            year: data.year || currentResultToEdit.year || null,
            student_name: student.full_name || currentResultToEdit.student_name || null,
            teacher_name: teacherProfile.full_name || currentResultToEdit.teacher_name || null,
            submitted_by: teacherProfile.full_name || currentResultToEdit.submitted_by || null,
            auth_user_id: (student as any).auth_user_id || currentResultToEdit?.auth_user_id || null
          })
          .eq('id', currentResultToEdit.id)
          .eq('teacher_id', teacherProfile.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        toast({ title: "Success", description: "Student results updated and re-submitted for approval." });
      } else {
        // Insert new student result record
        const { data: insertedData, error: insertError } = await supabaseRef.current
          .from('student_results')
          .insert([studentResultRecord])
          .select();
        
        if (insertError) throw insertError;
        toast({ title: "Success", description: "Student results saved and submitted for approval." });
      }

      if (teacherProfile && supabaseRef.current) {
        setIsFetchingResults(true);
        const q = supabaseRef.current.from('student_results').select('*').eq('teacher_id', teacherProfile.id);
        if (watchStudentId) q.eq('student_id_display', watchStudentId);
        if (watchTerm) q.eq('term', watchTerm as any);
        if (watchYear) q.eq('year', watchYear as any);
        const { data: refreshedData, error: refreshError } = await q.order('created_at', { ascending: false }).limit(1000);
        if (refreshError) throw refreshError;
        const rows = refreshedData as any[] || [];
        if(isMounted.current) setExistingResults(rows as AcademicResultEntryFromSupabase[] || []);

        // With the new grouped approach, each row represents a complete student result
        // Convert each row to the format expected by the UI
        const grouped = rows.map(row => ({
          id: row.id,
          // Include the row id for delete operations
          rowIds: [row.id],
          student_id_display: row.student_id_display,
          student_name: row.student_name || row.student_id_display,
          class_id: row.class_id,
          term: row.term || null,
          year: row.year || null,
          approval_status: row.approval_status || null,
          requested_published_at: row.published_at || null,
          updated_at: row.updated_at || '',
          average_score: row.average_score || 0,
          total_subjects: row.total_subjects || 0,
          // Convert JSON subjects data to the format expected by the UI
          subject_results: (row.subjects_data || []).map((subject: any) => ({
            subjectName: subject.subject || 'N/A',
            classScore: String(subject.class_score || ''),
            examScore: String(subject.exam_score || ''),
            totalScore: String(subject.total_score || ''),
            grade: subject.grade || '',
            remarks: subject.remarks || '',
          }))
        }));

        if(isMounted.current) setGroupedResults(grouped);
        if(isMounted.current) setIsFetchingResults(false);
      }
      setIsFormDialogOpen(false);

    } catch (e: any) {
      console.error("Error saving academic result to Supabase:", JSON.stringify(e, null, 2));

      let userMessage = "An unknown error occurred while saving the result.";

      if (e?.code === '42501') { 
          userMessage = "Permission Denied: Your security policy (RLS) is preventing this action. Please check your policies for the 'student_results' table.";
      } else if (e?.message) {
          userMessage = `Failed to save result: ${e.message}`;
      } else if (JSON.stringify(e) === '{}') {
          userMessage = "An empty error was received. This often indicates a Row Level Security (RLS) policy violation. Please check your Supabase policies for the 'student_results' table to ensure teachers can insert/update their own records.";
      }
      
      toast({
        title: "Database Error",
        description: userMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleOpenDeleteDialog = (result: AcademicResultEntryFromSupabase) => {
    setResultToDelete(result);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteResult = async () => {
    if (!resultToDelete || !teacherProfile || !supabaseRef.current) return;
    setIsSubmitting(true);
    try {
      // Prefer deleting by explicit row IDs (safer). Fallback to teacher/student/class/term/year when not present.
      let deleteError = null;
      if (Array.isArray((resultToDelete as any).rowIds) && (resultToDelete as any).rowIds.length > 0) {
        const ids = (resultToDelete as any).rowIds;
        const { error } = await supabaseRef.current.from('student_results').delete().in('id', ids);
        deleteError = error;
      } else {
        const delQuery = supabaseRef.current.from('student_results').delete().eq('teacher_id', teacherProfile.id).eq('student_id_display', resultToDelete.student_id_display);
        if (resultToDelete.class_id) delQuery.eq('class_id', resultToDelete.class_id);
        if (resultToDelete.term) delQuery.eq('term', resultToDelete.term);
        if (resultToDelete.year) delQuery.eq('year', resultToDelete.year);
        const { error } = await delQuery;
        deleteError = error;
      }
      if (deleteError) throw deleteError;

      toast({ title: "Success", description: "Student result(s) deleted from Supabase." });
      // refresh local state
      setGroupedResults(prev => prev.filter(g => g.id !== resultToDelete!.id));
      setExistingResults(prev => prev.filter(r => !(r.student_id_display === resultToDelete.student_id_display && r.class_id === resultToDelete.class_id && r.term === resultToDelete.term && r.year === resultToDelete.year)));
      setIsDeleteDialogOpen(false);
      setResultToDelete(null);
    } catch (e: any) {
      toast({ title: "Database Error", description: `Failed to delete result(s) from Supabase: ${e.message}`, variant: "destructive" });
    } finally {
      if(isMounted.current) setIsSubmitting(false);
    }
  };

  const getStatusIndicator = (status: string | null | undefined) => {
    switch (status) {
      case ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING:
        return <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Pending Approval</span>;
      case ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED:
        return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center"><CheckCircle className="h-3 w-3 mr-1"/>Approved</span>;
      case ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED:
        return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center"><XCircle className="h-3 w-3 mr-1"/>Rejected</span>;
      default:
        return <span className="text-xs text-gray-500">Unknown Status</span>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading page...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Not authenticated") && <Button asChild className="mt-2"><Link href="/auth/teacher/login">Login</Link></Button>}</CardContent></Card>;
  }
  if (!teacherProfile) {
    return <p className="text-muted-foreground">Teacher profile not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <ClipboardCheck className="mr-3 h-8 w-8" /> Manage Student Results
          </h2>
          <CardDescription className="mt-1">
            Select class, student, term, and year to view, add, or manage academic results.
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenFormDialog()} disabled={!watchClassId || !watchStudentId || !watchTerm || !watchYear} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Result Entry
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader><CardTitle className="text-lg">Selection Filters</CardTitle></CardHeader>
        <Form {...formHook}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField control={formHook.control} name="classId" render={({ field }) => (
                <FormItem><FormLabel>Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                    <SelectContent>{
                      // If teacher has assigned classes, show them; otherwise fall back to all grade levels
                      ((teacherProfile.assigned_classes && teacherProfile.assigned_classes.length > 0) ? teacherProfile.assigned_classes : GRADE_LEVELS)
                        .map((cls: string) => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)
                    }</SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />
            <FormField control={formHook.control} name="studentId" render={({ field }) => (
              <FormItem><FormLabel>Student</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!watchClassId || isFetchingStudents}>
                  <FormControl><SelectTrigger><SelectValue placeholder={isFetchingStudents ? "Loading..." : "Select Student"} /></SelectTrigger></FormControl>
                  <SelectContent>{studentsInClass.map(s => <SelectItem key={s.student_id_display} value={s.student_id_display}>{s.full_name || s.student_id_display}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>)} />
            <FormField control={formHook.control} name="term" render={({ field }) => (
              <FormItem><FormLabel>Term/Semester</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger></FormControl>
                  <SelectContent>
                      {["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2", "Annual"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>)} />
            <FormField control={formHook.control} name="year" render={({ field }) => (
              <FormItem><FormLabel>Academic Year</FormLabel>
                <FormControl><Input placeholder="e.g., 2023-2024" {...field} /></FormControl><FormMessage />
              </FormItem>)} />
          </CardContent>
        </Form>
      </Card>

      {/* Debug card to help diagnose missing students in the dropdown */}
      <Card className="mt-4 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Debug — Students fetch</CardTitle>
          <CardDescription className="text-xs">Visible diagnostics to help determine why students are not listed in the Student select.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p><strong>Auth user:</strong> {auth.user ? (auth.user.id + ( (auth.user as any).email ? ` — ${(auth.user as any).email}` : '' )) : 'null (not authenticated)'} </p>
            <p><strong>Supabase client:</strong> {supabaseRef.current ? 'present' : 'missing'}</p>
            <p><strong>Selected class (watch):</strong> {watchClassId || 'none'}</p>
            <p><strong>Students in class (count):</strong> {studentsInClass.length}</p>
            {studentsInClass.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto text-xs bg-muted/10 p-2 rounded">
                <pre className="whitespace-pre-wrap">{JSON.stringify(studentsInClass, null, 2)}</pre>
              </div>
            )}
            {isFetchingStudents && <p className="text-xs text-muted-foreground">Fetching students...</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookMarked className="mr-2 h-6 w-6" /> Existing Result Entries
            {watchStudentId && studentsInClass.find(s=>s.student_id_display === watchStudentId) && ` for ${studentsInClass.find(s=>s.student_id_display === watchStudentId)?.full_name}`}
            {watchTerm && ` - ${watchTerm}`} {watchYear && ` (${watchYear})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isFetchingResults && <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span>Loading results from Supabase...</span></div>}
          {!isFetchingResults && groupedResults.length === 0 && <p className="text-muted-foreground text-center py-6">No results found in Supabase for the current selection. You can add a new entry.</p>}
          {!isFetchingResults && groupedResults.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Term - Year</TableHead>
                    <TableHead>Overall Grade</TableHead>
                    <TableHead>Approval Status</TableHead>
                    <TableHead>Requested Publish</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedResults.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.student_name}</TableCell>
                      <TableCell>{group.term || '-'} - {group.year || '-'}</TableCell>
                      <TableCell>{group.subject_results && group.subject_results.length > 0 ? group.subject_results.map((s:any)=>s.grade).filter(Boolean).join(', ') : 'N/A'}</TableCell>
                      <TableCell>
                        {getStatusIndicator(group.approval_status)}
                      </TableCell>
                      <TableCell>{group.requested_published_at ? safeFormatDate(group.requested_published_at, "PPP", "Immediate") : "Immediate"}</TableCell>
                      <TableCell>{safeFormatDate(group.updated_at, "PPP, h:mm a", "-")}</TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="outline" size="icon" onClick={() => handleOpenViewResultDialog(group)} className="h-7 w-7"><Eye className="h-4 w-4"/></Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenFormDialog(group)} className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteDialog(group)} className="h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{currentResultToEdit ? "Edit" : "Add New"} Academic Result Entry</DialogTitle>
            <DialogDescription>
              For Student: {studentsInClass.find(s => s.student_id_display === formHook.getValues("studentId"))?.full_name || "N/A"} |
              Class: {formHook.getValues("classId")} | Term: {formHook.getValues("term")} | Year: {formHook.getValues("year")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4">
            <Form {...formHook}>
                <form onSubmit={formHook.handleSubmit(onFormSubmit)} className="space-y-4 py-2">
                <input type="hidden" {...formHook.register("classId")} />
                <input type="hidden" {...formHook.register("studentId")} />
                <input type="hidden" {...formHook.register("term")} />
                <input type="hidden" {...formHook.register("year")} />
                
                <hr className="my-3"/>
                
                <div>
                    <Label className="text-md font-medium mb-2 block">Subject Results</Label>
                    {fields.map((item, index) => (
                    <Card key={item.id} className="mb-3 p-3 relative border-border/70">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-6 w-6 text-destructive hover:text-destructive/80" disabled={fields.length <= 1}><MinusCircle className="h-4 w-4"/></Button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={formHook.control} name={`subjectResults.${index}.subjectName`} render={({ field }) => (
                            <FormItem><FormLabel>Subject</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger></FormControl>
                                <SelectContent>{SUBJECTS.map(subj => <SelectItem key={subj} value={subj}>{subj}</SelectItem>)}</SelectContent>
                            </Select><FormMessage/></FormItem>)} />
                        
                        <div className="grid grid-cols-3 gap-2">
                           <FormField control={formHook.control} name={`subjectResults.${index}.classScore`} render={({ field }) => (
                                <FormItem><FormLabel>Class (50)</FormLabel><FormControl><Input type="number" max="50" placeholder="e.g. 45" {...field} /></FormControl><FormMessage/></FormItem>)} />
                            <FormField control={formHook.control} name={`subjectResults.${index}.examScore`} render={({ field }) => (
                                <FormItem><FormLabel>Exams (50)</FormLabel><FormControl><Input type="number" max="50" placeholder="e.g. 40" {...field} /></FormControl><FormMessage/></FormItem>)} />
                            <FormItem><FormLabel>Total (100)</FormLabel>
                                <Input readOnly disabled value={
                                    (() => {
                                        const classScore = parseFloat(formHook.getValues(`subjectResults.${index}.classScore`) || "0");
                                        const examScore = parseFloat(formHook.getValues(`subjectResults.${index}.examScore`) || "0");
                                        const total = (isNaN(classScore) ? 0 : classScore) + (isNaN(examScore) ? 0 : examScore);
                                        return isNaN(total) ? "" : total.toFixed(1);
                                    })()
                                } className="bg-muted/50 font-semibold" />
                            </FormItem>
                        </div>
                        
                        <FormField control={formHook.control} name={`subjectResults.${index}.grade`} render={({ field }) => (
                            <FormItem><FormLabel>Grade</FormLabel><FormControl><Input placeholder="e.g., A, B+, Pass" {...field} /></FormControl><FormMessage/></FormItem>)} />
                        <FormField control={formHook.control} name={`subjectResults.${index}.remarks`} render={({ field }) => (
                            <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Optional remarks" {...field} rows={1} /></FormControl><FormMessage/></FormItem>)} />
                        </div>
                    </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ subjectName: "", classScore: "", examScore: "", grade: "", remarks: "" })}><PlusCircle className="mr-2 h-4 w-4"/>Add Subject</Button>
                    {formHook.formState.errors.subjectResults?.root && <p className="text-sm font-medium text-destructive">{formHook.formState.errors.subjectResults.root.message}</p>}
                    {Array.isArray(formHook.formState.errors.subjectResults) && formHook.formState.errors.subjectResults.length > 0 && (
                        <p className="text-sm font-medium text-destructive">Please fill all required fields for each subject.</p>
                    )}
                </div>
                <hr className="my-3"/>
                <Label className="text-md font-medium mb-2 block">Overall Summary</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={formHook.control} name="overallAverage" render={({ field }) => (
                        <FormItem><FormLabel>Overall Average Score</FormLabel><FormControl><Input placeholder="Auto-calculated" {...field} readOnly disabled className="bg-muted/50 font-semibold" /></FormControl><FormMessage/></FormItem>)} />
                    <FormField control={formHook.control} name="overallGrade" render={({ field }) => (
                        <FormItem><FormLabel>Overall Grade</FormLabel><FormControl><Input placeholder="e.g., B+" {...field} /></FormControl><FormMessage/></FormItem>)} />
                </div>
                <FormField control={formHook.control} name="overallRemarks" render={({ field }) => (
                    <FormItem><FormLabel>Overall Remarks/Promoted To</FormLabel><FormControl><Textarea placeholder="e.g., Excellent performance, promoted to Basic 2." {...field} rows={2}/></FormControl><FormMessage/></FormItem>)} />
                <FormField control={formHook.control} name="requestedPublishedAt" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Requested Publish Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? safeFormatDate(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl>
                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent></Popover>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Leave as today to request immediate publishing upon approval, or select a future date.</p>
                    </FormItem>)} />
                <DialogFooter className="pt-4 bg-background sticky bottom-0">
                    <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    {currentResultToEdit ? "Update & Resubmit for Approval" : "Submit for Approval"}
                    </Button>
                </DialogFooter>
                </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {resultToView && (
        <Dialog open={isViewResultDialogOpen} onOpenChange={setIsViewResultDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><Eye className="mr-2 h-5 w-5"/> View Result Details</DialogTitle>
                    <DialogDescription>
                        Student: {resultToView.student_name} ({resultToView.class_id}) <br/>
                        Term: {resultToView.term}, {resultToView.year} <br/>
                        Approval: {getStatusIndicator(resultToView.approval_status)}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 p-1 max-h-80 overflow-y-auto">
                    <p><strong>Overall Average:</strong> {resultToView.overall_average || "N/A"}</p>
                    <p><strong>Overall Grade:</strong> {resultToView.overall_grade || "N/A"}</p>
                    <p><strong>Overall Remarks:</strong> {resultToView.overall_remarks || "N/A"}</p>
                    <p><strong>Requested Publish Date:</strong> {resultToView.requested_published_at ? safeFormatDate(resultToView.requested_published_at, "PPP", "Immediate upon approval") : "Immediate upon approval"}</p>
                    {resultToView.approval_status === ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED && resultToView.admin_remarks && (
                        <p className="text-destructive"><strong>Admin Remarks:</strong> {resultToView.admin_remarks}</p>
                    )}
                    <h4 className="font-semibold mt-2 pt-2 border-t">Subject Details:</h4>
                    {(() => {
                      const raw = (resultToView as any).subject_results;
                      let arr: any[] = [];
                      if (Array.isArray(raw)) arr = raw;
                      else if ((resultToView as any).subject) {
                        arr = [{ subjectName: (resultToView as any).subject, classScore: "", examScore: "", totalScore: String((resultToView as any).score || ""), grade: "", remarks: "" }];
                      } else if (typeof raw === 'string') {
                        try {
                          const p = JSON.parse(raw);
                          arr = Array.isArray(p) ? p : [{ subjectName: String(raw) }];
                        } catch (err) {
                          arr = [{ subjectName: String(raw) }];
                        }
                      } else {
                        arr = [{ subjectName: "N/A", classScore: "", examScore: "", totalScore: "", grade: "", remarks: "" }];
                      }

                      return arr.map((sr: any, idx: number) => (
                        <div key={idx} className="ml-2 p-1.5 border-b border-dashed text-sm">
                          <p className="font-medium">{sr.subjectName}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-1 text-xs">
                            <p><strong>Class:</strong> {sr.classScore || "-"}</p>
                            <p><strong>Exams:</strong> {sr.examScore || "-"}</p>
                            <p className="font-semibold"><strong>Total:</strong> {sr.totalScore || "-"}</p>
                            <p><strong>Grade:</strong> {sr.grade}</p>
                            <p className="col-span-full"><strong>Remarks:</strong> {sr.remarks || "-"}</p>
                          </div>
                        </div>
                      ));
                    })()}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewResultDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {resultToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this result entry for {resultToDelete.student_name} (Term: {resultToDelete.term}, Year: {resultToDelete.year}) from Supabase? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteResult} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>} Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
