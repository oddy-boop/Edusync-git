
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Search, Filter, Edit, DollarSign, BadgeDollarSign, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { format } from "date-fns";

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

  const uniqueAcademicYearsFrom = Array.from(new Set(allArrears.map(a => a.academic_year_from))).sort().reverse();
  const uniqueAcademicYearsTo = Array.from(new Set(allArrears.map(a => a.academic_year_to))).sort().reverse();


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
          student_name: studentsMap[arrear.student_id_display]?.full_name || arrear.student_name || 'N/A', // Use fetched name, fallback to stored, then N/A
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


  // Placeholder for edit functionality
  const handleEditArrear = (arrear: DisplayArrear) => {
    toast({ title: "Edit Arrear (Placeholder)", description: `Editing arrear for ${arrear.student_name}. Amount: GHS ${arrear.amount}. Feature coming soon.`});
    // Implement dialog and form for editing: status, notes, potentially amount (with caution)
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
              <SelectItem value="outstanding">Outstanding</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
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
                          arrear.status === 'outstanding' ? 'bg-red-100 text-red-700' :
                          arrear.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                          arrear.status === 'cleared' ? 'bg-green-100 text-green-700' :
                          arrear.status === 'waived' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {arrear.status.charAt(0).toUpperCase() + arrear.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditArrear(arrear)} title="Edit Arrear Status/Notes">
                          <Edit className="h-4 w-4" />
                        </Button>
                         {/* Future: Delete button with confirmation */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Note: Arrears are automatically created during the academic year promotion process if a student has an outstanding balance from the previous year. 
          Payments made by students are typically applied to their overall outstanding balance, which would include current year fees and any arrears.
          To clear arrears, ensure total payments cover both current fees and these brought-forward amounts. Then, update the status here.
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
                <li>This page shows outstanding balances that were automatically carried forward from previous academic years during the student promotion process.</li>
                <li>When students make payments via the "Record Payment" page, those payments reduce their overall debt.</li>
                <li>To mark an arrear here as "Cleared" or "Partially Paid", first ensure sufficient payments have been recorded to cover the arrear amount (in addition to current year fees).</li>
                <li>The "Edit" button (when fully implemented) will allow you to update the status of an arrear (e.g., to 'Cleared' or 'Waived') and add notes.</li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
    