
'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Edit, Trash2, PlusCircle, School, Globe, AlertCircle } from 'lucide-react';
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
import { createOrUpdateSchoolAction, deleteSchoolAction, getSchoolsAction } from '@/lib/actions/school.actions';

interface School {
  id: number;
  name: string;
  domain: string | null;
  created_at: string;
}

const schoolFormSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(3, { message: 'School name must be at least 3 characters.' }),
  domain: z.string().regex(/^[a-z0-9-]+$/, { message: 'Subdomain can only contain lowercase letters, numbers, and hyphens.' }).optional().nullable(),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

type FormState = {
  success: boolean;
  message: string;
}

const initialState: FormState = {
    success: false,
    message: ''
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isEditing ? 'Save Changes' : 'Create School'}
      </Button>
    );
}

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  
  const { toast } = useToast();
  
  const [createState, createFormAction] = useActionState(createOrUpdateSchoolAction, initialState);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
  });

  const fetchSchools = async () => {
    setIsLoading(true);
    const result = await getSchoolsAction();
    if(result.success) {
        setSchools(result.data as School[]);
    } else {
        setError(result.message);
        toast({ title: 'Error', description: 'Could not fetch schools.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if(createState.message){
        if(createState.success){
            toast({title: 'Success', description: createState.message });
            fetchSchools();
            setIsDialogOpen(false);
        } else {
            toast({title: 'Error', description: createState.message, variant: 'destructive'});
        }
    }
  },[createState, toast]);

  const handleOpenDialog = (school?: School) => {
    if (school) {
      setCurrentSchool(school);
      form.reset({
        id: school.id,
        name: school.name,
        domain: school.domain,
      });
    } else {
      setCurrentSchool(null);
      form.reset({
        id: undefined,
        name: '',
        domain: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!schoolToDelete) return;

    const result = await deleteSchoolAction({ schoolId: schoolToDelete.id });
    
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchSchools();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setSchoolToDelete(null);
  };
  
  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  
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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <School className="mr-3 h-8 w-8"/> Schools Management
        </h2>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add New School</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Registered Schools</CardTitle>
          <CardDescription>A list of all school branches on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Subdomain (Legacy)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map(school => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.domain || 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(school)}><Edit className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => setSchoolToDelete(school)}><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSchool ? 'Edit School' : 'Create New School'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form action={createFormAction} className="space-y-4">
               {currentSchool?.id && <input type="hidden" name="id" value={currentSchool.id} />}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4"/> Subdomain (Legacy - Optional)</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., adenta-campus" /></FormControl>
                    <FormDescription className="text-xs">
                      This is no longer used for login but can be kept for reference. Use only letters, numbers, and hyphens.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <SubmitButton isEditing={!!currentSchool} />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {schoolToDelete && (
         <AlertDialog open={!!schoolToDelete} onOpenChange={() => setSchoolToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the <strong>{schoolToDelete.name}</strong> school branch and all associated data, including students, teachers, fees, and results.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete School
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
