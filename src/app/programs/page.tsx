
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Feather, Atom, Globe, Paintbrush, Loader2 } from "lucide-react";
import Image from 'next/image';
import { PROGRAMS_LIST } from "@/lib/constants";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";


interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    introText: string | null;
    program_creche_image_url?: string | null;
    program_kindergarten_image_url?: string | null;
    program_primary_image_url?: string | null;
    program_jhs_image_url?: string | null;
    academicYear?: string | null;
    updated_at?: string;
}

const extraCurricular = [
    { name: "Debate Club", icon: Feather },
    { name: "Science & Tech Club", icon: Atom },
    { name: "Cultural Troupe", icon: Globe },
    { name: "Art & Craft Club", icon: Paintbrush },
];


const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}

// NOTE: This is a placeholder for a proper API call.
async function getProgramPageSettings() {
    const data = await getSchoolBrandingAction();
    return { 
        settings: {
            ...data,
            introText: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
        } as PageSettings, 
        error: "Data fetching not implemented." 
    };
}

export default function ProgramPage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function fetchProgramPageSettings() {
      // client-side logic placeholder
      const { settings, error } = await getProgramPageSettings();
      if(settings) {
          setSettings(settings);
      }
      setIsLoading(false);
    }
    fetchProgramPageSettings();
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

  const programDetails = PROGRAMS_LIST.map(program => {
    let imageUrlKey: keyof PageSettings | undefined;
    if (program.title.includes("Creche")) imageUrlKey = 'program_creche_image_url';
    else if (program.title.includes("Kindergarten")) imageUrlKey = 'program_kindergarten_image_url';
    else if (program.title.includes("Primary")) imageUrlKey = 'program_primary_image_url';
    else if (program.title.includes("JHS")) imageUrlKey = 'program_jhs_image_url';
    
    const dbImageUrl = imageUrlKey && settings ? generateCacheBustingUrl(settings[imageUrlKey] as string, settings.updated_at) : null;

    return {
      ...program,
      imageUrl: dbImageUrl || `https://placehold.co/600x400.png`,
    };
  });

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
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Our Academic Programs</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {settings?.introText || "We offer a rich and diverse curriculum designed to foster intellectual curiosity and a lifelong love of learning at every stage of development."}
          </p>
        </AnimatedSection>

        <div className="space-y-16">
          {programDetails.map((program, index) => (
              <AnimatedSection key={program.title} className="grid md:grid-cols-2 gap-12 items-center">
                <div className={index % 2 === 0 ? "order-1" : "order-1 md:order-2"}>
                  <Image
                    src={program.imageUrl}
                    alt={program.title}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg object-cover aspect-[3/2]"
                    data-ai-hint={program.aiHint}
                  />
                </div>
                <div className={index % 2 === 0 ? "order-2" : "order-2 md:order-1"}>
                  <h2 className="text-3xl font-bold text-primary font-headline mb-4">{program.title}</h2>
                  <p className="text-muted-foreground">{program.description}</p>
                </div>
              </AnimatedSection>
            ))}
        </div>

        <AnimatedSection className="mt-20 text-center">
            <h2 className="text-3xl font-bold text-primary font-headline mb-8">Extracurricular Activities</h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
                We believe in holistic development. Our extracurricular activities provide students with opportunities to explore their interests, develop new skills, and build character outside the classroom.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {extraCurricular.map((activity) => (
                    <Card key={activity.name} className="shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform">
                        <CardContent className="pt-6 flex flex-col items-center justify-center">
                            <div className="bg-primary/10 p-4 rounded-full mb-3">
                                <activity.icon className="h-8 w-8 text-primary" />
                            </div>
                            <p className="font-semibold text-primary">{activity.name}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AnimatedSection>

      </div>
    </PublicLayout>
  );
}
