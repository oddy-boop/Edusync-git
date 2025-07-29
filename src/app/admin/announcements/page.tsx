
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
import { Megaphone, PlusCircle, Trash2, Send, Target, Loader2, AlertCircle, Copy } from "lucide-react";
import { ANNOUNCEMENT_TARGETS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { sendAnnouncementEmail } from "@/lib/email";

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
  const supabase = getSupabase();
  const isMounted = useRef(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Pick<Announcement, 'title' | 'message' | 'target_audience'>>({ title: "", message: "", target_audience: "All" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    async function fetchUserAndAnnouncements() {
      if (!isMounted.current) return;
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if(isMounted.current) setCurrentUser(session.user);
        try {
          const { data, error: fetchError } = await supabase
            .from('school_announcements')
            .select('*')
            .order('created_at', { ascending: false });
          if (fetchError) throw fetchError;
          if(isMounted.current) setAnnouncements(data || []);
        } catch (e: any) {
          console.error("Error fetching announcements:", e);
          if(isMounted.current) setError(`Failed to load announcements: ${e.message}`);
        }
      } else {
        if(isMounted.current) setError("Admin login required to manage announcements.");
      }
      if(isMounted.current) setIsLoading(false);
    }
    fetchUserAndAnnouncements();
    return () => { isMounted.current = false; };
  }, [supabase]);

  const handleSaveAnnouncement = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin.", variant: "destructive" });
      return;
    }
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: "Error", description: "Title and message are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const announcementToSave = {
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      target_audience: newAnnouncement.target_audience,
      author_id: currentUser.id,
      author_name: currentUser.user_metadata?.full_name || currentUser.email || "Admin",
    };

    try {
      const { data: savedAnnouncement, error: insertError } = await supabase
        .from('school_announcements')
        .insert([announcementToSave])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      if (isMounted.current && savedAnnouncement) {
        setAnnouncements(prev => [savedAnnouncement, ...prev]);
        toast({ title: "Success", description: "Announcement posted successfully." });
        
        sendAnnouncementEmail(
            { title: savedAnnouncement.title, message: savedAnnouncement.message },
            savedAnnouncement.target_audience
        ).then(emailResult => {
            if (emailResult.success) {
                toast({ title: "Email Notifications Sent", description: emailResult.message });
            } else {
                toast({ title: "Email Sending Failed", description: emailResult.message, variant: "destructive" });
            }
        });
      }
      setIsAnnouncementDialogOpen(false);
      setNewAnnouncement({ title: "", message: "", target_audience: "All" });
    } catch (e: any) {
      console.error("Error saving announcement:", e);
      toast({ title: "Database Error", description: `Could not post announcement: ${e.message}`, variant: "destructive" });
    } finally {
        if(isMounted.current) setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error: deleteError } = await supabase
        .from('school_announcements')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;

      if (isMounted.current) setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      toast({ title: "Success", description: "Announcement deleted." });
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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Megaphone className="mr-3 h-8 w-8" /> All Announcements
        </h2>
        <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
          <DialogTrigger asChild>
            <Button size="default" disabled={!currentUser}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Send className="mr-2 h-5 w-5" /> Create New Announcement</DialogTitle>
              <DialogDescription>Compose and target your announcement.</DialogDescription>
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
                <Send className="mr-2 h-4 w-4" /> Post Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <CardDescription>A complete history of all announcements sent to students and teachers.</CardDescription>
      
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
