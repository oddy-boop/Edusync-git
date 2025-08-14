
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { HandHeart, School, Users, Loader2 } from "lucide-react";
import Image from 'next/image';
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from 'react';
import { getSchoolSettings } from "@/lib/actions/settings.actions";
import dynamic from 'next/dynamic';

const DonateForm = dynamic(
  () => import('@/components/forms/DonateForm').then(mod => mod.DonateForm),
  { 
    ssr: false,
    loading: () => <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }
);
  
const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    donateImageUrl?: string | null;
    academicYear?: string | null;
    updated_at?: string;
}

export default function DonatePage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPageSettings() {
      const data = await getSchoolSettings();
      if(data) {
          setSettings({
            schoolName: data.name,
            logoUrl: data.logo_url,
            schoolAddress: data.address,
            schoolEmail: data.email,
            socials: {
                facebook: data.facebook_url,
                twitter: data.twitter_url,
                instagram: data.instagram_url,
                linkedin: data.linkedin_url,
            },
            donateImageUrl: data.donate_image_url,
            academicYear: data.current_academic_year,
            updated_at: data.updated_at,
          });
      }
      setIsLoading(false);
    }
    fetchPageSettings();
  }, []);

  if (isLoading) {
    return (
      <PublicLayout schoolName={null} logoUrl={null} socials={null} updated_at={undefined} schoolAddress={null} schoolEmail={null} academicYear={null}>
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }
  
  const finalImageUrl = generateCacheBustingUrl(settings?.donateImageUrl, settings?.updated_at) || "https://placehold.co/600x450.png";

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
        <AnimatedSection className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Support Our Mission</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Your generous contribution helps us provide quality education, improve our facilities, and support our dedicated staff. Every donation, big or small, makes a difference.
          </p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 gap-12 items-center">
            
            <DonateForm 
                schoolName={settings?.schoolName || "School Donation"} 
            />

            <div>
                 <Image 
                    src={finalImageUrl}
                    alt="A heart-warming image showing the impact of donations on education: smiling children in a classroom." 
                    width={600} 
                    height={450} 
                    className="rounded-lg shadow-lg"
                    data-ai-hint="community charity"
                />
            </div>
        </AnimatedSection>

        <AnimatedSection className="mt-20">
            <h2 className="text-3xl font-bold text-primary font-headline text-center mb-12">Where Your Donation Goes</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <Users className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Empower a Student</h3>
                    <p className="text-muted-foreground mt-2">Provide scholarships, learning materials, and extracurricular opportunities for deserving students.</p>
                </div>
                 <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <School className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Upgrade Facilities</h3>
                    <p className="text-muted-foreground mt-2">Help us maintain and improve our classrooms, library, and sports facilities for a better learning environment.</p>
                </div>
                 <div className="flex flex-col items-center">
                    <div className="bg-accent/10 p-4 rounded-full mb-3">
                        <HandHeart className="h-10 w-10 text-accent"/>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Support Our Staff</h3>
                    <p className="text-muted-foreground mt-2">Invest in professional development and resources for our dedicated teachers and staff members.</p>
                </div>
            </div>
        </AnimatedSection>

      </div>
    </PublicLayout>
  );
}
