
import { HomePageClient } from "@/components/home/HomePageClient";
import { type FooterContactInfo } from "@/components/layout/MainFooter";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0;

interface HeroSlide {
  id: string;
  url: string;
  slogan: string;
}

interface BrandingSettings {
  school_name: string;
  school_slogan: string;
  homepage_hero_slides: HeroSlide[];
  current_academic_year?: string;
}

const defaultBrandingSettings: BrandingSettings = {
  school_name: "EduSync Platform",
  school_slogan: "A tradition of excellence, a future of innovation.",
  homepage_hero_slides: [],
  current_academic_year: `${new Date().getFullYear()}`,
};

const defaultContactInfo: FooterContactInfo = {
    address: "123 Education Lane, Accra, Ghana",
    email: "info@edusync.com",
    phone: "+233 12 345 6789",
};

async function getPageDataForDomain(domain: string) {
    try {
        const supabase = getSupabase();
        
        // Find school by domain
        const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id')
            .eq('domain', domain)
            .single();

        if (schoolError || !schoolData) {
            console.error(`HomePage: Could not find school for domain '${domain}':`, schoolError);
            // On error, return defaults to prevent site crash
            return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
        }

        const { data, error } = await supabase
            .from('app_settings')
            .select('school_name, school_slogan, homepage_hero_slides, current_academic_year, school_address, school_email, school_phone')
            .eq('school_id', schoolData.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error(`HomePage: Supabase error fetching settings for school ${schoolData.id}:`, error);
            return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
        }
        
        const branding = {
            school_name: data?.school_name || defaultBrandingSettings.school_name,
            school_slogan: data?.school_slogan || defaultBrandingSettings.school_slogan,
            homepage_hero_slides: data?.homepage_hero_slides || [],
            current_academic_year: data?.current_academic_year || defaultBrandingSettings.current_academic_year,
        };
        const contactInfo = {
            address: data?.school_address || defaultContactInfo.address,
            email: data?.school_email || defaultContactInfo.email,
            phone: data?.school_phone || defaultContactInfo.phone,
        };

        return { branding, contactInfo };

    } catch (e: any) {
        console.error("HomePage: A critical error occurred while fetching page data for domain:", e.message);
        return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
    }
}

export default async function SchoolHomePage({ params }: { params: { domain: string }}) {
  const pageData = await getPageDataForDomain(params.domain);
  
  return (
    <HomePageClient branding={pageData.branding} contactInfo={pageData.contactInfo} />
  );
}
