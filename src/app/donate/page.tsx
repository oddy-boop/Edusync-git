
import PublicLayout from "@/components/layout/PublicLayout";
import { HandHeart, School, Users } from "lucide-react";
import Image from 'next/image';
import { createClient } from "@/lib/supabase/server";
import { DonateForm } from "@/components/forms/DonateForm";

export const revalidate = 0;

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    schoolAddress: string | null;
    schoolEmail: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    paystackPublicKey: string | null;
    donateImageUrl?: string | null;
    updated_at?: string;
}

async function getPageSettings(): Promise<PageSettings | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, paystack_public_key, donate_image_url, updated_at').single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        const settings: PageSettings = {
            schoolName: data.school_name,
            logoUrl: data.school_logo_url,
            schoolAddress: data.school_address,
            schoolEmail: data.school_email,
            socials: {
                facebook: data.facebook_url,
                twitter: data.twitter_url,
                instagram: data.instagram_url,
                linkedin: data.linkedin_url,
            },
            paystackPublicKey: data.paystack_public_key,
            donateImageUrl: data.donate_image_url,
            updated_at: data.updated_at,
        };
        return settings;
    } catch (error) {
        console.error("Could not fetch settings for donate page:", error);
        return null;
    }
}
  
const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
}


export default async function DonatePage() {
  const settings = await getPageSettings();
  
  const finalImageUrl = generateCacheBustingUrl(settings?.donateImageUrl, settings?.updated_at) || "https://placehold.co/600x450.png";

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
    >
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Support Our Mission</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            Your generous contribution helps us provide quality education, improve our facilities, and support our dedicated staff. Every donation, big or small, makes a difference.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12 items-center">
            
            <DonateForm 
                paystackPublicKey={settings?.paystackPublicKey} 
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
        </div>

        <section className="mt-20">
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
        </section>

      </div>
    </PublicLayout>
  );
}
