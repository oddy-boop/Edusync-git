
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
  school_name: "St. Joseph's Montessori",
  school_slogan: "A tradition of excellence, a future of innovation.",
  homepage_hero_slides: [],
  current_academic_year: `${new Date().getFullYear()}`,
};

const defaultContactInfo: FooterContactInfo = {
    address: "123 Education Lane, Accra, Ghana",
    email: "info@sjm.edu.gh",
    phone: "+233 12 345 6789",
};

async function getPageData() {
    try {
        const supabase = getSupabase();

        // For a single-school app, we always fetch the first (and only) settings record.
        // We use `limit(1).single()` to ensure we get one object, not an array.
        const { data, error } = await supabase
            .from('app_settings')
            .select('school_name, school_slogan, homepage_hero_slides, current_academic_year, school_address, school_email, school_phone')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay
            console.error("HomePage: Supabase error fetching settings:", error);
            // On error, return defaults to prevent site crash
            return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
        }
        
        // Even if no data, we provide defaults to avoid null/undefined issues.
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
        console.error("HomePage: A critical error occurred while fetching page data:", e.message);
        // Fallback to default settings if anything goes wrong, including getSupabase() failing.
        return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
    }
}

export default async function HomePage() {
  const pageData = await getPageData();
  
  return (
    <HomePageClient branding={pageData.branding} contactInfo={pageData.contactInfo} />
  );
}
