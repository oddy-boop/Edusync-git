
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
import { ADMIN_LOGGED_IN_KEY, ACADEMIC_RESULT_APPROVAL_STATUSES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Diagnostic log right after import
console.log('[ApproveResultsPage] ACADEMIC_RESULT_APPROVAL_STATUSES on load:', ACADEMIC_RESULT_APPROVAL_STATUSES);


interface SubjectResultDisplay {
  subjectName: string;
  score?: string;
  grade: string;
  remarks?: string;
}

interface AcademicResultForApproval {
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
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingResults, setPendingResults] = useState<AcademicResultForApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedResultForAction, setSelectedResultForAction] = useState<AcademicResultForApproval | null>(null);
  const [isActionDialogValid, setIsActionDialogValid] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    async function fetchAdminAndPendingResults() {
      if (!supabaseRef.current || !isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabaseRef.current.auth.getSession();
      const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;

      if (session?.user && localAdminFlag) {
        if (isMounted.current) setCurrentUser(session.user);
        try {
          if (!ACADEMIC_RESULT_APPROVAL_STATUSES || !ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING) {
            console.error("[ApproveResultsPage] CRITICAL: ACADEMIC_RESULT_APPROVAL_STATUSES or its PENDING property is undefined before fetch.");
            throw new Error("Approval status constants are not loaded correctly. This is an application bug.");
          }
          
          console.log(`[ApproveResultsPage] Fetching results with status: '${ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING}'`);
          const { data, error: fetchError } = await supabaseRef.current
            .from('academic_results')
            .select('*')
            .eq('approval_status', ACADEMIC_RESULT_APPROVAL_STATUSES.PENDING)
            .order('created_at', { ascending: true });

          if (fetchError) {
            console.error("[ApproveResultsPage] Error fetching pending results from Supabase:", JSON.stringify(fetchError, null, 2));
            throw fetchError;
          }
          
          console.log(`[ApproveResultsPage] Fetched ${data ? data.length : 0} raw results from Supabase.`);
          if (data && data.length === 0) {
            console.log("[ApproveResultsPage] No pending results returned by Supabase query. Check RLS policies or if data truly exists with this status.");
          } else if (data && data.length > 0) {
            console.log("[ApproveResultsPage] Sample of first fetched result (raw):", JSON.stringify(data[0], null, 2));
          }

          if (isMounted.current) {
            const mappedResults = (data || []).map(item => ({
              ...item,
              subject_results: Array.isArray(item.subject_results) ? item.subject_results : [],
            }));
            setPendingResults(mappedResults as AcademicResultForApproval[]);
          }
        } catch (e: any) {
          let errorMessage = `Failed to load pending results: ${e.message}`;
          if (e.message && typeof e.message === 'string' && e.message.toLowerCase().includes("infinite recursion detected in policy for relation \"user_roles\"")) {
            errorMessage = "Database Configuration Error: Infinite recursion detected in RLS policy for 'user_roles'. This prevents loading pending results. Please contact your database administrator to review and correct the RLS policies on the 'user_roles' table in Supabase. Refer to the SQL provided in previous discussions for the fix.";
            console.error("[ApproveResultsPage] CRITICAL RLS POLICY ERROR: " + errorMessage);
          }
          if (isMounted.current) setError(errorMessage);
        }
      } else {
        if (isMounted.current) {
          setError("Admin not authenticated. Please log in.");
          router.push("/auth/admin/login");
        }
      }
      if (isMounted.current) setIsLoading(false);
    }

    fetchAdminAndPendingResults();
    return () => { isMounted.current = false; };
  }, [router]);

  const handleOpenActionDialog = (result: AcademicResultForApproval, type: "approve" | "reject") => {
    setSelectedResultForAction(result);
    setActionType(type);
    setAdminRemarks(result.admin_remarks || ""); 
    setIsActionDialogValid(true);
  };

  const handleCloseActionDialog = () => {
    setSelectedResultForAction(null);
    setActionType(null);
    setIsActionDialogValid(false);
    setAdminRemarks("");
  };

  const handleSubmitAction = async () => {
    if (!selectedResultForAction || !actionType || !currentUser || !supabaseRef.current) {
      toast({ title: "Error", description: "Missing data for action.", variant: "destructive" });
      return;
    }
    if (!ACADEMIC_RESULT_APPROVAL_STATUSES || !ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED || !ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED) {
      toast({ title: "Configuration Error", description: "Approval status constants are missing.", variant: "destructive" });
      setIsSubmittingAction(false);
      return;
    }
    setIsSubmittingAction(true);

    const updatePayload: Partial<AcademicResultForApproval> & { approval_timestamp?: string, approved_by_admin_auth_id?: string, published_at?: string | null } = {
      approval_status: actionType === "approve" ? ACADEMIC_RESULT_APPROVAL_STATUSES.APPROVED : ACADEMIC_RESULT_APPROVAL_STATUSES.REJECTED,
      admin_remarks: actionType === "reject" ? (adminRemarks.trim() || null) : null,
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
      const { error: updateError } = await supabaseRef.current
        .from('academic_results')
        .update(updatePayload)
        .eq('id', selectedResultForAction.id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: `Result for ${selectedResultForAction.student_name} has been ${actionType}.` });
      setPendingResults(prev => prev.filter(r => r.id !== selectedResultForAction.id));
      handleCloseActionDialog();
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to ${actionType} result: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSubmittingAction(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading pending results...</p></div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p>{error.includes("Please log in") && <Button asChild className="mt-2"><Link href="/auth/admin/login">Login</Link></Button>}</CardContent></Card>;
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
                      <TableCell>{result.student_name} ({result.student_id_display})</TableCell>
                      <TableCell>{result.class_id}</TableCell>
                      <TableCell>{result.term} / {result.year}</TableCell>
                      <TableCell>{result.teacher_name}</TableCell>
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

      {selectedResultForAction && isActionDialogValid && (
        <Dialog open={isActionDialogValid} onOpenChange={handleCloseActionDialog}>
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
                        <div key={idx} className="ml-2 p-1 border-b border-dashed">
                            <p><strong>{sr.subjectName}:</strong> Score: {sr.score || "-"}, Grade: {sr.grade}, Remarks: {sr.remarks || "-"}</p>
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
                    Approving will make these results available to the student based on the requested or current publish date.
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
