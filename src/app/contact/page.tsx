import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

interface PageSettings {
    schoolName: string | null;
    schoolEmail: string | null;
    schoolPhone: string | null;
    schoolAddress: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    updated_at?: string;
}

async function getContactPageSettings(): Promise<PageSettings | null> {
    const supabase = createClient();
    try {
    const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, school_email, school_phone, school_address, facebook_url, twitter_url, instagram_url, linkedin_url, updated_at').single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    const settings: PageSettings = {
        schoolName: data.school_name,
        logoUrl: data.school_logo_url,
        schoolEmail: data.school_email,
        schoolPhone: data.school_phone,
        schoolAddress: data.school_address,
        socials: {
            facebook: data.facebook_url,
            twitter: data.twitter_url,
            instagram: data.instagram_url,
            linkedin: data.linkedin_url,
        },
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
    >
       <div className="container mx-auto py-16 px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
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
        </div>
      </div>
    </PublicLayout>
  );
}
