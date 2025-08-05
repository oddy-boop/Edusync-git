
'use client';

import { useState, useEffect, useRef } from 'react';
import { useActionState } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase/client';
import { Loader2, AlertCircle, Inbox, UserPlus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { admitStudentAction } from '@/lib/actions/admission.actions';

interface AdmissionApplication {
  id: string;
  full_name: string;
  date_of_birth: string;
  grade_level_applying_for: string;
  previous_school_name: string | null;
  guardian_name: string;
  guardian_contact: string;
  guardian_email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted';
  notes: string | null;
  created_at: string;
}

const statusOptions = ['pending', 'accepted', 'rejected', 'waitlisted'];

const initialAdmitState = {
  success: false,
  message: '',
};

function AdmitButton({ applicationId }: { applicationId: string }) {
    const [state, formAction] = useActionState(admitStudentAction, initialAdmitState);
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({ title: "Admission Successful", description: state.message });
                // Note: The parent component will handle removing the application from the list.
            } else {
                toast({ title: "Admission Failed", description: state.message, variant: 'destructive' });
            }
        }
    }, [state, toast]);

    return (
        <form action={formAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <Button size="sm" type="submit" className="bg-green-600 hover:bg-green-700 w-full">
                <UserPlus className="mr-2 h-4 w-4" /> Admit Student
            </Button>
        </form>
    );
}


export default function ApplicationsPage() {
    const [applications, setApplications] = useState<AdmissionApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentApp, setCurrentApp] = useState<AdmissionApplication | null>(null);
    const { toast } = useToast();
    const supabase = getSupabase();

    useEffect(() => {
        async function fetchApplications() {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('admission_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                setError(error.message);
                toast({ title: 'Error', description: 'Could not fetch applications.', variant: 'destructive' });
            } else {
                setApplications(data);
            }
            setIsLoading(false);
        }
        fetchApplications();
    }, [supabase, toast]);

    const handleOpenModal = (app: AdmissionApplication) => {
        setCurrentApp(app);
        setIsModalOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!currentApp) return;
        setIsSubmitting(true);
        const { error } = await supabase
            .from('admission_applications')
            .update({ status: currentApp.status, notes: currentApp.notes })
            .eq('id', currentApp.id);
        
        if (error) {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Application status updated.' });
            setApplications(apps => apps.map(a => a.id === currentApp.id ? currentApp : a));
            setIsModalOpen(false);
        }
        setIsSubmitting(false);
    };

    const handleDeleteApplication = async (appId: string) => {
        if (!window.confirm("Are you sure you want to delete this application? This cannot be undone.")) return;

        const { error } = await supabase.from('admission_applications').delete().eq('id', appId);
        if (error) {
            toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Application deleted.' });
            setApplications(apps => apps.filter(a => a.id !== appId));
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-destructive p-4 border border-destructive rounded-md">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
                <Inbox className="mr-3 h-8 w-8" /> Admission Applications
            </h2>
            <CardDescription>
                Review and manage all online admission applications submitted by prospective students.
            </CardDescription>

            <Card>
                <CardHeader><CardTitle>Submitted Applications ({applications.length})</CardTitle></CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No applications have been submitted yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant Name</TableHead>
                                    <TableHead>Applying For</TableHead>
                                    <TableHead>Submitted On</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map(app => (
                                    <TableRow key={app.id}>
                                        <TableCell className="font-medium">{app.full_name}</TableCell>
                                        <TableCell>{app.grade_level_applying_for}</TableCell>
                                        <TableCell>{format(new Date(app.created_at), 'PPP')}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => handleOpenModal(app)}><Edit className="mr-1 h-4 w-4"/> Review</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteApplication(app.id)}><Trash2 className="mr-1 h-4 w-4"/> Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {currentApp && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review Application: {currentApp.full_name}</DialogTitle>
                            <DialogDescription>Submitted on {format(new Date(currentApp.created_at), 'PPP')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Date of Birth</Label><p>{format(new Date(currentApp.date_of_birth), 'PPP')}</p></div>
                                <div><Label>Applying for Class</Label><p>{currentApp.grade_level_applying_for}</p></div>
                                <div><Label>Previous School</Label><p>{currentApp.previous_school_name || 'N/A'}</p></div>
                            </div>
                            <hr/>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Guardian Name</Label><p>{currentApp.guardian_name}</p></div>
                                <div><Label>Guardian Contact</Label><p>{currentApp.guardian_contact}</p></div>
                                <div className="col-span-2"><Label>Guardian Email</Label><p>{currentApp.guardian_email}</p></div>
                            </div>
                            <hr/>
                             <div className="grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <Label htmlFor="status">Update Status</Label>
                                    <Select value={currentApp.status} onValueChange={(value) => setCurrentApp(prev => prev ? {...prev, status: value as any} : null)}>
                                        <SelectTrigger id="status"><SelectValue/></SelectTrigger>
                                        <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {currentApp.status === 'accepted' && <div className="pt-6"><AdmitButton applicationId={currentApp.id} /></div>}
                            </div>
                            <div>
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea id="notes" value={currentApp.notes || ''} onChange={(e) => setCurrentApp(prev => prev ? {...prev, notes: e.target.value} : null)} placeholder="Add internal notes..."/>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateStatus} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Update Status
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
