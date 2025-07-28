
'use client';

import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { getSupabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { Skeleton } from '@/components/ui/skeleton';
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { PROGRAMS_LIST } from '@/lib/constants';
import * as LucideIcons from 'lucide-react';

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
    homepageWhyUsPoints?: { id: string; title: string; description: string; icon: string; }[];
    homepageNewsTitle?: string | null;
    updated_at?: string;
}

interface Announcement {
  id: string;
  title: string;
  created_at: string;
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


export default function HomePage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [latestAnnouncements, setLatestAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  useEffect(() => {
    async function getHomepageData() {
      const supabase = getSupabase();
      try {
        const [settingsRes, announcementsRes] = await Promise.all([
          supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, hero_image_url_1, hero_image_url_2, hero_image_url_3, hero_image_url_4, hero_image_url_5, homepage_title, homepage_subtitle, updated_at, homepage_welcome_title, homepage_welcome_message, homepage_welcome_image_url, homepage_why_us_title, homepage_why_us_points, homepage_news_title').eq('id', 1).single(),
          supabase.from('school_announcements').select('id, title, created_at').or('target_audience.eq.All,target_audience.eq.Students').order('created_at', { ascending: false }).limit(3)
        ]);
        
        const { data, error } = settingsRes;
        if (error && error.code !== 'PGRST116') throw error;
        
        const { data: announcements, error: announcementsError } = announcementsRes;
        if (announcementsError) throw announcementsError;

        const heroImageUrls = [
            data?.hero_image_url_1,
            data?.hero_image_url_2,
            data?.hero_image_url_3,
            data?.hero_image_url_4,
            data?.hero_image_url_5,
        ].filter(Boolean);

        const whyUsPointsData = data ? safeParseJson(data.homepage_why_us_points) : [];

        setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            schoolAddress: data?.school_address,
            schoolEmail: data?.school_email,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
            heroImageUrls: heroImageUrls,
            homepageTitle: data?.homepage_title,
            homepageSubtitle: data?.homepage_subtitle,
            updated_at: data?.updated_at,
            homepageWelcomeTitle: data?.homepage_welcome_title,
            homepageWelcomeMessage: data?.homepage_welcome_message,
            homepageWelcomeImageUrl: data?.homepage_welcome_image_url,
            homepageWhyUsTitle: data?.homepage_why_us_title,
            homepageWhyUsPoints: whyUsPointsData,
            homepageNewsTitle: data?.homepage_news_title,
        });

        setLatestAnnouncements(announcements || []);

      } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getHomepageData();
  }, []);

  if (isLoading) {
      return (
        <div className="flex flex-col">
            <header className="container mx-auto flex justify-between items-center h-20">
                <Skeleton className="h-10 w-48" />
                <div className="hidden lg:flex items-center gap-6">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-10 w-24" />
            </header>
            <main>
                <Skeleton className="w-full h-screen"/>
            </main>
        </div>
      );
  }

  const welcomeImageUrl = generateCacheBustingUrl(settings?.homepageWelcomeImageUrl, settings?.updated_at);
  const whyUsPoints = settings?.homepage_why_us_points || [];

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
    >
      <section className="relative h-screen w-full">
        <HomepageCarousel images={settings?.heroImageUrls || []} updated_at={settings?.updated_at} />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight text-white drop-shadow-lg">
                        {settings?.homepageTitle || 'Welcome to Our School'}
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                        {settings?.homepageSubtitle || 'A place for learning, growth, and discovery.'}
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
            </div>
        </div>
      </section>

      {/* Welcome Section */}
      {settings?.homepageWelcomeTitle && settings?.homepageWelcomeMessage && (
        <section className="py-20 bg-secondary/30">
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
        </section>
      )}

      {/* Our Programs */}
      <section className="py-20">
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
      </section>

      {/* Why Choose Us */}
      {whyUsPoints && whyUsPoints.length > 0 && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings?.homepageWhyUsTitle || 'Why Choose Us?'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyUsPoints.map(point => {
                const IconComponent = (LucideIcons as any)[point.icon] || LucideIcons.CheckCircle;
                return (
                  <div key={point.id} className="text-center">
                    <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary">{point.title}</h3>
                    <p className="text-muted-foreground mt-2">{point.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Latest News */}
      {latestAnnouncements && latestAnnouncements.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline text-primary text-center mb-12">{settings?.homepageNewsTitle || 'Latest News & Updates'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestAnnouncements.map(news => (
                <Card key={news.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{news.title}</CardTitle>
                    <CardDescription>{formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}</CardDescription>
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
        </section>
      )}
    </PublicLayout>
  );
}
