
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
    email: "info@stjosephmontessori.edu.gh",
    phone: "+233 12 345 6789",
};

async function getPageData() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('app_settings')
        .select('school_name, school_slogan, homepage_hero_slides, current_academic_year, school_address, school_email, school_phone')
        .eq('id', 1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("HomePage: Supabase error fetching settings:", error);
        return { branding: defaultBrandingSettings, contactInfo: defaultContactInfo };
    }
    
    const branding = {
        school_name: data?.school_name || defaultBrandingSettings.school_name,
        school_slogan: data?.school_slogan || defaultBrandingSettings.school_slogan,
        homepage_hero_slides: data?.homepage_hero_slides || defaultBrandingSettings.homepage_hero_slides,
        current_academic_year: data?.current_academic_year || defaultBrandingSettings.current_academic_year,
    };
    const contactInfo = {
        address: data?.school_address || defaultContactInfo.address,
        email: data?.school_email || defaultContactInfo.email,
        phone: data?.school_phone || defaultContactInfo.phone,
    };

    return { branding, contactInfo };
}

export default async function HomePage() {
  const { branding, contactInfo } = await getPageData();
  
  return (
    <HomePageClient branding={branding} contactInfo={contactInfo} />
  );
}
