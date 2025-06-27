
"use client";

import { useState, useEffect, type ReactNode, useRef } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADE_LEVELS, TERMS_ORDER } from "@/lib/constants";
import { DollarSign, PlusCircle, Edit, Trash2, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface FeeItem {
  id: string; // UUID from Supabase
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
  academic_year: string; 
  created_at?: string;
  updated_at?: string;
}

export default function FeeStructurePage() {
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentFee, setCurrentFee] = useState<Partial<FeeItem> & { id?: string } | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");


  useEffect(() => {
    isMounted.current = true;
    
    const fetchInitialData = async () => {
      if (!isMounted.current) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted.current) {
        setCurrentUser(session?.user || null);
        if (!session?.user) {
          setError("Admin authentication required to manage fee structures.");
          setIsLoading(false);
          return;
        }
        await fetchAppSettings(); // Fetches current academic year
        await fetchFees(); // Now uses currentSystemAcademicYear after fetchAppSettings completes
      }
    };

    const fetchAppSettings = async () => {
      if (!isMounted.current) return;
      try {
        const { data, error: settingsError } = await supabase
          .from("app_settings")
          .select("current_academic_year")
          .eq("id", 1)
          .single();
        
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

        if (isMounted.current) {
          if (data && data.current_academic_year) {
            setCurrentSystemAcademicYear(data.current_academic_year);
          } else {
            const fallbackYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
            setCurrentSystemAcademicYear(fallbackYear);
            console.warn("Could not fetch current academic year, using fallback:", fallbackYear);
          }
        }
      } catch (e: any) {
        const fallbackYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) setCurrentSystemAcademicYear(fallbackYear);
        console.error("Error fetching app settings for fees page:", e);
        toast({ title: "Warning", description: `Could not fetch current academic year setting: ${e.message}. Defaulting to ${fallbackYear}.`, variant: "default" });
      }
    };

    const fetchFees = async () => {
      if (!isMounted.current) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data: rawData, error: fetchError } = await supabase
          .from("school_fee_items")
          .select("id, grade_level, term, description, amount, academic_year, created_at, updated_at")
          .order("academic_year", { ascending: false })
          .order("grade_level", { ascending: true })
          .order("term", { ascending: true })
          .order("description", { ascending: true });

        if (fetchError) throw fetchError;
        if (isMounted.current) {
            const mappedFees: FeeItem[] = (rawData || []).map(item => ({
                id: item.id,
                gradeLevel: item.grade_level, 
                term: item.term,
                description: item.description,
                amount: item.amount,
                academic_year: item.academic_year || currentSystemAcademicYear, // Fallback if null
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
            setFees(mappedFees);
        }
      } catch (e: any) {
        console.error("Error fetching fee items from Supabase:", e);
        if (isMounted.current) setError(`Failed to load fee structure: ${e.message}`);
        toast({ title: "Error", description: `Could not fetch fee structure from Supabase: ${e.message}`, variant: "destructive" });
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };
    
    fetchInitialData();

    return () => { isMounted.current = false; };
  }, [supabase, toast]); 

  const handleDialogOpen = (mode: "add" | "edit", fee?: FeeItem) => {
    if (!currentUser) {
        toast({title: "Authentication Error", description: "You must be logged in as an admin.", variant: "destructive"});
        return;
    }
    setDialogMode(mode);
    setCurrentFee(fee ? { ...fee } : { amount: 0, gradeLevel: '', term: '', description: '', academic_year: currentSystemAcademicYear });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentFee(null);
  };

  const handleSaveFee = async () => {
    if (!currentUser) {
        toast({title: "Authentication Error", description: "Admin action required.", variant: "destructive"});
        return;
    }
    if (!currentFee || !currentFee.gradeLevel || !currentFee.term || !currentFee.description || !currentFee.academic_year || currentFee.amount == null || currentFee.amount < 0) {
       toast({ title: "Error", description: "All fields including Academic Year are required and amount must be non-negative.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}-\d{4}$/.test(currentFee.academic_year)) {
        toast({ title: "Error", description: "Academic Year must be in YYYY-YYYY format (e.g., 2023-2024).", variant: "destructive" });
        return;
    }

    const feeDataToSave = {
      grade_level: currentFee.gradeLevel,
      term: currentFee.term,
      description: currentFee.description,
      amount: currentFee.amount,
      academic_year: currentFee.academic_year,
    };

    try {
      if (dialogMode === "add") {
        const { data: newRawFeeData, error: insertError } = await supabase
          .from("school_fee_items")
          .insert([feeDataToSave])
          .select("id, grade_level, term, description, amount, academic_year, created_at, updated_at")
          .single();
        if (insertError) throw insertError;
        if (isMounted.current && newRawFeeData) {
            const newFeeData: FeeItem = {
                id: newRawFeeData.id,
                gradeLevel: newRawFeeData.grade_level,
                term: newRawFeeData.term,
                description: newRawFeeData.description,
                amount: newRawFeeData.amount,
                academic_year: newRawFeeData.academic_year,
                created_at: newRawFeeData.created_at,
                updated_at: newRawFeeData.updated_at,
            };
            setFees(prev => [...prev, newFeeData].sort((a,b) => (a.academic_year.localeCompare(b.academic_year)) || (a.gradeLevel || "").localeCompare(b.gradeLevel || "") || a.term.localeCompare(b.term) || a.description.localeCompare(b.description)));
        }
        toast({ title: "Success", description: "Fee item added to Supabase." });
      } else if (currentFee.id) {
        const { data: updatedRawFeeData, error: updateError } = await supabase
          .from("school_fee_items")
          .update(feeDataToSave)
          .eq("id", currentFee.id)
          .select("id, grade_level, term, description, amount, academic_year, created_at, updated_at")
          .single();
        if (updateError) throw updateError;
        if (isMounted.current && updatedRawFeeData) {
            const updatedFeeData: FeeItem = {
                id: updatedRawFeeData.id,
                gradeLevel: updatedRawFeeData.grade_level,
                term: updatedRawFeeData.term,
                description: updatedRawFeeData.description,
                amount: updatedRawFeeData.amount,
                academic_year: updatedRawFeeData.academic_year,
                created_at: updatedRawFeeData.created_at,
                updated_at: updatedRawFeeData.updated_at,
            };
            setFees(prev => prev.map(f => f.id === updatedFeeData.id ? updatedFeeData : f).sort((a,b) => (a.academic_year.localeCompare(b.academic_year)) || (a.gradeLevel || "").localeCompare(b.gradeLevel || "") || a.term.localeCompare(b.term) || a.description.localeCompare(b.description)));
        }
        toast({ title: "Success", description: "Fee item updated in Supabase." });
      }
      handleDialogClose();
    } catch (e: any) {
      let userMessage = "Could not save fee item.";
      
      console.error("--- Error saving fee item to Supabase ---");
      if (dialogMode === "edit" && currentFee) {
        console.error("Attempted to edit fee item with data:", JSON.stringify(currentFee, null, 2));
        console.error("Data sent to Supabase (feeDataToSave):", JSON.stringify(feeDataToSave, null, 2));
      } else if (dialogMode === "add" && currentFee) { 
        console.error("Attempted to add fee item with form data (pre-transformation):", JSON.stringify(currentFee, null, 2));
        console.error("Data sent to Supabase (feeDataToSave):", JSON.stringify(feeDataToSave, null, 2));
      }

      if (e && typeof e === 'object') {
        if (e.message && typeof e.message === 'string' && e.message.trim() !== "") {
          console.error("Message:", e.message);
          userMessage += ` Reason: ${e.message}`;
          if (e.message.includes("JSON object requested, multiple (or no) rows returned")) {
            userMessage = `Database Error: "JSON object requested, multiple (or no) rows returned". This error often means the database operation (like add/edit) succeeded, but Row Level Security (RLS) policies are PREVENTING THE APP FROM READING the record back. Please check your RLS SELECT policy on the 'school_fee_items' table. Ensure it allows viewing of newly inserted/updated records by the admin user. If editing, also verify the item ID exists. Original Supabase message: ${e.message}`;
          }
        } else {
          console.error("Error object does not contain a standard 'message' property or it's empty.");
        }
        if (e.code) console.error("Code:", e.code);
        if (e.details) console.error("Details:", e.details);
        if (e.hint) console.error("Hint:", e.hint);
        if (e.stack) console.error("Stack (first few lines):", String(e.stack).split('\n').slice(0,5).join('\n'));
        
        if (!e.message && !e.code) {
            console.error("Full error object (inspect in browser console):", e);
        }
      } else {
        console.error("Raw error value (not an object):", e);
        if (e) {
            userMessage += ` Reason: ${String(e)}`;
        } else {
            userMessage += " An unexpected non-object error occurred."
        }
      }
      console.error("--- End of error details ---");

      toast({ 
        title: "Database Error", 
        description: userMessage, 
        variant: "destructive",
        duration: 12000 
      });
    }
  };
  
  const handleDeleteFee = async (id: string) => {
    if (!currentUser) {
        toast({title: "Authentication Error", description: "Admin action required.", variant: "destructive"});
        return;
    }
    try {
      const { error: deleteError } = await supabase
        .from("school_fee_items")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      if (isMounted.current) setFees(prev => prev.filter(f => f.id !== id));
      toast({ title: "Success", description: "Fee item deleted from Supabase." });
    } catch (e: any) {
      console.error("Error deleting fee item from Supabase:", e);
      toast({ title: "Database Error", description: `Could not delete fee item: ${e.message}`, variant: "destructive" });
    }
  };

  const renderDialogContent = (): ReactNode => (
    <>
      <DialogHeader>
        <DialogTitle>{dialogMode === "add" ? "Add New Fee Item" : "Edit Fee Item"}</DialogTitle>
        <DialogDescription>
          Configure fee details for different grade levels and terms. Saves to Supabase.
          Ensure your `school_fee_items` table has an `academic_year` (TEXT) column.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="academicYear" className="text-right flex items-center">
            <CalendarDays className="inline h-4 w-4 mr-1"/> Acad. Year
          </Label>
          <Input 
            id="academicYear" 
            value={currentFee?.academic_year || ""} 
            onChange={(e) => setCurrentFee(prev => ({ ...prev, academic_year: e.target.value }))}
            className="col-span-3" 
            placeholder="e.g., 2024-2025"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="gradeLevel" className="text-right">Grade Level</Label>
          <Select
            value={currentFee?.gradeLevel}
            onValueChange={(value) => setCurrentFee(prev => ({ ...prev, gradeLevel: value }))}
          >
            <SelectTrigger className="col-span-3" id="gradeLevel">
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="term" className="text-right">Term</Label>
          <Select
            value={currentFee?.term}
            onValueChange={(value) => setCurrentFee(prev => ({ ...prev, term: value }))}
          >
            <SelectTrigger className="col-span-3" id="term">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {TERMS_ORDER.map(term => (
                <SelectItem key={term} value={term}>{term}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Description</Label>
          <Input 
            id="description" 
            value={currentFee?.description || ""} 
            onChange={(e) => setCurrentFee(prev => ({ ...prev, description: e.target.value }))}
            className="col-span-3"
            placeholder="e.g., Tuition Fee, Books, Balance c/f"
           />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">Amount (GHS)</Label>
          <Input 
            id="amount" 
            type="number" 
            value={currentFee?.amount === undefined ? "" : currentFee.amount} 
            onChange={(e) => setCurrentFee(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="col-span-3"
            min="0"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
        <Button onClick={handleSaveFee}>Save Fee</Button>
      </DialogFooter>
    </>
  );

  if (!currentUser && !isLoading) {
    return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Access Denied</CardTitle></CardHeader>
            <CardContent>
                <p>{error || "You must be logged in as an admin to view and manage fee structures."}</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <DollarSign className="mr-2 h-8 w-8" /> Fee Structure Management
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen("add")} disabled={!currentUser || isLoading || !currentSystemAcademicYear}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Fee Item
            </Button>
          </DialogTrigger>
          {currentUser && isDialogOpen && (
            <DialogContent className="sm:max-w-[525px]">
              {renderDialogContent()}
            </DialogContent>
          )}
        </Dialog>
      </div>

      {error && !isLoading && (
        <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Fee Structure (from Supabase)</CardTitle>
          <CardDescription>Ensure your `school_fee_items` table has an `academic_year` column.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading fee structure from Supabase...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acad. Year</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Term/Period</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount (GHS)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No fee items configured in Supabase yet. Click "Add New Fee Item" to begin.
                    </TableCell>
                  </TableRow>
                )}
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>{fee.academic_year || "N/A"}</TableCell>
                    <TableCell>{fee.gradeLevel || "N/A"}</TableCell> 
                    <TableCell>{fee.term}</TableCell>
                    <TableCell>{fee.description}</TableCell>
                    <TableCell className="text-right">{fee.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen("edit", fee)} disabled={!currentUser}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteFee(fee.id)} className="text-destructive hover:text-destructive/80" disabled={!currentUser}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
