
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Feather, Atom, Globe, Paintbrush } from "lucide-react";
import Image from 'next/image';
import { createClient } from "@/lib/supabase/server";
import { PROGRAMS_LIST } from "@/lib/constants";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';

export const revalidate = 0;

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

async function fetchProgramPageSettings(): Promise<PageSettings | null> {
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
      
        const { data, error } = await schoolQuery;

        if (error) throw error;
        if (!data) return null;
    
        const settings: PageSettings = {
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
            introText: data.programs_intro,
            program_creche_image_url: data.program_creche_image_url,
            program_kindergarten_image_url: data.program_kindergarten_image_url,
            program_primary_image_url: data.program_primary_image_url,
            program_jhs_image_url: data.program_jhs_image_url,
            academicYear: data.current_academic_year,
            updated_at: data.updated_at,
        };
        return settings;
    } catch (error) {
        console.error("Could not fetch settings for Program page:", error);
        return null;
    }
}

const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}

export default async function ProgramPage() {
  const settings = await fetchProgramPageSettings();

  const programDetails = PROGRAMS_LIST.map(program => {
    let imageUrlKey: keyof PageSettings | undefined;
    if (program.title.includes("Creche")) imageUrlKey = 'program_creche_image_url';
    else if (program.title.includes("Kindergarten")) imageUrlKey = 'program_kindergarten_image_url';
    else if (program.title.includes("Primary")) imageUrlKey = 'program_primary_image_url';
    else if (program.title.includes("JHS")) imageUrlKey = 'program_jhs_image_url';
    
    const dbImageUrl = imageUrlKey && settings ? generateCacheBustingUrl(settings[imageUrlKey], settings.updated_at) : null;

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
