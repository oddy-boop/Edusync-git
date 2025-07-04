
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, AlertCircle, Search, Filter, Edit, Trash2, ShieldAlert, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BEHAVIOR_INCIDENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BehaviorIncident {
  id: string;
  student_id_display: string;
  student_name: string;
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  type: string;
  description: string;
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at?: string;
}

const incidentEditSchema = z.object({
  type: z.string().min(1, "Incident type is required."),
  description: z.string().min(5, "Description must be at least 5 characters.").max(500, "Description must be 500 characters or less."),
  date: z.date({ required_error: "Incident date is required." }),
});
type IncidentEditFormData = z.infer<typeof incidentEditSchema>;

export default function BehaviorLogsPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allIncidents, setAllIncidents] = useState<BehaviorIncident[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentIncidentToEdit, setCurrentIncidentToEdit] = useState<BehaviorIncident | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState<BehaviorIncident | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const editForm = useForm<IncidentEditFormData>({
    resolver: zodResolver(incidentEditSchema),
    defaultValues: { type: "", description: "", date: new Date() },
  });

  const fetchIncidentsData = async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: incidentsData, error: incidentsError } = await supabase
        .from("behavior_incidents")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (incidentsError) throw incidentsError;

      if (isMounted.current) {
        setAllIncidents(incidentsData || []);
      }

    } catch (e:any) {
      console.error("Error fetching behavior incidents:", e);
      if (isMounted.current) setError(`Failed to refresh incidents: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    const fetchAdminUser = async () => {
      if (!isMounted.current) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if(isMounted.current) setError("Admin authentication required.");
        setIsLoading(false);
        return;
      }
      if(isMounted.current) {
        setCurrentUser(session.user);
        await fetchIncidentsData();
      }
    };
    fetchAdminUser();
    return () => { isMounted.current = false; };
  }, [supabase]);

  const filteredIncidents = useMemo(() => {
    if (!isMounted.current) return [];
    let tempIncidents = [...allIncidents];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempIncidents = tempIncidents.filter(i =>
        i.student_name.toLowerCase().includes(lowerSearchTerm) ||
        i.student_id_display.toLowerCase().includes(lowerSearchTerm) ||
        i.class_id.toLowerCase().includes(lowerSearchTerm) ||
        i.teacher_name.toLowerCase().includes(lowerSearchTerm) ||
        i.description.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (typeFilter !== "all") {
      tempIncidents = tempIncidents.filter(i => i.type === typeFilter);
    }
    
    return tempIncidents;
  }, [searchTerm, typeFilter, allIncidents]);


  const handleOpenEditDialog = (incident: BehaviorIncident) => {
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "Admin action required.", variant: "destructive" });
        return;
    }
    setCurrentIncidentToEdit(incident);
    editForm.reset({
        type: incident.type,
        description: incident.description,
        date: new Date(incident.date + "T00:00:00"),
    });
    setIsEditDialogOpen(true);
  };

  const onSubmitEditIncident = async (data: IncidentEditFormData) => {
    if (!currentIncidentToEdit || !currentIncidentToEdit.id || !currentUser) {
      toast({ title: "Error", description: "No incident selected or not authenticated.", variant: "destructive" });
      setIsSubmittingEdit(false);
      return;
    }
    setIsSubmittingEdit(true);

    try {
        const incidentUpdatePayload = {
            type: data.type,
            description: data.description,
            date: format(data.date, "yyyy-MM-dd"),
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from('behavior_incidents')
            .update(incidentUpdatePayload)
            .eq('id', currentIncidentToEdit.id);

        if (updateError) throw updateError;
        toast({ title: "Success", description: "Incident updated." });
        
        if (isMounted.current) {
            await fetchIncidentsData();
        }
        setIsEditDialogOpen(false);
        setCurrentIncidentToEdit(null);
    } catch (e: any) {
        console.error("Error updating incident:", e);
        toast({ title: "Operation Failed", description: `Could not update incident: ${e.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsSubmittingEdit(false);
    }
  };

  const handleOpenDeleteDialog = (incident: BehaviorIncident) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Admin action required.", variant: "destructive" });
      return;
    }
    setIncidentToDelete(incident);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteIncident = async () => {
    if (!incidentToDelete || !currentUser) {
      toast({ title: "Error", description: "No incident selected or not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmittingDelete(true);
    try {
      const { error: deleteError } = await supabase
        .from("behavior_incidents")
        .delete()
        .eq("id", incidentToDelete.id);

      if (deleteError) throw deleteError;

      toast({ title: "Success", description: `Incident record for ${incidentToDelete.student_name} deleted.` });
      if (isMounted.current) {
        await fetchIncidentsData();
      }
    } catch (e: any) {
      console.error("Error deleting incident:", e);
      toast({ title: "Delete Failed", description: `Could not delete incident: ${e.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsSubmittingDelete(false);
        setIsDeleteDialogOpen(false);
        setIncidentToDelete(null);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading behavior logs...</p>
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
        <ShieldAlert className="mr-3 h-8 w-8" /> Behavior Incident Logs
      </h2>
      <CardDescription>
        View and manage all student behavior incidents logged by teachers across the school.
      </CardDescription>

      {error && currentUser && (
         <Card className="border-amber-500 bg-amber-500/10 text-amber-700 my-4"><CardHeader><CardTitle className="flex items-center"><AlertCircle/>Notice</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Incidents ({filteredIncidents.length})</CardTitle>
          <CardDescription>
            Found {filteredIncidents.length} record(s) matching your criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                placeholder="Search by Student Name/ID/Class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="lg:col-span-2"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Incident Types</SelectItem>
                  {BEHAVIOR_INCIDENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          {filteredIncidents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No incidents found matching your current filters, or no incidents recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Reported By</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredIncidents.map((incident) => (
                            <TableRow key={incident.id}>
                                <TableCell>
                                    <div className="font-medium">{incident.student_name}</div>
                                    <div className="text-xs text-muted-foreground">{incident.student_id_display}</div>
                                </TableCell>
                                <TableCell>{incident.class_id}</TableCell>
                                <TableCell>{incident.type}</TableCell>
                                <TableCell>{format(new Date(incident.date + 'T00:00:00'), "PPP")}</TableCell>
                                <TableCell>{incident.teacher_name}</TableCell>
                                <TableCell className="max-w-xs truncate" title={incident.description}>{incident.description}</TableCell>
                                <TableCell className="space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(incident)}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(incident)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4"/></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {currentIncidentToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit Incident for {currentIncidentToEdit.student_name}</DialogTitle>
                    <DialogDescription>
                        Modify the incident details. This action will be logged.
                    </DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onSubmitEditIncident)} className="space-y-4 py-4">
                        <FormField control={editForm.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Date of Incident</FormLabel>
                            <Popover><PopoverTrigger asChild>
                                <FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl>
                            </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus />
                            </PopoverContent></Popover><FormMessage />
                            </FormItem>)} />
                        <FormField control={editForm.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Type of Incident</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select incident type" /></SelectTrigger></FormControl>
                                <SelectContent>{BEHAVIOR_INCIDENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                            </Select><FormMessage /></FormItem>)} />
                        <FormField control={editForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel>
                            <FormControl><Textarea placeholder="Detailed description of the incident..." {...field} rows={4} /></FormControl>
                            <FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingEdit}>
                                {isSubmittingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}

      {incidentToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this incident record for {incidentToDelete.student_name}? This action is permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setIncidentToDelete(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteIncident}
                disabled={isSubmittingDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isSubmittingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Yes, Delete Incident
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
