
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Feather, Atom, Globe, Paintbrush } from "lucide-react";
import Image from 'next/image';
import { getSupabase } from "@/lib/supabaseClient";
import { PROGRAMS_LIST } from "@/lib/constants";

export const revalidate = 0;

interface ProgramDetail {
  description: string;
  imageUrl: string;
}

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    introText: string;
    programDetails: Record<string, ProgramDetail>;
}

const extraCurricular = [
    { name: "Debate Club", icon: Feather },
    { name: "Science & Tech Club", icon: Atom },
    { name: "Cultural Troupe", icon: Globe },
    { name: "Art & Craft Club", icon: Paintbrush },
];


async function getProgramPageSettings(): Promise<PageSettings> {
    const supabase = getSupabase();
    try {
    const { data } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, programs_intro, program_details').single();
    return {
        schoolName: data?.school_name,
        logoUrl: data?.school_logo_url,
        socials: {
            facebook: data?.facebook_url,
            twitter: data?.twitter_url,
            instagram: data?.instagram_url,
            linkedin: data?.linkedin_url,
        },
        introText: data?.programs_intro || "We offer a rich and diverse curriculum designed to foster intellectual curiosity and a lifelong love of learning at every stage of development.",
        programDetails: data?.program_details || {},
    };
    } catch (error) {
    console.error("Could not fetch settings for Program page:", error);
        return {
        schoolName: 'EduSync',
        logoUrl: null,
        socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
        introText: "We offer a rich and diverse curriculum designed to foster intellectual curiosity and a lifelong love of learning at every stage of development.",
        programDetails: {},
    };
    }
}


export default async function ProgramPage() {
  const settings = await getProgramPageSettings();

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials}>
      <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Our Academic Programs</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {settings.introText}
          </p>
        </section>

        <section className="space-y-16">
          {PROGRAMS_LIST.map((program, index) => {
             const details = settings.programDetails?.[program.title];
             const description = details?.description || program.description;
             const imageUrl = details?.imageUrl || `https://placehold.co/600x400.png`;

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
