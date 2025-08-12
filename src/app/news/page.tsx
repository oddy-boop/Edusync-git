
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import PublicLayout from "@/components/layout/PublicLayout";
import Image from 'next/image';
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';

export const revalidate = 0;

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  author_name?: string | null;
  published_at: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    academicYear?: string | null;
    updated_at?: string;
}

async function fetchNewsData(): Promise<{ newsPosts: NewsPost[], settings: PageSettings | null, error: string | null }> {
  const supabase = createClient();
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);

  try {
    let schoolQuery;
    if (subdomain) {
        schoolQuery = supabase.from('schools').select('*').eq('domain', subdomain).single();
    } else {
        schoolQuery = supabase.from('schools').select('*').order('created_at', { ascending: true }).limit(1).single();
    }
    const { data: settingsData, error: settingsError } = await schoolQuery;

    if (settingsError) throw new Error(`Settings: ${settingsError.message}`);

    const schoolId = settingsData?.id || 1;

    const { data: newsPostsData, error: newsError } = await supabase
        .from('news_posts')
        .select('*')
        .eq('school_id', schoolId)
        .order('published_at', { ascending: false });
    
    if (newsError) throw new Error(`News Posts: ${newsError.message}`);
    
    const settings: PageSettings | null = settingsData ? {
        schoolName: settingsData.name,
        logoUrl: settingsData.logo_url,
        schoolAddress: settingsData.address,
        schoolEmail: settingsData.email,
        socials: {
            facebook: settingsData.facebook_url,
            twitter: settingsData.twitter_url,
            instagram: settingsData.instagram_url,
            linkedin: settingsData.linkedin_url,
        },
        academicYear: settingsData.current_academic_year,
        updated_at: settingsData.updated_at,
    } : null;
    
    return { newsPosts: newsPostsData || [], settings, error: null };

  } catch (e: any) {
    console.error("Error fetching news page data:", e);
    return { 
        newsPosts: [], 
        settings: null,
        error: `Failed to load news and updates: ${e.message}` 
    };
  }
}

export default async function NewsPage() {
  const { newsPosts, settings, error } = await fetchNewsData();

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
        academicYear={settings?.academicYear}
    >
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">News & Updates</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Stay up-to-date with the latest news, events, and important updates from our school.
          </p>
        </section>
        
        <section className="max-w-4xl mx-auto">
            {error ? (
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Error Loading News</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            ) : newsPosts.length === 0 ? (
                 <Card className="text-center py-12">
                    <CardHeader><CardTitle>No News Yet</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">There are currently no news items to display. Please check back later.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {newsPosts.map(post => (
                        <Card key={post.id} className="shadow-md overflow-hidden">
                          {post.image_url && (
                             <div className="relative h-64 w-full">
                                <Image src={post.image_url} alt={post.title} layout="fill" objectFit="cover" className="object-cover" />
                             </div>
                          )}
                          <CardHeader className="pb-3 pt-5 px-6">
                              <CardTitle className="text-xl md:text-2xl">{post.title}</CardTitle>
                              <CardDescription className="text-xs flex items-center gap-2">
                                  <Calendar className="h-3 w-3"/>
                                  <span>Published on {format(new Date(post.published_at), "PPP")}</span>
                                  {post.author_name && <span>by {post.author_name}</span>}
                              </CardDescription>
                          </CardHeader>
                          <CardContent className="px-6 pb-5">
                              <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                                {post.content}
                              </div>
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
