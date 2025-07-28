
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface SubjectResultDisplay {
  subjectName: string;
  classScore?: string;
  examScore?: string;
  totalScore?: string;
  grade: string;
  remarks?: string;
}

interface AcademicResultEntry {
  id: string;
  class_id: string; 
  student_id_display: string;
  student_name: string; 
  term: string;
  year: string;
  subject_results: SubjectResultDisplay[]; 
  overall_average?: string | null;
  overall_grade?: string | null;
  overall_remarks?: string | null;
  teacher_name?: string | null; 
  published_at?: string | null; 
  attendance_summary?: {
      present: number;
      absent: number;
      late: number;
  } | null;
}

interface SchoolBranding {
    school_name: string;
    school_address: string;
    school_logo_url: string;
}

interface ResultSlipProps {
    result: AcademicResultEntry;
    schoolBranding: SchoolBranding;
}


export function ResultSlip({ result, schoolBranding }: ResultSlipProps) {
  const logoSrc = schoolBranding.school_logo_url || "https://placehold.co/200x80.png";

  return (
    <div className="bg-white text-black p-4 font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <header className="text-center mb-4">
        <img 
            src={logoSrc} 
            alt={`${schoolBranding.school_name} Logo`} 
            width="100"
            className="mx-auto mb-2 object-contain" 
            style={{maxHeight: '50px'}}
            data-ai-hint="school logo"
        />
        <h1 className="text-xl font-bold text-primary">{schoolBranding.school_name}</h1>
        <p className="text-xs">{schoolBranding.school_address}</p>
        <h2 className="text-lg font-semibold mt-3 border-b-2 border-t-2 border-primary py-1 inline-block">
          STUDENT TERMINAL REPORT
        </h2>
      </header>

      <section className="student-details text-xs mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <p><strong>Student's Name:</strong> {result.student_name}</p>
          <p><strong>Student ID:</strong> {result.student_id_display}</p>
          <p><strong>Class:</strong> {result.class_id}</p>
          <p><strong>Term:</strong> {result.term}</p>
          <p><strong>Academic Year:</strong> {result.year}</p>
          <p><strong>Report Date:</strong> {format(new Date(), "PPP")}</p>
        </div>
      </section>

      <section className="results-table">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="font-bold text-primary p-1">Subject</TableHead>
              <TableHead className="text-center font-bold text-primary p-1">Class (50)</TableHead>
              <TableHead className="text-center font-bold text-primary p-1">Exams (50)</TableHead>
              <TableHead className="text-center font-bold text-primary p-1">Total (100)</TableHead>
              <TableHead className="text-center font-bold text-primary p-1">Grade</TableHead>
              <TableHead className="font-bold text-primary p-1">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.subject_results.map((sr, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium p-1">{sr.subjectName}</TableCell>
                <TableCell className="text-center p-1">{sr.classScore || "-"}</TableCell>
                <TableCell className="text-center p-1">{sr.examScore || "-"}</TableCell>
                <TableCell className="text-center font-semibold p-1">{sr.totalScore || "-"}</TableCell>
                <TableCell className="text-center p-1">{sr.grade}</TableCell>
                <TableCell className="p-1">{sr.remarks || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Separator className="my-3" />

      <section className="summary-section grid grid-cols-2 gap-4 text-xs">
        <div>
          <h3 className="font-bold text-primary mb-1">Overall Performance</h3>
          <p><strong>Overall Average:</strong> {result.overall_average || "N/A"}</p>
          <p><strong>Overall Grade:</strong> {result.overall_grade || "N/A"}</p>
        </div>
        <div>
           <h3 className="font-bold text-primary mb-1">Teacher's Remarks</h3>
           <p className="italic min-h-[30px]">{result.overall_remarks || "No overall remarks provided."}</p>
        </div>
      </section>

      {result.attendance_summary && (
          <>
            <Separator className="my-3" />
            <section className="attendance-summary-section text-xs">
               <h3 className="font-bold text-primary mb-1">Attendance Summary for the Year</h3>
               <div className="grid grid-cols-3 gap-2 text-center p-2 border rounded-md bg-primary/5">
                    <div>
                        <p className="font-bold text-base text-green-700">{result.attendance_summary.present}</p>
                        <p className="text-[10px] text-muted-foreground">Days Present</p>
                    </div>
                    <div>
                        <p className="font-bold text-base text-yellow-700">{result.attendance_summary.late}</p>
                        <p className="text-[10px] text-muted-foreground">Days Late</p>
                    </div>
                    <div>
                        <p className="font-bold text-base text-red-700">{result.attendance_summary.absent}</p>
                        <p className="text-[10px] text-muted-foreground">Days Absent</p>
                    </div>
               </div>
            </section>
          </>
        )}

      <footer className="absolute bottom-4 left-4 right-4 mt-8 text-[10px]">
        <div className="flex justify-between items-end">
            <div className="w-2/5 text-center">
                <div className="border-t border-black w-full h-1 mt-10"></div>
                <p>Teacher's Signature</p>
            </div>
            <div className="w-2/5 text-center">
                <div className="border-t border-black w-full h-1 mt-10"></div>
                <p>Headmaster's Signature</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
