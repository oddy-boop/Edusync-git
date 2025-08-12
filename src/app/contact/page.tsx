
import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";
import { createClient } from "@/lib/supabase/server";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';

export const revalidate = 0;

interface PageSettings {
    schoolName: string | null;
    schoolEmail: string | null;
    schoolPhone: string | null;
    schoolAddress: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    academicYear?: string | null;
    updated_at?: string;
}

async function getContactPageSettings(): Promise<PageSettings | null> {
    const supabase = createClient();
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);

    try {
      let schoolQuery = supabase.from('schools');
      if (subdomain) {
          schoolQuery = schoolQuery.select('*').eq('domain', subdomain).single();
      } else {
          schoolQuery = schoolQuery.select('*').is('domain', null).single(); // Fallback to the school with no domain
      }
      
      const { data, error } = await schoolQuery;

      if (error) throw error;
      if (!data) return null;
    
      const settings: PageSettings = {
          schoolName: data.name,
          logoUrl: data.logo_url,
          schoolEmail: data.email,
          schoolPhone: data.phone,
          schoolAddress: data.address,
          socials: {
              facebook: data.facebook_url,
              twitter: data.twitter_url,
              instagram: data.instagram_url,
              linkedin: data.linkedin_url,
          },
          academicYear: data.current_academic_year,
          updated_at: data.updated_at,
      };
      return settings;
    } catch (error) {
      console.error("Could not fetch settings for contact page:", error);
      return null;
    }
}

export default async function ContactPage() {
  const settings = await getContactPageSettings();

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
        <AnimatedSection className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
                <p><strong>Address:</strong> {settings?.schoolAddress || "Not Available"}</p>
                <p><strong>Email:</strong> {settings?.schoolEmail || "Not Available"}</p>
                <p><strong>Phone:</strong> {settings?.schoolPhone || "Not Available"}</p>
            </div>
          </div>
          <ContactForm />
        </AnimatedSection>
      </div>
    </PublicLayout>
  );
}
