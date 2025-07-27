'use client';
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Feather, Atom, Globe, Paintbrush } from "lucide-react";
import Image from 'next/image';
import { getSupabase } from "@/lib/supabaseClient";
import { PROGRAMS_LIST } from "@/lib/constants";
import { useState, useEffect } from "react";


interface ProgramDetail {
  description: string;
  imageUrl: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    introText: string | null;
    programDetails: Record<string, ProgramDetail>;
    updated_at?: string;
}

const extraCurricular = [
    { name: "Debate Club", icon: Feather },
    { name: "Science & Tech Club", icon: Atom },
    { name: "Cultural Troupe", icon: Globe },
    { name: "Art & Craft Club", icon: Paintbrush },
];

export default function ProgramPage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProgramPageSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, programs_intro, program_details, updated_at').single();

        if (error) {
          console.error("Error fetching settings for Program page:", error);
          // Provide default settings in case of an error
          setSettings({
            schoolName: 'EduSync',
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            introText: "Introduction text not set.",
            programDetails: {},
          });
        } else {
          setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
              facebook: data?.facebook_url,
              twitter: data?.twitter_url,
              instagram: data?.instagram_url,
              linkedin: data?.linkedin_url,
            },
            introText: data?.programs_intro,
            programDetails: data?.program_details || {},
            updated_at: data?.updated_at,
          });
        }
      } catch (error) {
        console.error("Could not fetch settings for Program page:", error);
        // Provide default settings in case of an error
        setSettings({
          schoolName: 'EduSync',
          logoUrl: null,
          socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
          introText: "Introduction text not set.",
          programDetails: {},
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgramPageSettings();
  }, []); // Empty dependency array means this effect runs once on mount

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  // Render loading state or null while settings are being fetched
  if (isLoading || !settings) {
    return <div>Loading...</div>; // Or a more sophisticated loading component
  }

  return (
    <PublicLayout schoolName={settings.schoolName} logoUrl={settings.logoUrl} socials={settings.socials} updated_at={settings.updated_at}>
      <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Our Academic Programs</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {settings.introText || "We offer a rich and diverse curriculum designed to foster intellectual curiosity and a lifelong love of learning at every stage of development."}
          </p>
        </section>

        <section className="space-y-16">
          {PROGRAMS_LIST.map((program, index) => {
             const details = settings.programDetails?.[program.title];
             const description = details?.description || program.description;
             const imageUrl = generateCacheBustingUrl(details?.imageUrl, settings.updated_at) || `https://placehold.co/600x400.png`;

            return (
              <div key={program.title} className="grid md:grid-cols-2 gap-12 items-center">
                <div className={index % 2 === 0 ? "order-1" : "order-1 md:order-2"}>
                  <Image
                    src={imageUrl}
                    alt={program.title}
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg object-cover aspect-[3/2]"
                    data-ai-hint={program.aiHint}
                  />
                </div>
                <div className={index % 2 === 0 ? "order-2" : "order-2 md:order-1"}>
                  <h2 className="text-3xl font-bold text-primary font-headline mb-4">{program.title}</h2>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              </div>
            )
          })}
        </section>

        <section className="mt-20 text-center">
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
        </section>

      </div>
    </PublicLayout>
  );
}
