
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
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
  const logoSrc = schoolBranding.school_logo_url || "https://placehold.co/150x80.png";

  return (
    <div className="bg-white text-black p-6 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <header className="text-center mb-6">
        {schoolBranding.school_logo_url && (
            <Image 
                src={logoSrc} 
                alt={`${schoolBranding.school_name} Logo`} 
                width={120} 
                height={60} 
                className="mx-auto mb-2 object-contain" 
                style={{maxHeight: '60px'}}
                data-ai-hint="school logo"
                unoptimized={true} 
            />
        )}
        <h1 className="text-2xl font-bold text-primary">{schoolBranding.school_name}</h1>
        <p className="text-sm">{schoolBranding.school_address}</p>
        <h2 className="text-xl font-semibold mt-4 border-b-2 border-t-2 border-primary py-1 inline-block">
          STUDENT TERMINAL REPORT
        </h2>
      </header>

      <section className="student-details text-sm mb-4">
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
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="font-bold text-primary">Subject</TableHead>
              <TableHead className="text-center font-bold text-primary">Class Score (50)</TableHead>
              <TableHead className="text-center font-bold text-primary">Exams Score (50)</TableHead>
              <TableHead className="text-center font-bold text-primary">Total Score (100)</TableHead>
              <TableHead className="text-center font-bold text-primary">Grade</TableHead>
              <TableHead className="font-bold text-primary">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.subject_results.map((sr, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{sr.subjectName}</TableCell>
                <TableCell className="text-center">{sr.classScore || "-"}</TableCell>
                <TableCell className="text-center">{sr.examScore || "-"}</TableCell>
                <TableCell className="text-center font-semibold">{sr.totalScore || "-"}</TableCell>
                <TableCell className="text-center">{sr.grade}</TableCell>
                <TableCell>{sr.remarks || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Separator className="my-4" />

      <section className="summary-section grid grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-bold text-primary mb-2">Overall Performance</h3>
          <p><strong>Overall Average:</strong> {result.overall_average || "N/A"}</p>
          <p><strong>Overall Grade:</strong> {result.overall_grade || "N/A"}</p>
        </div>
        <div>
           <h3 className="font-bold text-primary mb-2">Teacher's Remarks</h3>
           <p className="italic min-h-[40px]">{result.overall_remarks || "No overall remarks provided."}</p>
        </div>
      </section>

      <footer className="mt-12 text-sm">
        <div className="flex justify-between items-end">
            <div className="w-2/5 text-center">
                <div className="border-t border-black w-full h-1 mt-12"></div>
                <p>Teacher's Signature</p>
            </div>
            <div className="w-2/5 text-center">
                <div className="border-t border-black w-full h-1 mt-12"></div>
                <p>Headmaster's Signature</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
