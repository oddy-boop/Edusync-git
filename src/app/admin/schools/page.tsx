
"use client";

import { useState, useEffect, useRef } from "react";
import { useActionState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { School, PlusCircle, Edit, Trash2, Loader2, AlertCircle, ShieldCheck, Save, KeyRound } from "lucide-react";
import { createSchoolAction, updateSchoolAction, deleteSchoolAction } from "@/lib/actions/school.actions";
import { useFormStatus } from "react-dom";

interface SchoolData {
  id: string;
  name: string;
  domain: string | null;
  created_at: string;
  paystack_public_key: string | null;
  paystack_secret_key: string | null;
  resend_api_key: string | null;
  google_api_key: string | null;
}

const initialState = { success: false, message: "" };

function SubmitButton({ isEditMode }: { isEditMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {pending ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create School")}
    </Button>
  );
}

export default function SchoolsPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentSchool, setCurrentSchool] = useState<SchoolData | null>(null);
  
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const [createState, createFormAction] = useActionState(createSchoolAction, initialState);
  const [updateState, updateFormAction] = useActionState(updateSchoolAction, initialState);

  const fetchInitialData = async (client: SupabaseClient) => {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        throw new Error("You are not authenticated.");
      }

      const { data: roleData, error: roleError } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleError) throw new Error("Could not verify user role.");

      if (roleData.role !== 'super_admin') {
        setIsSuperAdmin(false);
        setError("You do not have permission to view this page.");
        return;
      }
      
      setIsSuperAdmin(true);
      const { data: schoolsData, error: schoolsError } = await client.from('schools').select('*').order('name', { ascending: true });
      if (schoolsError) throw schoolsError;
      
      if (isMounted.current) {
        setSchools(schoolsData || []);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (supabase) {
      fetchInitialData(supabase);
    }
    return () => { isMounted.current = false; };
  }, [supabase]);
  
  useEffect(() => {
    if (createState.message) {
      if (createState.success) {
        toast({ title: "Success", description: createState.message });
        setIsDialogOpen(false);
        if (supabase) fetchInitialData(supabase);
      } else {
        toast({ title: "Error", description: createState.message, variant: "destructive" });
      }
    }
  }, [createState]);
  
  useEffect(() => {
    if (updateState.message) {
      if (updateState.success) {
        toast({ title: "Success", description: updateState.message });
        setIsDialogOpen(false);
        if (supabase) fetchInitialData(supabase);
      } else {
        toast({ title: "Error", description: updateState.message, variant: "destructive" });
      }
    }
  }, [updateState]);


  const handleOpenDialog = (mode: 'add' | 'edit', school?: SchoolData) => {
    setDialogMode(mode);
    setCurrentSchool(school || null);
    setIsDialogOpen(true);
  };
  
  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;
    setIsDeleting(true);

    const result = await deleteSchoolAction(schoolToDelete.id);
    if (result.success) {
        toast({ title: "Success", description: result.message });
        if (supabase) fetchInitialData(supabase);
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    
    setIsDeleting(false);
    setSchoolToDelete(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /> Verifying permissions and loading data...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error || "This page is restricted to Super Administrators."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <School className="mr-3 h-8 w-8" /> School Management
        </h2>
        <Button onClick={() => handleOpenDialog('add')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New School
        </Button>
      </div>
      <CardDescription>Create, view, and manage school instances and their API keys on the platform.</CardDescription>
      
      {error && (
        <Card className="border-amber-500 bg-amber-500/10 text-amber-700">
            <CardHeader><CardTitle className="flex items-center"><AlertCircle/>Notice</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Registered Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">No schools registered yet.</TableCell></TableRow>
                ) : (
                  schools.map(school => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="font-mono text-sm">{school.domain || "N/A"}</TableCell>
                      <TableCell>{new Date(school.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', school)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => setSchoolToDelete(school)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add New School' : 'Edit School'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add' ? 'Enter the details for the new school.' : `Editing: ${currentSchool?.name}`}
            </DialogDescription>
          </DialogHeader>
          <form ref={formRef} action={dialogMode === 'add' ? createFormAction : updateFormAction}>
            <div className="grid gap-4 py-4">
               {currentSchool && <input type="hidden" name="id" value={currentSchool.id} />}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={currentSchool?.name || ''} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="domain" className="text-right">Domain</Label>
                <Input id="domain" name="domain" defaultValue={currentSchool?.domain || ''} className="col-span-3" placeholder="e.g., sjm" />
              </div>
              <hr className="col-span-4 my-2" />
              <div className="col-span-4">
                 <h3 className="font-semibold text-lg flex items-center"><KeyRound className="mr-2 h-5 w-5"/> API Keys</h3>
                 <p className="text-sm text-muted-foreground">These keys are stored securely and are never exposed to the client-side.</p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paystack_public_key" className="text-right text-xs">Paystack Public</Label>
                <Input id="paystack_public_key" name="paystack_public_key" defaultValue={currentSchool?.paystack_public_key || ''} className="col-span-3" placeholder="pk_..."/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paystack_secret_key" className="text-right text-xs">Paystack Secret</Label>
                <Input id="paystack_secret_key" name="paystack_secret_key" defaultValue={currentSchool?.paystack_secret_key || ''} className="col-span-3" placeholder="sk_..."/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resend_api_key" className="text-right text-xs">Resend API</Label>
                <Input id="resend_api_key" name="resend_api_key" defaultValue={currentSchool?.resend_api_key || ''} className="col-span-3" placeholder="re_..."/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="google_api_key" className="text-right text-xs">Google AI</Label>
                <Input id="google_api_key" name="google_api_key" defaultValue={currentSchool?.google_api_key || ''} className="col-span-3" placeholder="AIza..."/>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <SubmitButton isEditMode={dialogMode === 'edit'}/>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!schoolToDelete} onOpenChange={() => setSchoolToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the school
                    <strong className="mx-1">{schoolToDelete?.name}</strong>
                    and all of its associated data, including users, fees, results, and settings.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSchool} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                   Yes, delete this school
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}
