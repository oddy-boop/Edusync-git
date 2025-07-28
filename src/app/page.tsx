

'use client';

import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { getSupabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    homepageTitle: string | null;
    homepageSubtitle: string | null;
    homepageHeroImageUrl: string | null;
    updated_at?: string;
}

export default function HomePage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getHomepageSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, homepage_hero_image_url, homepage_title, homepage_subtitle, updated_at').eq('id', 1).single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
            homepageHeroImageUrl: data?.homepage_hero_image_url,
            homepageTitle: data?.homepage_title,
            homepageSubtitle: data?.homepage_subtitle,
            updated_at: data?.updated_at,
        });
      } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
        setSettings({
            schoolName: null,
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            homepageHeroImageUrl: null,
            homepageTitle: "Welcome to the School",
            homepageSubtitle: "A place for learning and growth.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    getHomepageSettings();
  }, []);

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }
  
  const finalHeroImageUrl = generateCacheBustingUrl(settings?.homepageHeroImageUrl, settings?.updated_at) || "https://placehold.co/1920x1080.png";

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

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials} updated_at={settings?.updated_at}>
      <section className="relative h-screen w-full">
        <div className="relative w-full h-full">
            <Image
                src={finalHeroImageUrl}
                alt={settings?.homepageTitle || 'Hero background image'}
                fill
                className="object-cover"
                priority
                data-ai-hint="university campus students"
            />
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
        </div>
      </section>
    </PublicLayout>
  );
}

