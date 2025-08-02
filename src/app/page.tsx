
import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { createClient } from "@/lib/supabase/server";
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';
import { PROGRAMS_LIST } from '@/lib/constants';
import * as LucideIcons from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';


export const revalidate = 0;

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    homepageTitle: string | null;
    homepageSubtitle: string | null;
    heroImageUrls: (string | null)[];
    homepageWelcomeTitle?: string | null;
    homepageWelcomeMessage?: string | null;
    homepageWelcomeImageUrl?: string | null;
    homepageWhyUsTitle?: string | null;
    homepageWhyUsPoints?: { id: string; title: string; description: string; icon: string; }[] | null;
    homepageNewsTitle?: string | null;
    updated_at?: string;
}

interface NewsPost {
  id: string;
  title: string;
  published_at: string;
}

const safeParseJson = (jsonString: any, fallback: any[] = []) => {
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  if (typeof jsonString === 'string') {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
};

const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}

async function getHomepageData() {
    const supabase = await createClient();
    let settingsData = null;
    let newsPostsData = null;
    let settingsError = null;
    let newsPostsError = null;

    try {
        const settingsRes = await supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, hero_image_url_1, hero_image_url_2, hero_image_url_3, hero_image_url_4, hero_image_url_5, homepage_title, homepage_subtitle, updated_at, homepage_welcome_title, homepage_welcome_message, homepage_welcome_image_url, homepage_why_us_title, homepage_why_us_points, homepage_news_title').single();
        settingsData = settingsRes.data;
        settingsError = settingsRes.error;

        if (settingsError && settingsError.code !== 'PGRST116') {
            console.error("Supabase settings fetch error:", JSON.stringify(settingsError, null, 2));
            throw new Error(`Settings Fetch Error: ${settingsError.message} (Hint: Check RLS policies on app_settings)`);
        }
        
        const newsPostsRes = await supabase.from('news_posts').select('id, title, published_at').order('published_at', { ascending: false }).limit(3);
        newsPostsData = newsPostsRes.data;
        newsPostsError = newsPostsRes.error;
        
        if (newsPostsError) {
            console.error("Supabase news posts fetch error:", JSON.stringify(newsPostsError, null, 2));
        }

        const heroImageUrls = settingsData ? [
            settingsData.hero_image_url_1,
            settingsData.hero_image_url_2,
            settingsData.hero_image_url_3,
            settingsData.hero_image_url_4,
            settingsData.hero_image_url_5,
        ].filter(Boolean) : [];

        const whyUsPointsData = settingsData?.homepage_why_us_points ? safeParseJson(settingsData.homepage_why_us_points) : [];

        const settings: PageSettings = {
            schoolName: settingsData?.school_name || "EduSync",
            logoUrl: settingsData?.school_logo_url,
            schoolAddress: settingsData?.school_address,
            schoolEmail: settingsData?.school_email,
            socials: {
                facebook: settingsData?.facebook_url,
                twitter: settingsData?.twitter_url,
                instagram: settingsData?.instagram_url,
                linkedin: settingsData?.linkedin_url,
            },
            heroImageUrls: heroImageUrls,
            homepageTitle: settingsData?.homepage_title || 'Welcome to Our School',
            homepageSubtitle: settingsData?.homepage_subtitle || 'A place for learning, growth, and discovery.',
            updated_at: settingsData?.updated_at,
            homepageWelcomeTitle: settingsData?.homepage_welcome_title,
            homepageWelcomeMessage: settingsData?.homepage_welcome_message,
            homepageWelcomeImageUrl: settingsData?.homepage_welcome_image_url,
            homepageWhyUsTitle: settingsData?.homepage_why_us_title,
            homepageWhyUsPoints: whyUsPointsData,
            homepageNewsTitle: settingsData?.homepage_news_title,
        };
        
        return { settings, newsPosts: newsPostsData || [], error: null };

    } catch (error: any) {
        console.error("Could not fetch public data for homepage:", error.message);
        return { settings: null, newsPosts: [], error: error.message };
    }
}


export default async function HomePage() {
  const { settings, newsPosts: latestNews, error } = await getHomepageData();

  if (!settings || error) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
              <Alert variant="destructive" className="max-w-xl">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Application Unavailable</AlertTitle>
                  <AlertDescription>
                      <p className="font-semibold">The school website could not be loaded at this time.</p>
                      <p className="text-xs mt-2">
                        This usually happens if the database is not reachable or security policies are misconfigured.
                        Please ensure environment variables are set correctly in your hosting provider and the database policies from `policies.md` have been applied.
                      </p>
                      {error && <p className="text-xs mt-1 font-mono bg-red-100 p-1 rounded">Error details: {error}</p>}
                  </AlertDescription>
              </Alert>
          </div>
      )
  }

  const welcomeImageUrl = generateCacheBustingUrl(settings?.homepageWelcomeImageUrl, settings?.updated_at);
  const whyUsPoints = Array.isArray(settings?.homepageWhyUsPoints) ? settings.homepageWhyUsPoints : [];

  return (
    <PublicLayout 
        schoolName={settings.schoolName} 
        logoUrl={settings.logoUrl} 
        socials={settings.socials} 
        updated_at={settings.updated_at}
        schoolAddress={settings.schoolAddress}
        schoolEmail={settings.schoolEmail}
    >
      <section className="relative h-screen w-full">
        <HomepageCarousel images={settings.heroImageUrls || []} updated_at={settings.updated_at} />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedSection className="container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white drop-shadow-lg">
                        {settings.homepageTitle}
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                        {settings.homepageSubtitle}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4 justify-center">
                        <Button asChild size="lg" variant="secondary" className="bg-white/90 text-primary hover:bg-white text-base font-semibold py-6 px-8 shadow-lg">
                            <Link href="/admissions">Admissions Info</Link>
                        </Button>
                        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-base font-semibold py-6 px-8 shadow-lg">
                            <Link href="/about">Learn More</Link>
                        </Button>
                    </div>
                </div>
            </AnimatedSection>
        </div>
      </section>

      {settings.homepageWelcomeTitle && settings.homepageWelcomeMessage && (
        <AnimatedSection className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold font-headline text-primary mb-4">{settings.homepageWelcomeTitle}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{settings.homepageWelcomeMessage}</p>
              </div>
              {welcomeImageUrl && (
                <div>
                  <Image 
                    src={welcomeImageUrl} 
                    alt="Welcome image" 
                    width={500} 
                    height={500}
                    className="rounded-full aspect-square object-cover shadow-lg"
                    data-ai-hint="person portrait"
                  />
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>
      )}

      <AnimatedSection className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">Our Programs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PROGRAMS_LIST.map(program => (
              <Card key={program.title} className="text-center hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle>{program.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{program.description.substring(0, 100)}...</p>
                </CardContent>
              </Card>
            ))}
          </div>
           <div className="text-center mt-10">
              <Button asChild>
                <Link href="/programs">Explore All Programs</Link>
              </Button>
            </div>
        </div>
      </AnimatedSection>

      {whyUsPoints && whyUsPoints.length > 0 && (
        <AnimatedSection className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings.homepageWhyUsTitle || 'Why Choose Us?'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyUsPoints.map(point => {
                const IconComponent = (LucideIcons as any)[point.icon] || LucideIcons.CheckCircle;
                return (
                  <Card key={point.id} className="text-center shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                          <IconComponent className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-semibold text-primary">{point.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-muted-foreground mt-2">{point.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </AnimatedSection>
      )}

      {latestNews && latestNews.length > 0 && (
        <AnimatedSection className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings.homepageNewsTitle || 'Latest News & Updates'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestNews.map(news => (
                <Card key={news.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{news.title}</CardTitle>
                    <CardDescription>{format(new Date(news.published_at), "PPP")}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow"></CardContent>
                  <CardContent>
                     <Button variant="link" asChild className="p-0">
                      <Link href="/news">Read More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}
    </PublicLayout>
  );
}
