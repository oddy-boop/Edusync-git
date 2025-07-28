
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getSupabase } from "@/lib/supabaseClient";
import PublicLayout from "@/components/layout/PublicLayout";
import { Skeleton } from "@/components/ui/skeleton";

interface Announcement {
  id: string;
  title: string;
  message: string;
  author_name?: string | null;
  created_at: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    updated_at?: string;
}

export default function NewsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNewsData() {
      const supabase = getSupabase();
      try {
        const [announcementsRes, settingsRes] = await Promise.all([
          supabase
            .from('school_announcements')
            .select('id, title, message, author_name, created_at')
            .or('target_audience.eq.All,target_audience.eq.Students')
            .order('created_at', { ascending: false }),
          supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, updated_at').single()
        ]);
        
        if (announcementsRes.error) throw new Error(`Announcements: ${announcementsRes.error.message}`);
        if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw new Error(`Settings: ${settingsRes.error.message}`);
        
        setAnnouncements(announcementsRes.data || []);
        setSettings({
            schoolName: settingsRes.data?.school_name,
            logoUrl: settingsRes.data?.school_logo_url,
            socials: {
                facebook: settingsRes.data?.facebook_url,
                twitter: settingsRes.data?.twitter_url,
                instagram: settingsRes.data?.instagram_url,
                linkedin: settingsRes.data?.linkedin_url,
            },
            updated_at: settingsRes.data?.updated_at,
        });

      } catch (e: any) {
        console.error("Error fetching news page data:", e);
        setError(`Failed to load news and updates: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNewsData();
  }, []);

  if (isLoading) {
      return (
         <PublicLayout schoolName={null} logoUrl={null} socials={null}>
            <div className="container mx-auto py-16 px-4 space-y-8">
                <div className="text-center">
                    <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
         </PublicLayout>
      )
  }

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials} updated_at={settings?.updated_at}>
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">News & Announcements</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Stay up-to-date with the latest news, events, and important announcements from our school.
          </p>
        </section>
        
        <section className="max-w-4xl mx-auto">
            {error ? (
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading News</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            ) : announcements.length === 0 ? (
                 <Card className="text-center py-12">
                    <CardHeader><CardTitle>No Announcements</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There are currently no news items or announcements. Please check back later.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {announcements.map(ann => (
                        <Card key={ann.id} className="shadow-md">
                        <CardHeader className="pb-3 pt-5 px-6">
                            <CardTitle className="text-xl">{ann.title}</CardTitle>
                            <CardDescription className="text-xs">
                                By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 pb-5">
                            <p className="text-sm whitespace-pre-wrap">{ann.message}</p>
                        </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
      </div>
    </PublicLayout>
  );
}
