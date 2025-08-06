
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, Inbox, UserPlus, Trash2, Edit, CheckCircle, XCircle, KeyRound } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { admitStudentAction, deleteAdmissionApplicationAction } from '@/lib/actions/admission.actions';

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


export default function ApplicationsPage() {
    const [applications, setApplications] = useState<AdmissionApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentApp, setCurrentApp] = useState<AdmissionApplication | null>(null);
    const [initialPassword, setInitialPassword] = useState('');
    const [appToDelete, setAppToDelete] = useState<AdmissionApplication | null>(null);
    const { toast } = useToast();
    const supabase = getSupabase();
    
    const fetchApplications = async () => {
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
    };

    useEffect(() => {
        fetchApplications();
    }, [supabase, toast]);
    
    const handleOpenModal = (app: AdmissionApplication) => {
        setCurrentApp(app);
        setInitialPassword(''); // Reset password field on open
        setIsModalOpen(true);
    };

    const handleUpdateStatusAndAdmit = async () => {
        if (!currentApp) return;

        setIsSubmitting(true);
        const { dismiss } = toast({
            title: "Processing...",
            description: `Updating application status to ${currentApp.status}.`,
        });

        const result = await admitStudentAction({
            applicationId: currentApp.id,
            initialPassword: currentApp.status === 'accepted' ? initialPassword : undefined,
            newStatus: currentApp.status,
            notes: currentApp.notes,
        });

        dismiss();

        if (result.success) {
            toast({ title: "Success", description: result.message, duration: 8000 });
            await fetchApplications(); // Refresh the list
            setIsModalOpen(false);
        } else {
            toast({ title: "Action Failed", description: result.message, variant: 'destructive', duration: 10000 });
        }
        setIsSubmitting(false);
    };

    const handleDeleteApplication = async (appId: string) => {
        if (!appId) return;
        setIsDeleting(true);

        const result = await deleteAdmissionApplicationAction(appId);

        if (result.success) {
            toast({ title: 'Success', description: result.message });
            setApplications(apps => apps.filter(a => a.id !== appId));
        } else {
            toast({ title: 'Delete Failed', description: result.message, variant: 'destructive' });
        }
        setAppToDelete(null); // Close the dialog
        setIsDeleting(false);
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
                                            <Button variant="destructive" size="sm" onClick={() => setAppToDelete(app)}><Trash2 className="mr-1 h-4 w-4"/> Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

             {appToDelete && (
                <AlertDialog open={!!appToDelete} onOpenChange={() => setAppToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the application for {appToDelete.full_name}. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteApplication(appToDelete.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Delete Application
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {currentApp && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review Application: {currentApp.full_name}</DialogTitle>
                            <DialogDescription>Submitted on {format(new Date(currentApp.created_at), 'PPP')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Date of Birth</Label><p>{format(new Date(currentApp.date_of_birth + 'T00:00:00'), 'PPP')}</p></div>
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
                             <div className="grid grid-cols-1 gap-4 items-center">
                                <div>
                                    <Label htmlFor="status">Update Status</Label>
                                    <Select value={currentApp.status} onValueChange={(value) => setCurrentApp(prev => prev ? {...prev, status: value as any} : null)}>
                                        <SelectTrigger id="status"><SelectValue/></SelectTrigger>
                                        <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {currentApp.status === 'accepted' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="initial-password">Set Initial Password</Label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="initial-password"
                                                type="text"
                                                value={initialPassword}
                                                onChange={(e) => setInitialPassword(e.target.value)}
                                                placeholder="Set a strong initial password..."
                                                className="pl-10"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">The guardian will receive this password via SMS to log in.</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea id="notes" value={currentApp.notes || ''} onChange={(e) => setCurrentApp(prev => prev ? {...prev, notes: e.target.value} : null)} placeholder="Add internal notes..."/>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateStatusAndAdmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {currentApp.status === 'accepted' ? 'Admit Student & Send Details' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
