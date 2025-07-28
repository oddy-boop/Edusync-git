
'use client';

import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { getSupabase } from "@/lib/supabaseClient";
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';
import { useState, useEffect } from "react";
import { Skeleton } from '@/components/ui/skeleton';

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    slideshow: HomepageSlide[];
    homepageTitle: string | null;
    homepageSubtitle: string | null;
    updated_at?: string;
}

export default function HomePage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getHomepageSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, homepage_slideshow, homepage_title, homepage_subtitle, updated_at').eq('id', 1).single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const validSlides = Array.isArray(data?.homepage_slideshow)
          ? data.homepage_slideshow.filter(s => s && typeof s.imageUrl === 'string' && s.imageUrl.trim() !== '')
          : [];

        setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
            slideshow: validSlides,
            homepageTitle: data?.homepage_title,
            homepageSubtitle: data?.homepage_subtitle,
            updated_at: data?.updated_at,
        });
      } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
        // Fallback to empty/default state on error, PublicLayout will handle defaults
        setSettings({
            schoolName: null,
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            slideshow: [],
            homepageTitle: "Welcome to the School",
            homepageSubtitle: "A place for learning and growth.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    getHomepageSettings();
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
                <Skeleton className="w-full h-[90vh]"/>
            </main>
        </div>
      );
  }

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials} updated_at={settings?.updated_at}>
        <div className="relative">
            <HomepageCarousel 
              slides={settings?.slideshow || []} 
              homepageTitle={settings?.homepageTitle} 
              homepageSubtitle={settings?.homepageSubtitle}
              updated_at={settings?.updated_at} 
            />
        </div>
    </PublicLayout>
  );
}
