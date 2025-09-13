
'use client';

import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';
import { PROGRAMS_LIST } from '@/lib/constants';
import * as LucideIcons from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { School, Loader2 } from 'lucide-react';
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { getNewsPosts } from "@/lib/actions/settings.actions";

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
    academicYear?: string | null;
    updated_at?: string;
}

interface NewsPost {
  id: string;
  title: string;
  published_at: string;
}

const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}


export default function HomePage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [latestNews, setLatestNews] = React.useState<NewsPost[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function getHomepageData() {
      try {
        // Check for selected school in localStorage first
        let selectedSchoolId = null;
        try {
          const storedSchoolId = localStorage.getItem('selectedSchoolId');
          const storedSchool = localStorage.getItem('selectedSchool');
          
          if (storedSchoolId) {
            selectedSchoolId = parseInt(storedSchoolId);
          } else if (storedSchool) {
            const parsed = JSON.parse(storedSchool);
            selectedSchoolId = parsed?.id ? parseInt(parsed.id) : null;
          }
        } catch (e) {
          console.error('Error reading selected school from localStorage:', e);
        }

        // Use client-side API that can handle specific school ID
        const settingsUrl = selectedSchoolId 
          ? `/api/school-settings?schoolId=${selectedSchoolId}`
          : '/api/school-settings';
          
        const settingsResponse = await fetch(settingsUrl);
        
        // Handle the case where no schools exist (PGRST116 or 404)
        if (!settingsResponse.ok) {
          if (settingsResponse.status === 404 || settingsResponse.status === 500) {
            // No schools exist - clear stale localStorage and let BranchPicker handle setup
            console.log('No schools found in database - clearing stale localStorage');
            try {
              localStorage.removeItem('selectedSchool');
              localStorage.removeItem('selectedSchoolId');
              localStorage.removeItem('selectedSchoolName');
            } catch (e) {
              console.warn('Could not clear localStorage:', e);
            }
            setIsLoading(false);
            return;
          }
          throw new Error('Failed to fetch school settings');
        }
        
        const settingsData = await settingsResponse.json();

        // If we get an error object back (like PGRST116), treat as no schools
        if (settingsData.error) {
          console.log('School settings returned error - BranchPicker will handle setup:', settingsData.error);
          setIsLoading(false);
          return;
        }

        if (!settingsData) {
            console.log("No school configuration found - BranchPicker will show setup form");
            setIsLoading(false);
            return;
        }
        
        const heroImageUrls = [
            settingsData.hero_image_url_1,
            settingsData.hero_image_url_2,
            settingsData.hero_image_url_3,
            settingsData.hero_image_url_4,
            settingsData.hero_image_url_5,
        ].filter(url => url);


    const buildPublicUrlFromPath = (p: string | null | undefined) => {
      if (!p) return null;
      if (/^https?:\/\//i.test(p)) return p;
      const supa = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supa) return p;
      const base = supa.replace(/\/$/, '');
      return `${base}/storage/v1/object/public/school-assets/${p}`;
    };

    const pageSettings: PageSettings = {
      schoolName: settingsData.name,
      // Prefer the already-resolved public URL (logo_url may already be a URL).
      // If it's a raw storage path, attempt to build the public URL using NEXT_PUBLIC_SUPABASE_URL.
      logoUrl: settingsData.logo_url || buildPublicUrlFromPath(settingsData.logo_url) || null,
            schoolAddress: settingsData.address,
            schoolEmail: settingsData.email,
            socials: {
                facebook: settingsData.facebook_url,
                twitter: settingsData.twitter_url,
                instagram: settingsData.instagram_url,
                linkedin: settingsData.linkedin_url,
            },
            homepageTitle: settingsData.homepage_title,
            homepageSubtitle: settingsData.homepage_subtitle,
            heroImageUrls: heroImageUrls,
            homepageWelcomeTitle: settingsData.homepage_welcome_title,
            homepageWelcomeMessage: settingsData.homepage_welcome_message,
            homepageWelcomeImageUrl: settingsData.homepage_welcome_image_url,
            homepageWhyUsTitle: settingsData.homepage_why_us_title,
            homepageWhyUsPoints: Array.isArray(settingsData.homepage_why_us_points) ? settingsData.homepage_why_us_points : [],
            homepageNewsTitle: settingsData.homepage_news_title,
            academicYear: settingsData.current_academic_year,
            updated_at: settingsData.updated_at,
        };
        
        setSettings(pageSettings);
        
        const newsData = await getNewsPosts();
        if (newsData) {
            setLatestNews(newsData.slice(0, 3));
        }

      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
    }
    getHomepageData();
  }, []);

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-xl">
          <School className="h-5 w-5" />
          <AlertTitle>Application Error</AlertTitle>
          <AlertDescription>
            <p className="font-semibold whitespace-pre-wrap">{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const welcomeImageUrl = generateCacheBustingUrl(settings?.homepageWelcomeImageUrl, settings?.updated_at);
  const whyUsPoints = Array.isArray(settings?.homepageWhyUsPoints) ? settings.homepageWhyUsPoints : [];

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
      <section className="relative h-screen w-full">
        <HomepageCarousel images={settings?.heroImageUrls || []} updated_at={settings?.updated_at} />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedSection className="container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white drop-shadow-lg">
                        {settings?.homepageTitle}
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                        {settings?.homepageSubtitle}
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

      {settings?.homepageWelcomeTitle && settings?.homepageWelcomeMessage && (
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
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings?.homepageWhyUsTitle || 'Why Choose Us?'}</h2>
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
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings?.homepageNewsTitle || 'Latest News & Updates'}</h2>
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
