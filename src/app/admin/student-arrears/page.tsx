
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Search, Filter, Edit, DollarSign, BadgeDollarSign, Info, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface StudentArrear {
  id: string;
  student_id_display: string;
  student_name: string;
  grade_level_at_arrear: string;
  academic_year_from: string;
  academic_year_to: string;
  amount: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

interface StudentForJoin {
  student_id_display: string;
  full_name: string;
  grade_level: string; // Current grade level
}

interface DisplayArrear extends StudentArrear {
  current_grade_level?: string; // From students table
}

const arrearEditSchema = z.object({
  status: z.string().min(1, "Status is required."),
  notes: z.string().optional(),
});
type ArrearEditFormData = z.infer<typeof arrearEditSchema>;

const ARREAR_STATUSES = ["outstanding", "partially_paid", "cleared", "waived"];

export default function StudentArrearsPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allArrears, setAllArrears] = useState<DisplayArrear[]>([]);
  const [filteredArrears, setFilteredArrears] = useState<DisplayArrear[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFromFilter, setYearFromFilter] = useState("all");
  const [yearToFilter, setYearToFilter] = useState("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentArrearToEdit, setCurrentArrearToEdit] = useState<DisplayArrear | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const uniqueAcademicYearsFrom = Array.from(new Set(allArrears.map(a => a.academic_year_from))).sort().reverse();
  const uniqueAcademicYearsTo = Array.from(new Set(allArrears.map(a => a.academic_year_to))).sort().reverse();

  const editForm = useForm<ArrearEditFormData>({
    resolver: zodResolver(arrearEditSchema),
    defaultValues: { status: "outstanding", notes: "" },
  });

  useEffect(() => {
    isMounted.current = true;
    
    const fetchInitialData = async () => {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Admin authentication required.");
        setIsLoading(false);
        return;
      }
      setCurrentUser(session.user);

      try {
        const { data: arrearsData, error: arrearsError } = await supabase
          .from("student_arrears")
          .select("*")
          .order("created_at", { ascending: false });
        if (arrearsError) throw arrearsError;

        const studentIds = arrearsData?.map(a => a.student_id_display) || [];
        let studentsMap: Record<string, StudentForJoin> = {};

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from("students")
            .select("student_id_display, full_name, grade_level")
            .in("student_id_display", studentIds);
          if (studentsError) throw studentsError;
          studentsData?.forEach(s => { studentsMap[s.student_id_display] = s; });
        }
        
        const enrichedArrears = (arrearsData || []).map(arrear => ({
          ...arrear,
          student_name: studentsMap[arrear.student_id_display]?.full_name || arrear.student_name || 'N/A',
          current_grade_level: studentsMap[arrear.student_id_display]?.grade_level || 'N/A',
        }));

        if (isMounted.current) {
          setAllArrears(enrichedArrears);
          setFilteredArrears(enrichedArrears);
        }

      } catch (e: any) {
        console.error("Error fetching arrears data:", e);
        setError(`Failed to load arrears: ${e.message}`);
        toast({ title: "Error", description: `Could not fetch arrears: ${e.message}`, variant: "destructive" });
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    fetchInitialData();
    return () => { isMounted.current = false; };
  }, [supabase, toast]);


  useEffect(() => {
    if (!isMounted.current) return;
    let tempArrears = [...allArrears];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempArrears = tempArrears.filter(a =>
        a.student_name.toLowerCase().includes(lowerSearchTerm) ||
        a.student_id_display.toLowerCase().includes(lowerSearchTerm) ||
        a.grade_level_at_arrear.toLowerCase().includes(lowerSearchTerm) ||
        (a.current_grade_level && a.current_grade_level.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (statusFilter !== "all") {
      tempArrears = tempArrears.filter(a => a.status === statusFilter);
    }
    if (yearFromFilter !== "all") {
      tempArrears = tempArrears.filter(a => a.academic_year_from === yearFromFilter);
    }
    if (yearToFilter !== "all") {
      tempArrears = tempArrears.filter(a => a.academic_year_to === yearToFilter);
    }
    
    setFilteredArrears(tempArrears);
  }, [searchTerm, statusFilter, yearFromFilter, yearToFilter, allArrears]);

  const handleOpenEditDialog = (arrear: DisplayArrear) => {
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "Admin action required.", variant: "destructive" });
        return;
    }
    setCurrentArrearToEdit(arrear);
    editForm.reset({
        status: arrear.status,
        notes: arrear.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const onSubmitEditArrear = async (data: ArrearEditFormData) => {
    if (!currentArrearToEdit || !currentUser) {
        toast({ title: "Error", description: "No arrear selected or not authenticated.", variant: "destructive" });
        return;
    }
    setIsSubmittingEdit(true);
    try {
        const { error: updateError } = await supabase
            .from("student_arrears")
            .update({
                status: data.status,
                notes: data.notes,
                updated_at: new Date().toISOString(),
            })
            .eq("id", currentArrearToEdit.id);

        if (updateError) throw updateError;

        toast({ title: "Success", description: "Arrear details updated successfully." });
        if (isMounted.current) {
            setAllArrears(prev => 
                prev.map(ar => 
                    ar.id === currentArrearToEdit.id 
                    ? { ...ar, status: data.status, notes: data.notes, updated_at: new Date().toISOString() } 
                    : ar
                )
            );
        }
        setIsEditDialogOpen(false);
        setCurrentArrearToEdit(null);
    } catch (e: any) {
        console.error("Error updating arrear:", e);
        toast({ title: "Update Failed", description: `Could not update arrear: ${e.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsSubmittingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading student arrears data...</p>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Access Denied</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <BadgeDollarSign className="mr-3 h-8 w-8" /> Student Arrears Management
      </h2>
      <CardDescription>
        View and manage outstanding fee balances carried over from previous academic years. Data from `student_arrears` table.
      </CardDescription>

      {error && currentUser && (
         <Card className="border-amber-500 bg-amber-500/10 text-amber-700 my-4"><CardHeader><CardTitle className="flex items-center"><AlertCircle/>Notice</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>
      )}

      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center"><Filter className="mr-2 h-5 w-5" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search by Student Name/ID/Grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lg:col-span-2"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ARREAR_STATUSES.map(status => (
                <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Select value={yearFromFilter} onValueChange={setYearFromFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by Origin Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Origin Years</SelectItem>
              {uniqueAcademicYearsFrom.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={yearToFilter} onValueChange={setYearToFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by Carried-to Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carried-to Years</SelectItem>
              {uniqueAcademicYearsTo.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Arrears List</CardTitle>
          <CardDescription>
            Found {filteredArrears.length} arrear record(s) matching your criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredArrears.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No arrears found matching your current filters, or no arrears recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Grade (Current)</TableHead>
                    <TableHead>Arrear From (Year)</TableHead>
                    <TableHead>Carried To (Year)</TableHead>
                    <TableHead className="text-right">Amount (GHS)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArrears.map((arrear) => (
                    <TableRow key={arrear.id}>
                      <TableCell>{arrear.student_name}</TableCell>
                      <TableCell className="font-mono text-xs">{arrear.student_id_display}</TableCell>
                      <TableCell>{arrear.current_grade_level}</TableCell>
                      <TableCell>{arrear.academic_year_from}</TableCell>
                      <TableCell>{arrear.academic_year_to}</TableCell>
                      <TableCell className="text-right font-medium">{arrear.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          arrear.status === 'outstanding' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          arrear.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          arrear.status === 'cleared' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          arrear.status === 'waived' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {arrear.status.charAt(0).toUpperCase() + arrear.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={arrear.notes || undefined}>
                        {arrear.notes || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(arrear)} title="Edit Arrear Status/Notes" disabled={!currentUser}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Note: Arrears are automatically created during the academic year promotion process. 
          Payments made by students reduce their overall balance. To mark an arrear as "Cleared", ensure total payments cover it.
        </CardFooter>
      </Card>
       <Card className="shadow-md border-blue-500/30 bg-blue-500/5 mt-6">
        <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                <Info className="mr-2 h-5 w-5"/> About Arrears Management
            </CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-600 dark:text-blue-300">
                <li>This page shows outstanding balances carried forward from previous academic years.</li>
                <li>Payments recorded via "Record Payment" reduce a student's overall debt.</li>
                <li>Use the "Edit" button to update an arrear's status (e.g., to 'Cleared' or 'Waived') and add notes once payments cover the amount.</li>
            </ul>
        </CardContent>
      </Card>

      {currentArrearToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit Arrear for {currentArrearToEdit.student_name}</DialogTitle>
                    <DialogDescription>
                        Student ID: {currentArrearToEdit.student_id_display} | Arrear Amount: GHS {currentArrearToEdit.amount.toFixed(2)}
                    </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onSubmitEditArrear)} className="space-y-4 py-4">
                        <FormField
                            control={editForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ARREAR_STATUSES.map(status => (
                                                <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editForm.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Cleared via direct bank transfer, Waived due to scholarship" {...field} rows={3} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingEdit}>
                                {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
    
