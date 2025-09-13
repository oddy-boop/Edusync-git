
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
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getPlatformPricingByGrade } from "@/lib/actions/platform-pricing.actions";


interface FeeItem {
  id: string; // UUID from database
  gradeLevel: string;
  term: string;
  description: string;
  amount: number;
  platform_fee?: number; // Platform fee amount
  total_fee?: number; // Total fee (school + platform)
  academic_year: string; 
  created_at?: string;
  updated_at?: string;
}

export default function FeeStructurePage() {
  const { user: authUser, schoolId } = useAuth();
  const supabase = createClient();
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentFee, setCurrentFee] = useState<Partial<FeeItem> & { id?: string } | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const { toast } = useToast();
  const isMounted = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [platformFees, setPlatformFees] = useState<Record<string, number>>({});
  const [isLoadingPlatformFee, setIsLoadingPlatformFee] = useState(false);
  
  // Function to get platform fee for a grade level
  const getPlatformFee = async (gradeLevel: string, academicYear: string) => {
    const key = `${gradeLevel}-${academicYear}`;
    
    // Return cached value if available
    if (platformFees[key] !== undefined) {
      return platformFees[key];
    }
    
    try {
      const result = await getPlatformPricingByGrade(gradeLevel, academicYear);
      const fee = result.success && result.data ? result.data.platform_fee : 0;
      
      // Cache the result
      setPlatformFees(prev => ({ ...prev, [key]: fee }));
      return fee;
    } catch (error) {
      console.error('Error fetching platform fee:', error);
      return 0;
    }
  };
  
  const fetchFees = async () => {
    if (!isMounted.current || !schoolId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: rawData, error: fetchError } = await supabase
        .from("school_fees")
        .select("id, grade_level, term, description, amount, platform_fee, total_fee, academic_year, created_at, updated_at")
        .eq('school_id', schoolId)
        .order("academic_year", { ascending: false })
        .order("grade_level", { ascending: true })
        .order("term", { ascending: true })
        .order("description", { ascending: true });

      if(fetchError) throw fetchError;

      if (isMounted.current) {
          const mappedFees: FeeItem[] = (rawData || []).map((item) => ({
              id: item.id,
              gradeLevel: item.grade_level, 
              term: item.term,
              description: item.description,
              amount: item.amount,
              platform_fee: item.platform_fee || 0,
              total_fee: item.total_fee || item.amount,
              academic_year: item.academic_year || currentSystemAcademicYear,
              created_at: item.created_at,
              updated_at: item.updated_at,
          }));
          setFees(mappedFees);
      }
    } catch (e: any) {
      console.error("Error fetching fee items:", e);
      if (isMounted.current) setError(`Failed to load fee structure: ${e.message}`);
      toast({ title: "Error", description: `Could not fetch fee structure: ${e.message}`, variant: "destructive", duration: 9000 });
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };


  useEffect(() => {
    isMounted.current = true;
    
    const fetchInitialData = async () => {
      if (!isMounted.current || !schoolId) {
        if(!schoolId && authUser) setIsLoading(false);
        return
      };
      
      try {
        const { data, error: settingsError } = await supabase.from("schools").select("current_academic_year").eq("id", schoolId).single();
        if(settingsError) throw settingsError;

        if(isMounted.current){
          setCurrentSystemAcademicYear(data?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
        }
      } catch (e: any) {
         if (isMounted.current) {
           setCurrentSystemAcademicYear(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
           toast({ title: "Warning", description: `Could not fetch current academic year setting. Defaulting to current year.`, variant: "default" });
         }
      }

      await fetchFees(); 
    };
    
    if (authUser && schoolId) {
      fetchInitialData();
    } else {
        setIsLoading(false);
    }

    return () => { isMounted.current = false; };
  }, [authUser, schoolId, supabase]); 

  const handleDialogOpen = async (mode: "add" | "edit", fee?: FeeItem) => {
    if (!authUser || !schoolId) {
        toast({title: "Authentication Error", description: "You must be logged in as an admin.", variant: "destructive"});
        return;
    }
    setDialogMode(mode);
    
    const newFee = fee ? { ...fee } : { 
      amount: 0, 
      gradeLevel: '', 
      term: '', 
      description: '', 
      academic_year: currentSystemAcademicYear,
      platform_fee: 0,
      total_fee: 0
    };
    
    setCurrentFee(newFee);
    setIsDialogOpen(true);
    
    // If editing an existing fee or grade level is already selected, get platform fee
    if (newFee.gradeLevel) {
      const platformFee = await getPlatformFee(newFee.gradeLevel, newFee.academic_year);
      setCurrentFee(prev => prev ? {
        ...prev,
        platform_fee: platformFee,
        total_fee: (prev.amount || 0) + platformFee
      } : null);
    }
  };

  // Handler for when grade level or amount changes in the dialog
  const handleFeeFieldChange = async (field: string, value: any) => {
    if (!currentFee) return;
    
    const updatedFee = { ...currentFee, [field]: value };
    
    // If grade level or academic year changed, fetch new platform fee
    if (field === 'gradeLevel' || field === 'academic_year') {
      if (updatedFee.gradeLevel && updatedFee.academic_year) {
        setIsLoadingPlatformFee(true);
        const platformFee = await getPlatformFee(updatedFee.gradeLevel, updatedFee.academic_year);
        updatedFee.platform_fee = platformFee;
        updatedFee.total_fee = (updatedFee.amount || 0) + platformFee;
        setIsLoadingPlatformFee(false);
      }
    } else if (field === 'amount') {
      // If amount changed, recalculate total
      updatedFee.total_fee = (value || 0) + (updatedFee.platform_fee || 0);
    }
    
    setCurrentFee(updatedFee);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentFee(null);
  };

  const handleSaveFee = async () => {
    if (!authUser || !schoolId) {
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
    
    const { dismiss } = toast({ title: "Saving Fee Item...", description: "Please wait." });

    try {
      if (dialogMode === "add") {
        const { error } = await supabase
            .from('school_fees')
            .insert({
                school_id: schoolId,
                grade_level: currentFee.gradeLevel,
                term: currentFee.term,
                description: currentFee.description,
                amount: currentFee.amount,
                academic_year: currentFee.academic_year
            });
        if(error) throw error;
        dismiss();
        toast({ title: "Success", description: "Fee item added." });
      } else if (currentFee.id) {
        const { error } = await supabase
            .from('school_fees')
            .update({
                grade_level: currentFee.gradeLevel,
                term: currentFee.term,
                description: currentFee.description,
                amount: currentFee.amount,
                academic_year: currentFee.academic_year
            })
            .eq('id', currentFee.id)
            .eq('school_id', schoolId);
        if(error) throw error;
        dismiss();
        toast({ title: "Success", description: "Fee item updated." });
      }

      await fetchFees();
      handleDialogClose();

    } catch (e: any) {
      dismiss();
      toast({ 
        title: "Database Error", 
        description: `Could not save fee item: ${e.message}`, 
        variant: "destructive",
        duration: 12000 
      });
    }
  };
  
  const handleDeleteFee = async (id: string) => {
    if (!authUser || !schoolId) {
        toast({title: "Authentication Error", description: "Admin action required.", variant: "destructive"});
        return;
    }
    
    const { dismiss } = toast({ title: "Deleting Fee Item...", description: "Please wait." });
    try {
        const { error } = await supabase
            .from('school_fees')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);
        if(error) throw error;
      dismiss();
      if (isMounted.current) {
        await fetchFees();
      }
      toast({ title: "Success", description: "Fee item deleted." });
    } catch (e: any) {
      dismiss();
      toast({ title: "Database Error", description: `Could not delete fee item: ${e.message}`, variant: "destructive" });
    }
  };

  const renderDialogContent = (): ReactNode => (
    <>
      <DialogHeader>
        <DialogTitle>{dialogMode === "add" ? "Add New Fee Item" : "Edit Fee Item"}</DialogTitle>
        <DialogDescription>
          Configure fee details for different grade levels and terms. Platform fees are automatically added.
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
            onChange={(e) => handleFeeFieldChange('academic_year', e.target.value)}
            className="col-span-3" 
            placeholder="e.g., 2024-2025"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="gradeLevel" className="text-right">Grade Level</Label>
          <Select
            value={currentFee?.gradeLevel}
            onValueChange={(value) => handleFeeFieldChange('gradeLevel', value)}
          >
            <SelectTrigger className="col-span-3" id="gradeLevel">
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="term" className="text-right">Term</Label>
          <Select
            value={currentFee?.term}
            onValueChange={(value) => handleFeeFieldChange('term', value)}
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
            onChange={(e) => handleFeeFieldChange('description', e.target.value)}
            className="col-span-3"
            placeholder="e.g., Tuition Fee, Books, Balance c/f"
           />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">School Fee (GHS)</Label>
          <Input 
            id="amount" 
            type="number" 
            value={currentFee?.amount === undefined ? "" : currentFee.amount} 
            onChange={(e) => handleFeeFieldChange('amount', parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
            placeholder="Enter your school's fee amount"
          />
        </div>
        
        {/* Platform Fee Display */}
        {currentFee?.gradeLevel && (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">Platform Fee (GHS)</Label>
              <div className="col-span-3 flex items-center">
                {isLoadingPlatformFee ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <Input 
                    value={currentFee?.platform_fee?.toFixed(2) || "0.00"} 
                    disabled 
                    className="bg-muted font-medium"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold">Total Fee (GHS)</Label>
              <div className="col-span-3">
                <Input 
                  value={currentFee?.total_fee?.toFixed(2) || "0.00"} 
                  disabled 
                  className="bg-blue-50 font-bold text-blue-900 border-blue-200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is what students will pay (School Fee + Platform Fee)
                </p>
              </div>
            </div>
          </>
        )}
        
        {currentFee?.gradeLevel && currentFee?.platform_fee === 0 && (
          <div className="col-span-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              No platform fee set for {currentFee.gradeLevel}. Contact the super administrator to set platform pricing.
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
        <Button onClick={handleSaveFee}>Save Fee</Button>
      </DialogFooter>
    </>
  );

  if (!authUser && !isLoading) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <DollarSign className="mr-2 h-8 w-8" /> Fee Structure Management
          </h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen("add")} disabled={!authUser || isLoading || !currentSystemAcademicYear} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Fee Item
            </Button>
          </DialogTrigger>
          {authUser && isDialogOpen && (
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
          <CardTitle>Current Fee Structure</CardTitle>
          <CardDescription>A list of all configured fee items for the school, ordered by academic year.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading fee structure...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acad. Year</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Term/Period</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">School Fee (GHS)</TableHead>
                    <TableHead className="text-right">Platform Fee (GHS)</TableHead>
                    <TableHead className="text-right">Total Fee (GHS)</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        No fee items configured yet. Click "Add New Fee Item" to begin.
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
                      <TableCell className="text-right text-blue-600">{(fee.platform_fee || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{(fee.total_fee || fee.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDialogOpen("edit", fee)} disabled={!authUser}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFee(fee.id)} className="text-destructive hover:text-destructive/80" disabled={!authUser}>
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
      </Card>
    </div>
  );
}
