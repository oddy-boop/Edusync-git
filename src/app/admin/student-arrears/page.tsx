
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Search, Filter, Edit, DollarSign, BadgeDollarSign, Info, Save, Receipt as ReceiptIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { PaymentReceipt, type PaymentDetailsForReceipt } from "@/components/shared/PaymentReceipt";
import { useAuth } from "@/lib/auth-context";
import { getArrears, updateArrear, deleteArrear } from "@/lib/actions/arrears.actions";
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

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
  teacher_id?: string; 
}

interface StudentForJoin {
  student_id_display: string;
  full_name: string;
  grade_level: string; 
}

interface DisplayArrear extends StudentArrear {
  current_grade_level?: string; 
}

interface AppSettingsForReceipt {
  school_name: string | null;
  school_address: string | null;
  school_logo_url: string | null;
}

const arrearEditSchema = z.object({
  status: z.string().min(1, "Status is required."),
  notes: z.string().optional(),
  amountPaidNow: z.coerce.number().nonnegative("Amount must be non-negative.").optional(),
});
type ArrearEditFormData = z.infer<typeof arrearEditSchema>;

const ARREAR_STATUSES = ["outstanding", "partially_paid", "cleared", "waived"];

const defaultSchoolBranding: AppSettingsForReceipt = {
    school_name: "School",
    school_address: "Location not set",
    school_logo_url: "https://placehold.co/150x80.png"
};

export default function StudentArrearsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);
  const { user: currentUser, schoolId, role, isLoading: isAuthLoading } = useAuth();

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

  const [schoolBranding, setSchoolBranding] = useState<AppSettingsForReceipt>(defaultSchoolBranding);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [lastArrearPaymentForReceipt, setLastArrearPaymentForReceipt] = useState<PaymentDetailsForReceipt | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [arrearToDelete, setArrearToDelete] = useState<DisplayArrear | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const uniqueAcademicYearsFrom = Array.from(new Set(allArrears.map(a => a.academic_year_from))).sort().reverse();
  const uniqueAcademicYearsTo = Array.from(new Set(allArrears.map(a => a.academic_year_to))).sort().reverse();

  const editForm = useForm<ArrearEditFormData>({
    resolver: zodResolver(arrearEditSchema),
    defaultValues: { status: "outstanding", notes: "", amountPaidNow: undefined },
  });

  const fetchArrearsData = async () => {
     if (!isMounted.current) return;
     const result = await getArrears();
     if(isMounted.current){
         if(result.success) {
            setAllArrears(result.data as DisplayArrear[]);
         } else {
            setError(prev => prev ? `${prev}\nFailed to refresh arrears: ${result.message}` : `Failed to refresh arrears: ${result.message}`);
         }
     }
  };

  useEffect(() => {
    isMounted.current = true;
    
    if (isAuthLoading) return;
    
    const fetchInitialData = async () => {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);

      if (!currentUser) {
        if(isMounted.current) setError("Admin authentication required.");
        setIsLoading(false);
        setIsLoadingBranding(false);
        return;
      }
      
      // Super admins don't manage individual school data directly on this page.
      if (!schoolId && role !== 'super_admin') {
          setError("User not associated with a school.");
          setIsLoading(false);
          setIsLoadingBranding(false);
          return;
      }

      if (schoolId) {
        setIsLoadingBranding(true);
    const brandingResult = await getSchoolBrandingAction();
     if (isMounted.current) {
      if(brandingResult && brandingResult.data){
        setSchoolBranding(brandingResult.data);
      }
      setIsLoadingBranding(false);
    }
        
        await fetchArrearsData();
      }

      if (isMounted.current) setIsLoading(false);
    };

    fetchInitialData();
    return () => { isMounted.current = false; };
  }, [currentUser, schoolId, isAuthLoading, role]);


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
    setCurrentArrearToEdit({
        ...arrear,
        amount: Number(arrear.amount) 
    });
    editForm.reset({
        status: arrear.status,
        notes: arrear.notes || "",
        amountPaidNow: undefined, 
    });
    setLastArrearPaymentForReceipt(null); 
    setIsEditDialogOpen(true);
  };

  const onSubmitEditArrear = async (data: ArrearEditFormData) => {
    if (!currentArrearToEdit || !currentArrearToEdit.id) {
      toast({ title: "Error", description: "No arrear selected or arrear ID missing.", variant: "destructive" });
      return;
    }
    setIsSubmittingEdit(true);
    
    const result = await updateArrear({
        arrearId: currentArrearToEdit.id,
        originalArrearAmount: currentArrearToEdit.amount,
        ...data
    });
    
    if(result.success) {
      toast({ title: "Arrear Updated", description: result.message });
      if (isMounted.current) {
        await fetchArrearsData();
        if(result.receiptData) {
            setLastArrearPaymentForReceipt(result.receiptData);
        } else {
            setIsEditDialogOpen(false);
            setCurrentArrearToEdit(null);
        }
      }
    } else {
        toast({ title: "Operation Failed", description: result.message, variant: "destructive", duration: 10000 });
    }

    setIsSubmittingEdit(false);
  };

  const handleOpenDeleteDialog = (arrear: DisplayArrear) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Admin action required.", variant: "destructive" });
      return;
    }
    setArrearToDelete(arrear);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteArrear = async () => {
    if (!arrearToDelete) return;
    setIsSubmittingDelete(true);
    
    const result = await deleteArrear(arrearToDelete.id);
    
    if(result.success) {
      toast({ title: "Success", description: result.message });
      if (isMounted.current) {
        await fetchArrearsData();
      }
    } else {
      toast({ title: "Delete Failed", description: result.message, variant: "destructive" });
    }

    if (isMounted.current) {
        setIsSubmittingDelete(false);
        setIsDeleteDialogOpen(false);
        setArrearToDelete(null);
    }
  };


  if (isLoading || isLoadingBranding || isAuthLoading) {
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
  
  if (role === 'super_admin') {
    return (
        <Card className="shadow-lg border-blue-500/30 bg-blue-500/5">
            <CardHeader>
                <CardTitle className="flex items-center text-blue-800"><Info className="mr-2 h-6 w-6"/> Super Admin View</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-blue-800">
                    This page is for managing arrears for a specific school. As a super admin, you can manage this data for any school by visiting the "Schools" management page and navigating to the desired branch's portal.
                </p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <BadgeDollarSign className="mr-3 h-8 w-8" /> Student Arrears Management
          </h2>
          <CardDescription className="mt-1">
            View and manage outstanding fee balances carried over from previous academic years.
          </CardDescription>
        </div>
      </div>
      
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
                    <TableHead className="text-right">Outstanding Amt. (GHS)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
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
                      <TableCell className="text-right font-medium">{Number(arrear.amount).toFixed(2)}</TableCell>
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
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(arrear)} title="Edit Arrear Status/Notes & Record Payment" disabled={!currentUser}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(arrear)} title="Delete Arrear Record" disabled={!currentUser} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
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
          Note: Arrears are automatically created when the academic year is changed in settings.
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
                <li>The 'Outstanding Amt.' column reflects the current remaining balance for that specific arrear.</li>
                <li>Use the "Edit" button to record a payment specifically for an arrear, update its status (e.g., to 'Cleared' or 'Waived'), and add notes.</li>
                <li>Recording a payment here will also generate a receipt and deduct the paid amount from the arrear's 'Outstanding Amt.'.</li>
                 <li>The "Delete" button removes the arrear record. Use this if the arrear is fully cleared or was an error.</li>
            </ul>
        </CardContent>
      </Card>

      {currentArrearToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) {
                setCurrentArrearToEdit(null);
                setLastArrearPaymentForReceipt(null); 
            }
        }}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit Arrear for {currentArrearToEdit.student_name}</DialogTitle>
                    <DialogDescription>
                        Student ID: {currentArrearToEdit.student_id_display} | Current Outstanding: GHS {Number(currentArrearToEdit.amount).toFixed(2)}
                    </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onSubmitEditArrear)} className="space-y-4 py-4">
                         <FormField
                            control={editForm.control}
                            name="amountPaidNow"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Paid Now (GHS)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                    field.onChange(undefined);
                                                } else {
                                                    const num = parseFloat(val);
                                                    field.onChange(isNaN(num) ? undefined : num);
                                                }
                                            }}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            step="0.01"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                            <Button type="button" variant="outline" onClick={() => {
                                setIsEditDialogOpen(false);
                                setCurrentArrearToEdit(null);
                                setLastArrearPaymentForReceipt(null);
                            }}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingEdit}>
                                {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Update Arrear & Record Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
                {lastArrearPaymentForReceipt && (
                    <div className="mt-6">
                        <PaymentReceipt paymentDetails={lastArrearPaymentForReceipt} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
      )}

      {arrearToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Arrear Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the arrear record for {arrearToDelete.student_name} (Amount: GHS {Number(arrearToDelete.amount).toFixed(2)})? 
                This action is permanent and cannot be undone. Ensure any related payments are correctly accounted for elsewhere if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setArrearToDelete(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteArrear}
                disabled={isSubmittingDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isSubmittingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Yes, Delete Arrear Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    