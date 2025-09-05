
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
import { CheckCircle, XCircle, Loader2, AlertCircle, Users, ListFilter, Eye, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { sendSms } from "@/lib/sms";
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

  const [selectedResultForAction, setSelectedResultForAction] = useState<AcademicResultForApproval | null>(null);
  const [isActionDialogVisible, setIsActionDialogVisible] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Clear notification dot when page is visited
    if (typeof window !== 'undefined') {
        localStorage.setItem('admin_last_checked_pending_result', new Date().toISOString());
        setHasNewResultsForApproval(false);
    }
    
    async function loadData() {
        if (!schoolId) {
            setError("Cannot fetch results without a school context.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('academic_results')
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
        const mappedResults: any[] = [];
        for (const item of raw) {
          const row = { ...item, subject_results: Array.isArray(item.subject_results) ? item.subject_results : [] };
          // Populate student_name if missing
          if ((!row.student_name || String(row.student_name).trim() === '') && row.student_id_display) {
            try {
              const { data: srows } = await supabase.from('students').select('name,full_name,student_id_display').eq('student_id_display', row.student_id_display).limit(1);
              const s = Array.isArray(srows) && srows.length > 0 ? srows[0] : null;
              if (s) row.student_name = s.full_name || s.name || row.student_id_display;
            } catch (e) { /* ignore enrichment errors */ }
          }
          // Prefer 'submitted_by' text if present (you're now storing teacher full name there)
          if ((!row.teacher_name || String(row.teacher_name).trim() === '') && row.submitted_by) {
            row.teacher_name = row.submitted_by;
          }
          // If teacher_name still missing, and we have a numeric teacher id, try to lookup teachers table
          if ((!row.teacher_name || String(row.teacher_name).trim() === '') && row.teacher_id) {
            try {
              const { data: trows } = await supabase.from('teachers').select('name,id,auth_user_id').eq('id', row.teacher_id).limit(1);
              const t = Array.isArray(trows) && trows.length > 0 ? trows[0] : null;
              if (t) row.teacher_name = t.name || row.teacher_name || '';
            } catch (e) { /* ignore */ }
          }
          mappedResults.push(row);
        }
        setPendingResults(mappedResults as AcademicResultForApproval[]);
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
  }, [router, setHasNewResultsForApproval, currentUser, role, schoolId, supabase]);

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
        const { error } = await supabase
            .from('academic_results')
            .update(updatePayload)
            .eq('id', selectedResultForAction.id);
        
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
                sendSms({ schoolId, message, recipients: [{ phoneNumber: studentData.guardian_contact }] })
                  .then(smsResult => {
                      if (smsResult.successCount > 0) {
                          toast({ title: "Notification Sent", description: "Guardian has been notified via SMS." });
                      } else if (smsResult.errorCount > 0) {
                          toast({ title: "SMS Failed", description: `Could not send SMS: ${smsResult.firstErrorMessage}`, variant: "destructive" });
                      }
                  });
            }
        }
      }

      setPendingResults(prev => prev.filter(r => r.id !== selectedResultForAction.id));
      handleCloseActionDialog();
    } catch (e: any) {
      dismiss();
      toast({ title: "Error", description: `Failed to ${actionType} result: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSubmittingAction(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading pending results...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("permission") && <Button asChild className="mt-2"><Link href="/admin/dashboard">Back to Dashboard</Link></Button>}</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <CheckCircle className="mr-3 h-8 w-8" /> Approve Student Results
      </h2>
      <CardDescription>
        Review and approve or reject academic results submitted by teachers. Approved results will become visible to students according to their publish date.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ListFilter className="mr-2 h-5 w-5" />Pending Approval ({pendingResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No academic results are currently awaiting approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Term/Year</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Requested Publish</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>{result.student_name || result.student_id_display} ({result.student_id_display})</TableCell>
                      <TableCell>{result.class_id}</TableCell>
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

      {selectedResultForAction && (
        <Dialog open={isActionDialogVisible} onOpenChange={handleCloseActionDialog}>
          <DialogContent className="sm:max-w-lg">
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
            
            <Accordion type="single" collapsible className="w-full my-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm hover:bg-muted/50 px-2 rounded-md">
                    <Eye className="mr-2 h-4 w-4"/> View Submitted Result Details
                </AccordionTrigger>
                <AccordionContent className="px-2 pt-2 text-xs space-y-2 max-h-60 overflow-y-auto">
                    <p><strong>Overall Average:</strong> {selectedResultForAction.overall_average || "N/A"}</p>
                    <p><strong>Overall Grade:</strong> {selectedResultForAction.overall_grade || "N/A"}</p>
                    <p><strong>Overall Remarks:</strong> {selectedResultForAction.overall_remarks || "N/A"}</p>
                    <p><strong>Requested Publish Date:</strong> {selectedResultForAction.requested_published_at ? format(new Date(selectedResultForAction.requested_published_at), "PPP") : "Immediate upon approval"}</p>
                    <h4 className="font-semibold mt-1 pt-1 border-t">Subject Details:</h4>
                    {Array.isArray(selectedResultForAction.subject_results) && selectedResultForAction.subject_results.map((sr, idx) => (
                        <div key={idx} className="ml-2 p-1.5 border-b border-dashed">
                            <p className="font-medium">{sr.subjectName}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1 text-xs">
                                <p><strong>Class:</strong> {sr.classScore || "-"}</p>
                                <p><strong>Exams:</strong> {sr.examScore || "-"}</p>
                                <p className="font-semibold"><strong>Total:</strong> {sr.totalScore || "-"}</p>
                                <p><strong>Grade:</strong> {sr.grade}</p>
                                <p className="sm:col-span-2"><strong>Remarks:</strong> {sr.remarks || "-"}</p>
                            </div>
                        </div>
                    ))}
                    {!Array.isArray(selectedResultForAction.subject_results) && <p>Subject results are not available in the expected format.</p>}
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
