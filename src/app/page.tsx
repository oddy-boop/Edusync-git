
'use client';

import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { getSupabase } from "@/lib/supabaseClient";
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';
import { useState, useEffect } from "react";

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

        let processedSlideshow: HomepageSlide[] = [];
        const rawSlideshow = data?.homepage_slideshow;

        if (typeof rawSlideshow === 'string') {
          try {
            const parsed = JSON.parse(rawSlideshow);
            if(Array.isArray(parsed)) {
              processedSlideshow = parsed.filter(s => s && typeof s.imageUrl === 'string' && s.imageUrl.trim() !== '');
            }
          } catch (e) {
            console.error("Failed to parse homepage_slideshow JSON string:", e);
            processedSlideshow = [];
          }
        } else if (Array.isArray(rawSlideshow)) {
          processedSlideshow = rawSlideshow.filter(s => s && typeof s.imageUrl === 'string' && s.imageUrl.trim() !== '');
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
            slideshow: processedSlideshow,
            homepageTitle: data?.homepage_title,
            homepageSubtitle: data?.homepage_subtitle,
            updated_at: data?.updated_at,
        });
      } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
        setSettings({
            schoolName: 'Modern University',
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            slideshow: [],
            homepageTitle: "Welcome to the Modern University",
            homepageSubtitle: "Any prominent career starts with good education. Together with us, you will have an opportunity of getting better and deeper knowledge of the subjects that can build your future.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    getHomepageSettings();
  }, []);

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials} updated_at={settings?.updated_at}>
        <div className="relative">
            <HomepageCarousel 
              slides={settings?.slideshow || []} 
              homepageTitle={settings?.homepageTitle || settings?.schoolName || "Welcome to the Modern University"} 
              homepageSubtitle={settings?.homepageSubtitle || "Start your prominent career with good education."} 
              updated_at={settings?.updated_at} 
            />
        </div>
    </PublicLayout>
  );
}
