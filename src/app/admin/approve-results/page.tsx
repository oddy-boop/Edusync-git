
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Loader2, AlertCircle, Users, ListFilter, Eye, Send, ArrowLeft, GraduationCap, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACADEMIC_RESULT_APPROVAL_STATUSES, GRADE_LEVELS } from "@/lib/constants";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
// sendSms moved to server: call POST /api/send-sms instead from client code
import { isSmsNotificationEnabled } from "@/lib/notification-settings";
import { createClient } from "@/lib/supabase/client";

// Diagnostic log right after import
console.log('[ApproveResultsPage] ACADEMIC_RESULT_APPROVAL_STATUSES on load:', ACADEMIC_RESULT_APPROVAL_STATUSES);


interface SubjectResultDisplay {
  subjectName: string;
  classScore?: string;
  examScore?: string;
  totalScore?: string;
  grade: string;
  remarks?: string;
}

interface AcademicResultForApproval {
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
  requested_published_at?: string | null;
  approval_status: string;
  admin_remarks?: string | null;
  created_at: string;
  updated_at: string;
  subject_ids?: string[]; // Array of individual subject IDs for bulk operations
}

export default function ApproveResultsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const { setHasNewResultsForApproval, user: currentUser, schoolId, role } = useAuth();
  const supabase = createClient();

  const [pendingResults, setPendingResults] = useState<AcademicResultForApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classResults, setClassResults] = useState<{ [key: string]: number }>({});
  const [newResultsPerClass, setNewResultsPerClass] = useState<{ [key: string]: number }>({});
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);

  const [selectedResultForAction, setSelectedResultForAction] = useState<AcademicResultForApproval | null>(null);
  const [isActionDialogVisible, setIsActionDialogVisible] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Get last checked timestamp
    const lastChecked = typeof window !== 'undefined' 
      ? localStorage.getItem('admin_last_checked_pending_result')
      : null;
    setLastCheckedTime(lastChecked);
    
    async function loadData() {
        if (!schoolId) {
            setError("Cannot fetch results without a school context.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const { data, error: fetchError } = await supabase
          .from('student_results')
          .select('*')
          .eq('school_id', schoolId)
          .eq('approval_status', ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING)
          .order('created_at', { ascending: true });
        
        if (isMounted.current) {
            if (fetchError) {
                setError(`Failed to load pending results: ${fetchError.message}`);
            } else {
                // Enrich results: when student_name or teacher_name are missing, fetch from students/teachers tables
                const raw = (data || []) as any[];
                
                // With the new grouped approach, each row already represents a complete student result
                // Convert to the format expected by the UI
                const resultsToProcess = raw.map(item => ({
                    id: item.id,
                    teacher_id: item.teacher_id,
                    teacher_name: item.teacher_name,
                    student_id_display: item.student_id_display,
                    student_name: item.student_name,
                    class_id: item.class_id,
                    term: item.term,
                    year: item.year,
                    average_score: item.average_score,
                    total_subjects: item.total_subjects,
                    approval_status: item.approval_status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    submitted_by: item.submitted_by,
                    // Convert JSON subjects data to the format expected by the UI
                    subject_results: (item.subjects_data || []).map((subject: any) => ({
                        subjectName: subject.subject,
                        classScore: subject.class_score,
                        examScore: subject.exam_score,
                        totalScore: subject.total_score,
                        grade: subject.grade,
                        remarks: subject.remarks
                    })),
                    // For bulk operations, we only need the single student result ID
                    subject_ids: [item.id]
                }));
                
                // Enrich student and teacher names for results where they might be missing
                for (const row of resultsToProcess) {
                    // Populate student_name if missing
                    if ((!row.student_name || String(row.student_name).trim() === '') && row.student_id_display) {
                        try {
                            const { data: srows } = await supabase.rpc('get_my_student_profile');
                            const s = Array.isArray(srows) && srows.length > 0 ? srows[0] : null;
                            if (s) row.student_name = s.full_name || s.name || row.student_id_display;
                        } catch (e) { /* ignore enrichment errors */ }
                    }
                    // Populate teacher_name if missing
                    if ((!row.teacher_name || String(row.teacher_name).trim() === '') && row.submitted_by) {
                        row.teacher_name = row.submitted_by;
                    }
                    // If teacher_name still missing, try to lookup teachers table
                    if ((!row.teacher_name || String(row.teacher_name).trim() === '') && row.teacher_id) {
                        try {
                            const { data: trows } = await supabase.rpc('get_my_teacher_profile');
                            const t = Array.isArray(trows) && trows.length > 0 ? trows[0] : null;
                            if (t) row.teacher_name = t.name || row.teacher_name || '';
                        } catch (e) { /* ignore */ }
                    }
                }
                
                setPendingResults(resultsToProcess as AcademicResultForApproval[]);
                
                // Calculate class counts and new results
                const classCounts: { [key: string]: number } = {};
                const newResultsCounts: { [key: string]: number } = {};
                const lastCheckedTimestamp = lastChecked ? new Date(lastChecked) : null;
                
                resultsToProcess.forEach((result: any) => {
                    const classId = result.class_id;
                    if (classId) {
                        classCounts[classId] = (classCounts[classId] || 0) + 1;
                        
                        // Check if this result is "new" (created after last check)
                        const createdAt = new Date(result.created_at);
                        if (!lastCheckedTimestamp || createdAt > lastCheckedTimestamp) {
                            newResultsCounts[classId] = (newResultsCounts[classId] || 0) + 1;
                        }
                    }
                });
        
        setClassResults(classCounts);
        setNewResultsPerClass(newResultsCounts);
            }
            setIsLoading(false);
        }
    }

    if (currentUser && (role === 'admin' || role === 'super_admin')) {
        loadData();
    } else {
        setError("You do not have permission to view this page.");
        setIsLoading(false);
    }
    
    return () => { isMounted.current = false; };
  }, [router, setHasNewResultsForApproval, currentUser, role, schoolId, supabase, lastCheckedTime]);

  const handleClassSelection = (grade: string) => {
    setSelectedClass(grade);
    
    // Update last checked time when a class is selected
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_last_checked_pending_result', new Date().toISOString());
      setHasNewResultsForApproval(false);
    }
    
    // Clear new results count for this class
    setNewResultsPerClass(prev => ({
      ...prev,
      [grade]: 0
    }));
  };

  const handleOpenActionDialog = (result: AcademicResultForApproval, type: "approve" | "reject") => {
    setSelectedResultForAction(result);
    setActionType(type);
    setAdminRemarks(result.admin_remarks || ""); 
    setIsActionDialogVisible(true);
  };

  const handleCloseActionDialog = () => {
    setSelectedResultForAction(null);
    setActionType(null);
    setIsActionDialogVisible(false);
    setAdminRemarks("");
  };

  const handleSubmitAction = async () => {
    if (!selectedResultForAction || !actionType || !currentUser || !schoolId) {
      toast({ title: "Error", description: "Missing data for action.", variant: "destructive" });
      return;
    }
    
    const { dismiss } = toast({
      title: "Processing Action...",
      description: `Please wait while we ${actionType} the result.`,
    });
    setIsSubmittingAction(true);

    const updatePayload: Partial<AcademicResultForApproval> & { approval_timestamp?: string, approved_by_admin_auth_id?: string, published_at?: string | null } = {
      approval_status: actionType === "approve" ? ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED : ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED,
      admin_remarks: actionType === "reject" ? (adminRemarks.trim() || null) : (actionType === "approve" ? "Approved by admin." : null),
      approved_by_admin_auth_id: currentUser.id,
      approval_timestamp: new Date().toISOString(),
    };

    if (actionType === "approve") {
      let publishDate = new Date(); 
      if (selectedResultForAction.requested_published_at) {
        const requestedDate = new Date(selectedResultForAction.requested_published_at);
        if (!isNaN(requestedDate.getTime()) && requestedDate >= new Date(new Date().setHours(0,0,0,0)) ) {
          publishDate = requestedDate;
        }
      }
      updatePayload.published_at = format(publishDate, "yyyy-MM-dd HH:mm:ss");
    } else { 
      updatePayload.published_at = null;
    }
    
    try {
        // Update the student result record (single record per student now)
        const resultId = selectedResultForAction.id;
        const { error } = await supabase
            .from('student_results')
            .update(updatePayload)
            .eq('id', resultId);
        
        if (error) throw error;
      
      dismiss();
      toast({ title: "Success", description: `Result for ${selectedResultForAction.student_name} has been ${actionType}.` });
      
      if (actionType === 'approve') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('guardian_contact')
          .eq('student_id_display', selectedResultForAction.student_id_display)
          .eq('school_id', schoolId)
          .single();
        if(studentError) console.warn("Could not fetch student for SMS notification", studentError);

        if (studentData?.guardian_contact) {
            // Check if SMS notifications are enabled for this school
            const smsEnabled = await isSmsNotificationEnabled(schoolId);
            if (smsEnabled) {
                const message = `Hello, the ${selectedResultForAction.term} results for ${selectedResultForAction.student_name} have been approved and published. You can now view them in the student portal.`;
                try {
                  const res = await fetch('/api/send-sms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schoolId, message, recipients: [{ phoneNumber: studentData.guardian_contact }] }),
                  });
                  const json = await res.json();
                  if (json?.ok && json.result?.successCount > 0) {
                    toast({ title: 'Notification Sent', description: 'Guardian has been notified via SMS.' });
                  } else if (json?.ok && json.result?.errorCount > 0) {
                    toast({ title: 'SMS Failed', description: `Could not send SMS: ${json.result.firstErrorMessage}`, variant: 'destructive' });
                  } else if (!json?.ok) {
                    toast({ title: 'SMS Failed', description: `Could not send SMS: ${json?.error || 'Unknown error'}`, variant: 'destructive' });
                  }
                } catch (err) {
                  console.error('Failed to send SMS for approved result', err);
                  toast({ title: 'SMS Error', description: 'Failed to queue SMS notification.', variant: 'destructive' });
                }
            }
        }
      }

      setPendingResults(prev => {
        const updatedResults = prev.filter(r => r.id !== selectedResultForAction.id);
        
        // Update class counts and new results counts
        const classCounts: { [key: string]: number } = {};
        const newResultsCounts: { [key: string]: number } = {};
        const lastCheckedTimestamp = lastCheckedTime ? new Date(lastCheckedTime) : null;
        
        updatedResults.forEach((result) => {
          const classId = result.class_id;
          if (classId) {
            classCounts[classId] = (classCounts[classId] || 0) + 1;
            
            // Check if this result is "new"
            const createdAt = new Date(result.created_at);
            if (!lastCheckedTimestamp || createdAt > lastCheckedTimestamp) {
              newResultsCounts[classId] = (newResultsCounts[classId] || 0) + 1;
            }
          }
        });
        
        setClassResults(classCounts);
        setNewResultsPerClass(newResultsCounts);
        
        return updatedResults;
      });
      handleCloseActionDialog();
    } catch (e: any) {
      dismiss();
      toast({ title: "Error", description: `Failed to ${actionType} result: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSubmittingAction(false);
    }
  };


  // Calculate total new results
  const totalNewResults = Object.values(newResultsPerClass).reduce((sum, count) => sum + count, 0);

  // Filter results for selected class
  const filteredResults = selectedClass 
    ? pendingResults.filter(result => result.class_id === selectedClass)
    : pendingResults;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading pending results...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("permission") && <Button asChild className="mt-2"><Link href="/admin/dashboard">Back to Dashboard</Link></Button>}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <CheckCircle className="mr-3 h-8 w-8" /> Approve Student Results
            {totalNewResults > 0 && (
              <span className="ml-3 bg-red-500 text-white text-sm px-2 py-1 rounded-full flex items-center">
                <Bell className="h-3 w-3 mr-1" />
                {totalNewResults} new
              </span>
            )}
          </h2>
          <CardDescription className="mt-2">
            {selectedClass 
              ? `Review and approve results for ${selectedClass} students.`
              : "Select a class to review and approve academic results submitted by teachers."
            }
            {totalNewResults > 0 && !selectedClass && (
              <span className="block mt-1 text-orange-600 font-medium">
                {totalNewResults} new {totalNewResults === 1 ? 'result' : 'results'} submitted since your last visit.
              </span>
            )}
          </CardDescription>
        </div>
        
        {selectedClass && (
          <Button 
            variant="outline" 
            onClick={() => setSelectedClass(null)}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
        )}
      </div>

      {!selectedClass ? (
        // Class selection view
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <GraduationCap className="mr-2 h-5 w-5" />
            Select Class ({Object.keys(classResults).length} classes with pending results)
            {totalNewResults > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-700 text-sm px-2 py-1 rounded-full flex items-center">
                <Bell className="h-3 w-3 mr-1" />
                {totalNewResults} new
              </span>
            )}
          </h3>
          
          {Object.keys(classResults).length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Pending Approval</h3>
                  <p className="text-muted-foreground">All submitted results have been reviewed and processed.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {GRADE_LEVELS.filter(grade => classResults[grade] > 0).map((grade) => {
                const hasNewResults = newResultsPerClass[grade] > 0;
                return (
                  <Card 
                    key={grade} 
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 relative",
                      hasNewResults && "border-orange-300 bg-orange-50/50 shadow-md"
                    )}
                    onClick={() => handleClassSelection(grade)}
                  >
                    {hasNewResults && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="relative">
                          <Bell className="h-5 w-5 text-orange-500" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                            {newResultsPerClass[grade]}
                          </span>
                        </div>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="font-semibold">{grade}</span>
                        <GraduationCap className={cn(
                          "h-5 w-5",
                          hasNewResults ? "text-orange-500" : "text-primary"
                        )} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn(
                            "text-2xl font-bold",
                            hasNewResults ? "text-orange-600" : "text-primary"
                          )}>
                            {classResults[grade]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {classResults[grade] === 1 ? 'result' : 'results'} pending
                          </p>
                          {hasNewResults && (
                            <p className="text-xs text-orange-600 font-medium mt-1 flex items-center">
                              <Bell className="h-3 w-3 mr-1" />
                              {newResultsPerClass[grade]} new
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Button 
                            size="sm" 
                            variant={hasNewResults ? "default" : "outline"}
                            className={hasNewResults ? "bg-orange-500 hover:bg-orange-600" : ""}
                          >
                            View Results
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Results table for selected class
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListFilter className="mr-2 h-5 w-5" />
              {selectedClass} - Pending Approval ({filteredResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No academic results are currently awaiting approval for this class.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Term/Year</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Requested Publish</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.student_name || result.student_id_display} ({result.student_id_display})</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{result.subject_results?.length || 1} subjects</span>
                            {result.subject_results && result.subject_results.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {result.subject_results.slice(0, 3).map(s => s.subjectName).join(", ")}
                                {result.subject_results.length > 3 && "..."}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{(result.term || 'Unspecified')} / {(result.year || 'Unspecified')}</TableCell>
                        <TableCell>{result.teacher_name || result.submitted_by || result.teacher_id || 'Unknown'}</TableCell>
                        <TableCell>{result.requested_published_at ? format(new Date(result.requested_published_at), "PPP") : "Immediate"}</TableCell>
                        <TableCell className="text-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenActionDialog(result, "approve")} className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenActionDialog(result, "reject")} className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700">
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedResultForAction && (
        <Dialog open={isActionDialogVisible} onOpenChange={handleCloseActionDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {actionType === "approve" ? <CheckCircle className="mr-2 h-6 w-6 text-green-600" /> : <XCircle className="mr-2 h-6 w-6 text-red-600" />}
                Confirm {actionType === "approve" ? "Approval" : "Rejection"}
              </DialogTitle>
              <DialogDescription>
                Student: {selectedResultForAction.student_name} ({selectedResultForAction.class_id}) <br/>
                Term: {selectedResultForAction.term}, {selectedResultForAction.year} <br/>
                Submitted by: {selectedResultForAction.teacher_name}
              </DialogDescription>
            </DialogHeader>
            
            <Accordion type="single" collapsible className="w-full my-4" defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm hover:bg-muted/50 px-2 rounded-md">
                    <Eye className="mr-2 h-4 w-4"/> View Subject-by-Subject Results ({selectedResultForAction.subject_results?.length || 0} subjects)
                </AccordionTrigger>
                <AccordionContent className="px-2 pt-2 space-y-3 max-h-80 overflow-y-auto">
                    <div className="grid gap-2 text-xs">
                        <div className="grid grid-cols-2 gap-4 p-2 bg-muted/30 rounded">
                            <p><strong>Overall Average:</strong> {selectedResultForAction.overall_average || "N/A"}</p>
                            <p><strong>Overall Grade:</strong> {selectedResultForAction.overall_grade || "N/A"}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                            <p><strong>Overall Remarks:</strong> {selectedResultForAction.overall_remarks || "N/A"}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded">
                            <p><strong>Requested Publish Date:</strong> {selectedResultForAction.requested_published_at ? format(new Date(selectedResultForAction.requested_published_at), "PPP") : "Immediate upon approval"}</p>
                        </div>
                    </div>
                    
                    <div className="border-t pt-3">
                        <h4 className="font-semibold mb-3 text-sm">Individual Subject Breakdown:</h4>
                        {Array.isArray(selectedResultForAction.subject_results) && selectedResultForAction.subject_results.length > 0 ? (
                            <div className="space-y-3">
                                {selectedResultForAction.subject_results.map((sr, idx) => (
                                    <div key={idx} className="border rounded-lg p-3 bg-background">
                                        <h5 className="font-semibold text-sm mb-2 text-primary">{sr.subjectName}</h5>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                <p className="font-medium text-blue-700">Class Work</p>
                                                <p className="text-lg font-bold text-blue-800">{sr.classScore || "-"}</p>
                                            </div>
                                            <div className="text-center p-2 bg-green-50 rounded">
                                                <p className="font-medium text-green-700">Exams</p>
                                                <p className="text-lg font-bold text-green-800">{sr.examScore || "-"}</p>
                                            </div>
                                            <div className="text-center p-2 bg-purple-50 rounded">
                                                <p className="font-medium text-purple-700">Total</p>
                                                <p className="text-lg font-bold text-purple-800">{sr.totalScore || "-"}</p>
                                            </div>
                                            <div className="text-center p-2 bg-orange-50 rounded">
                                                <p className="font-medium text-orange-700">Grade</p>
                                                <p className="text-lg font-bold text-orange-800">{sr.grade || "-"}</p>
                                            </div>
                                        </div>
                                        {sr.remarks && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                <p className="font-medium text-gray-600">Remarks:</p>
                                                <p className="text-gray-700">{sr.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                <p>No subject details available or data format issue.</p>
                                <p className="text-xs mt-1">Please contact technical support if this persists.</p>
                            </div>
                        )}
                    </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {actionType === "reject" && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="adminRemarks">Reason for Rejection (Optional)</Label>
                <Textarea
                  id="adminRemarks"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Provide feedback to the teacher..."
                />
              </div>
            )}
             {actionType === "approve" && (
                <p className="text-sm text-muted-foreground mt-2">
                    Approving will make these results available to the student based on the requested or current publish date. The guardian will be notified via SMS if configured.
                </p>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleCloseActionDialog} disabled={isSubmittingAction}>Cancel</Button>
              <Button
                onClick={handleSubmitAction}
                disabled={isSubmittingAction}
                className={cn(actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700", "text-white")}
              >
                {isSubmittingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {actionType === "approve" ? "Confirm Approve" : "Confirm Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}