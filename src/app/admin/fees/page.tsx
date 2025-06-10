
"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import { GRADE_LEVELS, SCHOOL_FEE_STRUCTURE_KEY } from "@/lib/constants";
import { DollarSign, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface FeeItem {
  id: string;
  gradeLevel: string;
  term: string; // e.g., "Term 1", "Term 2", "Annual"
  description: string;
  amount: number;
}

export default function FeeStructurePage() {
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentFee, setCurrentFee] = useState<Partial<FeeItem> | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFees = localStorage.getItem(SCHOOL_FEE_STRUCTURE_KEY);
      if (storedFees) {
        setFees(JSON.parse(storedFees));
      }
    }
  }, []);

  const saveFeesToLocalStorage = (updatedFees: FeeItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCHOOL_FEE_STRUCTURE_KEY, JSON.stringify(updatedFees));
    }
  };

  const handleDialogOpen = (mode: "add" | "edit", fee?: FeeItem) => {
    setDialogMode(mode);
    setCurrentFee(fee || { amount: 0, gradeLevel: '', term: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCurrentFee(null);
  };

  const handleSaveFee = () => {
    if (!currentFee || !currentFee.gradeLevel || !currentFee.term || !currentFee.description || currentFee.amount == null || currentFee.amount < 0) {
       toast({ title: "Error", description: "All fields are required and amount must be non-negative.", variant: "destructive" });
      return;
    }

    let updatedFees;
    if (dialogMode === "add") {
      const newFee = { ...currentFee, id: Date.now().toString() } as FeeItem;
      updatedFees = [...fees, newFee];
      toast({ title: "Success", description: "Fee item added successfully." });
    } else if (currentFee.id) {
      updatedFees = fees.map(f => f.id === currentFee!.id ? { ...f, ...currentFee } as FeeItem : f);
      toast({ title: "Success", description: "Fee item updated successfully." });
    } else {
      return; // Should not happen
    }
    setFees(updatedFees);
    saveFeesToLocalStorage(updatedFees);
    handleDialogClose();
  };
  
  const handleDeleteFee = (id: string) => {
    const updatedFees = fees.filter(f => f.id !== id);
    setFees(updatedFees);
    saveFeesToLocalStorage(updatedFees);
    toast({ title: "Success", description: "Fee item deleted successfully." });
  };


  const renderDialogContent = (): ReactNode => (
    <>
      <DialogHeader>
        <DialogTitle>{dialogMode === "add" ? "Add New Fee Item" : "Edit Fee Item"}</DialogTitle>
        <DialogDescription>
          Configure fee details for different grade levels and terms.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
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
          <Label htmlFor="term" className="text-right">Term/Period</Label>
          <Input 
            id="term" 
            value={currentFee?.term || ""} 
            onChange={(e) => setCurrentFee(prev => ({ ...prev, term: e.target.value }))}
            className="col-span-3" 
            placeholder="e.g., Term 1, Annual"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Description</Label>
          <Input 
            id="description" 
            value={currentFee?.description || ""} 
            onChange={(e) => setCurrentFee(prev => ({ ...prev, description: e.target.value }))}
            className="col-span-3"
            placeholder="e.g., Tuition Fee, Books"
           />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">Amount (GHS)</Label>
          <Input 
            id="amount" 
            type="number" 
            value={currentFee?.amount || ""} 
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


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <DollarSign className="mr-2 h-8 w-8" /> Fee Structure Management
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogOpen("add")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Fee Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Current Fee Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    No fee items configured yet. Click "Add New Fee Item" to begin.
                  </TableCell>
                </TableRow>
              )}
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>{fee.gradeLevel}</TableCell>
                  <TableCell>{fee.term}</TableCell>
                  <TableCell>{fee.description}</TableCell>
                  <TableCell className="text-right">{fee.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen("edit", fee)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => handleDeleteFee(fee.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

