
import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Ensures the page is always dynamic

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
}

async function getContactPageSettings(): Promise<PageSettings> {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings')
            .select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url')
            .single();
        
        return {
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
        };
    } catch (error) {
        console.error("Could not fetch settings for contact page:", error);
        return {
            schoolName: 'EduSync',
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
        };
    }
}

export default async function ContactPage() {
  const { schoolName, logoUrl, socials } = await getContactPageSettings();
  
  return (
    <PublicLayout schoolName={schoolName} logoUrl={logoUrl} socials={socials}>
       <div className="container mx-auto py-16 px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
              <p><strong>Address:</strong> Accra, Ghana</p>
              <p><strong>Email:</strong> info@edusync.com</p>
              <p><strong>Phone:</strong> +233 12 345 6789</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </PublicLayout>
  );
}
