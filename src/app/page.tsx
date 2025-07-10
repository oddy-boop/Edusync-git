
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

async function getPageData() {
    try {
        const supabase = getSupabase();

        // In a multi-tenant setup, the root homepage should display the settings
        // of a designated "main" school. Here, we'll fetch the first school created.
        const { data: mainSchool, error: schoolError } = await supabase
            .from('schools')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
        
        if (schoolError || !mainSchool) {
            console.warn("HomePage: Could not find a default school to display on the main page. Falling back to default text.", schoolError);
            return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
        }

        const { data, error } = await supabase
            .from('app_settings')
            .select('school_name, school_slogan, homepage_hero_slides, current_academic_year, school_address, school_email, school_phone')
            .eq('school_id', mainSchool.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("HomePage: Supabase error fetching settings:", error);
            // On error, return defaults to prevent site crash
            return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
        }
        
        // Even if no data, we provide defaults to avoid null/undefined issues.
        const branding = {
            school_name: data?.school_name || defaultBrandingSettings.school_name,
            school_slogan: data?.school_slogan || defaultBrandingSettings.school_slogan,
            // Ensure homepage_hero_slides is always an array
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
        console.error("HomePage: A critical error occurred while fetching page data:", e.message);
        // Fallback to default settings if anything goes wrong, including getSupabase() failing.
        return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
    }
}

export default async function HomePage() {
  // getPageData is now guaranteed to return an object with branding and contactInfo properties.
  const pageData = await getPageData();
  
  return (
    <HomePageClient branding={pageData.branding} contactInfo={pageData.contactInfo} />
  );
}
