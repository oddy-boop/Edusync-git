import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import PublicLayout from "@/components/layout/PublicLayout";

export const revalidate = 0;

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
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    updated_at?: string;
}

async function fetchNewsData(): Promise<{ announcements: Announcement[], settings: PageSettings, error: string | null }> {
  const supabase = createClient();
  try {
    const [announcementsRes, settingsRes] = await Promise.all([
      supabase
        .from('school_announcements')
        .select('id, title, message, author_name, created_at')
        .or('target_audience.eq.All,target_audience.eq.Students')
        .order('created_at', { ascending: false }),
      supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, updated_at').single()
    ]);
    
    if (announcementsRes.error) throw new Error(`Announcements: ${announcementsRes.error.message}`);
    if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw new Error(`Settings: ${settingsRes.error.message}`);
    
    const settings: PageSettings = {
        schoolName: settingsRes.data?.school_name,
        logoUrl: settingsRes.data?.school_logo_url,
        schoolAddress: settingsRes.data?.school_address,
        schoolEmail: settingsRes.data?.school_email,
        socials: {
            facebook: settingsRes.data?.facebook_url,
            twitter: settingsRes.data?.twitter_url,
            instagram: settingsRes.data?.instagram_url,
            linkedin: settingsRes.data?.linkedin_url,
        },
        updated_at: settingsRes.data?.updated_at,
    };
    
    return { announcements: announcementsRes.data || [], settings, error: null };

  } catch (e: any) {
    console.error("Error fetching news page data:", e);
    return { 
        announcements: [], 
        settings: { schoolName: null, logoUrl: null, schoolAddress: null, schoolEmail: null, socials: { facebook: null, twitter: null, instagram: null, linkedin: null } },
        error: `Failed to load news and updates: ${e.message}` 
    };
  }
}

export default async function NewsPage() {
  const { announcements, settings, error } = await fetchNewsData();

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
    >
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
