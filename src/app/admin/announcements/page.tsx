
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, PlusCircle, Trash2, Send, Target, Loader2, AlertCircle, Copy, MessageSquare } from "lucide-react";
import { ANNOUNCEMENT_TARGETS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { sendSms } from "@/lib/sms";
import { sendAnnouncementEmail } from "@/lib/email";
import { useAuth } from "@/lib/auth-context";


interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_id?: string | null;
  author_name?: string | null;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const isMounted = useRef(true);
  
  const { user: currentUser, schoolId } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Pick<Announcement, 'title' | 'message' | 'target_audience'>>({ title: "", message: "", target_audience: "All" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    async function fetchAdminUserAndAnnouncements() {
        if (!isMounted.current || !schoolId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        if (currentUser) {
            try {
                const { data, error: fetchError } = await supabase
                    .from('school_announcements')
                    .select('*')
                    .eq('school_id', schoolId)
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;
                if(isMounted.current) setAnnouncements(data || []);

            } catch (e: any) {
                console.error("Error fetching announcements:", e);
                if(isMounted.current) setError(`Failed to load announcements: ${e.message}`);
            }
        } else {
            if(isMounted.current) setError("You must be logged in to view announcements.");
        }
        if(isMounted.current) setIsLoading(false);
    }
    fetchAdminUserAndAnnouncements();
    return () => { isMounted.current = false; };
  }, [supabase, currentUser, schoolId]);

  const handleSaveAnnouncement = async () => {
    if (!currentUser || !schoolId) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin to a school.", variant: "destructive" });
      return;
    }
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: "Error", description: "Title and message are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { dismiss } = toast({ title: "Posting Announcement...", description: "Please wait.", });

    try {
        const { data: savedAnnouncement, error } = await supabase
            .from('school_announcements')
            .insert({
                school_id: schoolId,
                title: newAnnouncement.title,
                message: newAnnouncement.message,
                target_audience: newAnnouncement.target_audience,
                author_id: currentUser.id,
                author_name: currentUser.user_metadata?.full_name || "Admin",
            })
            .select()
            .single();

        if (error) throw error;
        
        dismiss();

        if(isMounted.current){
            if (savedAnnouncement) {
                setAnnouncements(prev => [savedAnnouncement, ...prev]);
                toast({ title: "Success", description: "Announcement posted successfully." });
                setIsAnnouncementDialogOpen(false);
                setNewAnnouncement({ title: "", message: "", target_audience: "All" });

                 const { data: settingsData } = await supabase.from('schools').select('enable_email_notifications, enable_sms_notifications').eq('id', schoolId).single();
                  
                 if (settingsData?.enable_email_notifications) {
                    sendAnnouncementEmail({ title: newAnnouncement.title, message: newAnnouncement.message }, newAnnouncement.target_audience, schoolId);
                 }
                
                 if (settingsData?.enable_sms_notifications) {
                    const recipientsForSms: { phoneNumber: string }[] = [];
                    if (newAnnouncement.target_audience === 'All' || newAnnouncement.target_audience === 'Students') {
                        const { data: students, error: studentError } = await supabase.from('students').select('guardian_contact').eq('school_id', schoolId).not('guardian_contact', 'is', null);
                        if(studentError) console.warn("Could not fetch students for SMS:", studentError.message);
                        else if(students) recipientsForSms.push(...students.map(s => ({ phoneNumber: s.guardian_contact })));
                    }
                    if (newAnnouncement.target_audience === 'All' || newAnnouncement.target_audience === 'Teachers') {
                        const { data: teachers, error: teacherError } = await supabase.from('teachers').select('contact_number').eq('school_id', schoolId).not('contact_number', 'is', null);
                        if(teacherError) console.warn("Could not fetch teachers for SMS:", teacherError.message);
                        else if(teachers) recipientsForSms.push(...teachers.map(t => ({ phoneNumber: t.contact_number })));
                    }
                    if (recipientsForSms.length > 0) {
                        sendSms({ schoolId: schoolId, message: `${newAnnouncement.title}: ${newAnnouncement.message}`, recipients: recipientsForSms });
                    }
                 }

            } else {
                toast({ title: "Error", description: "Could not retrieve the saved announcement data.", variant: "destructive" });
            }
        }
    } catch (e: any) {
        dismiss();
        console.error("Error saving announcement:", e);
        toast({ title: "Database Error", description: `Could not post announcement: ${e.message}`, variant: "destructive" });
    } finally {
        if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!currentUser || !schoolId) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('school_announcements').delete().eq('id', id).eq('school_id', schoolId);
        if (error) throw error;
        
        if(isMounted.current){
            setAnnouncements(prev => prev.filter(ann => ann.id !== id));
            toast({ title: "Success", description: "Announcement deleted." });
        }
    } catch (e: any) {
        console.error("Error deleting announcement:", e);
        toast({ title: "Database Error", description: `Could not delete announcement: ${e.message}`, variant: "destructive" });
    } finally {
        if(isMounted.current) setIsSubmitting(false);
    }
  };
  
  const handleCopyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: "Announcement message copied to clipboard." }))
      .catch(err => toast({ title: "Error", description: "Could not copy text.", variant: "destructive" }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground ml-2">Loading announcements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <Megaphone className="mr-3 h-8 w-8" /> All Announcements
          </h2>
          <CardDescription className="mt-1">A complete history of all announcements sent to students and teachers.</CardDescription>
        </div>
        <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
          <DialogTrigger asChild>
            <Button size="default" disabled={!currentUser} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Send className="mr-2 h-5 w-5" /> Create New Announcement</DialogTitle>
              <DialogDescription>Compose and target your announcement for Email and SMS.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="annTitle" className="text-right">Title</Label>
                <Input id="annTitle" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} className="col-span-3" placeholder="Important Update" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="annMessage" className="text-right pt-2">Message</Label>
                <Textarea id="annMessage" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))} className="col-span-3 min-h-[100px]" placeholder="Details of the announcement..." />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="annTarget" className="text-right flex items-center"><Target className="mr-1 h-4 w-4"/>Target</Label>
                <Select value={newAnnouncement.target_audience} onValueChange={(value: "All" | "Students" | "Teachers") => setNewAnnouncement(prev => ({ ...prev, target_audience: value }))}>
                  <SelectTrigger className="col-span-3" id="annTarget">
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TARGETS.map(target => (
                      <SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAnnouncement} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                <MessageSquare className="mr-2 h-4 w-4" /> Post & Notify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No announcements have been posted yet.</p>
        ) : (
          announcements.map(ann => (
            <Card key={ann.id} className="shadow-md">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{ann.title}</CardTitle>
                    <CardDescription className="text-xs">
                        For: {ann.target_audience} | By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                   <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(ann.message)} className="h-7 w-7">
                        <Copy className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="text-destructive hover:text-destructive/80 h-7 w-7" disabled={isSubmitting || !currentUser}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm whitespace-pre-wrap">{ann.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
