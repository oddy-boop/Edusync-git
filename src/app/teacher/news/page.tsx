
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Loader2, AlertCircle, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string;
}

export default function TeacherNewsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const isMounted = useRef(true);
  const { schoolId, setHasNewAnnouncement } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;

    // Clear notification dot when page is visited
    if (typeof window !== 'undefined') {
        localStorage.setItem('teacher_last_checked_announcement', new Date().toISOString());
        setHasNewAnnouncement(false);
    }

    async function fetchAnnouncements() {
      if (!isMounted.current) return;
      if (!schoolId) {
        setError("Could not determine your school to fetch announcements.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from('school_announcements')
          .select('*')
          .eq('school_id', schoolId)
          .or('target_audience.eq.All,target_audience.eq.Teachers')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (isMounted.current) setAnnouncements(data || []);
      } catch (e: any) {
        console.error("Error fetching announcements:", e);
        if (isMounted.current) setError(`Failed to load announcements: ${e.message}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchAnnouncements();
    return () => { isMounted.current = false; };
  }, [supabase, schoolId, setHasNewAnnouncement]);
  
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
        <CardContent>
            <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Megaphone className="mr-3 h-8 w-8" /> School News & Announcements
        </h2>
      </div>
      <CardDescription>A complete history of all announcements sent to teachers.</CardDescription>
      
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
                        By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(ann.message)} className="h-8 w-8">
                    <Copy className="h-4 w-4"/>
                  </Button>
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
