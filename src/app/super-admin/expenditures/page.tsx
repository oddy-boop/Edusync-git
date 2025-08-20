
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, Filter, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";

interface Expenditure {
  id: string;
  amount: number;
  category: string;
  date: Date;
  description: string;
  school_id: number;
  schools: { name: string } | null;
}

export default function SuperAdminExpendituresPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { role, isLoading: isAuthLoading } = useAuth();

  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [schools, setSchools] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSchool, setFilterSchool] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data: schoolsData, error: schoolsError } = await supabase.from('schools').select('id, name');
        if (schoolsError) throw schoolsError;
        setSchools(schoolsData || []);

        const { data: expData, error: expError } = await supabase
            .from("expenditures")
            .select("*, schools(name)")
            .order("date", { ascending: false });

        if (expError) throw expError;
        setExpenditures((expData || []).map(item => ({ ...item, date: new Date(item.date) })));
    } catch (e: any) {
      toast({ title: "Error", description: `Could not fetch data: ${e.message}`, variant: "destructive" });
      setError(`Could not fetch data: ${e.message}`);
    }
    setIsLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    if (!isAuthLoading && role === 'super_admin') {
      fetchData();
    }
  }, [fetchData, isAuthLoading, role]);

  const filteredExpenditures = useMemo(() => {
    if (filterSchool === "all") {
      return expenditures;
    }
    return expenditures.filter(exp => exp.school_id.toString() === filterSchool);
  }, [expenditures, filterSchool]);

  if (isLoading || isAuthLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (role !== 'super_admin') {
    return (
        <Card className="border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2"/> Access Denied</CardTitle></CardHeader>
            <CardContent><p>You do not have permission to view this page. This is for super administrators only.</p></CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card className="border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2"/> Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <TrendingUp className="mr-3 h-8 w-8" /> All Branch Expenditures
      </h2>
      <CardDescription>
        An overview of expenditures recorded across all school branches.
      </CardDescription>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5"/>
            <Select value={filterSchool} onValueChange={setFilterSchool}>
                <SelectTrigger className="w-64">
                    <SelectValue placeholder="Filter by school..."/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map(school => (
                        <SelectItem key={school.id} value={school.id.toString()}>{school.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>School Branch</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (GHS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenditures.length > 0 ? (
                filteredExpenditures.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>{format(exp.date, "PPP")}</TableCell>
                    <TableCell className="font-medium">{exp.schools?.name || 'N/A'}</TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {exp.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No expenditures recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
