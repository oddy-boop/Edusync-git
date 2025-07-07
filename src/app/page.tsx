import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, Users, GraduationCap, Baby } from 'lucide-react';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';
import { getSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface BrandingSettings {
  school_name: string;
  school_slogan: string;
  school_hero_image_url: string;
  current_academic_year?: string;
}

const defaultBrandingSettings: BrandingSettings = {
  school_name: "St. Joseph's Montessori",
  school_slogan: "A tradition of excellence, a future of innovation.",
  school_hero_image_url: "https://placehold.co/1200x600.png",
  current_academic_year: `${new Date().getFullYear()}`,
};

async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('app_settings')
      .select('school_name, school_slogan, school_hero_image_url, current_academic_year')
      .eq('id', 1)
      .single();
    
    return {
      school_name: data?.school_name || defaultBrandingSettings.school_name,
      school_slogan: data?.school_slogan || defaultBrandingSettings.school_slogan,
      school_hero_image_url: data?.school_hero_image_url || defaultBrandingSettings.school_hero_image_url,
      current_academic_year: data?.current_academic_year || defaultBrandingSettings.current_academic_year,
    };
  } catch(e) {
    console.error("Could not fetch branding settings, using defaults.", e);
    return defaultBrandingSettings;
  }
}

const programLevels = [
    { name: "Creche & Nursery", description: "Nurturing care and foundational learning for our youngest students.", icon: Baby },
    { name: "Kindergarten", description: "Play-based learning that prepares children for primary education.", icon: Users },
    { name: "Primary School", description: "A comprehensive curriculum focusing on core academic skills.", icon: BookOpen },
    { name: "Junior High School", description: "Advanced studies to prepare students for their future academic pursuits.", icon: GraduationCap },
];

export default async function HomePage() {
  const branding = await getBrandingSettings();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center text-center text-white">
          <Image
            src={branding.school_hero_image_url}
            alt={`${branding.school_name} Campus`}
            fill
            className="object-cover"
            data-ai-hint="school students happy"
            priority
          />
          <div className="absolute inset-0 bg-primary/60"></div>
          <div className="relative z-10 p-6">
            <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4 drop-shadow-lg">
              {branding.school_name}
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto drop-shadow-md">
              {branding.school_slogan}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/admissions">
                  Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-transparent border-white text-white hover:bg-white/20 shadow-lg transition-transform hover:scale-105">
                <Link href="/about">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Welcome Section */}
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-headline font-semibold text-primary mb-4">Welcome to Our School</h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    At St. Joseph's Montessori, we are dedicated to fostering a nurturing and challenging environment where students can thrive academically, socially, and personally. Explore our website to discover our unique programs and vibrant community.
                </p>
            </div>
        </section>

        {/* Programs Section */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold text-primary text-center mb-12">
              Our Academic Programs
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {programLevels.map((program) => (
                <Card key={program.name} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col text-center">
                  <CardHeader>
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                      <program.icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-primary">{program.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{program.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
             <div className="text-center mt-12">
                <Button asChild>
                    <Link href="/programs">Explore All Programs <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold mb-6">
              Join Our Community
            </h2>
            <p className="text-lg md:text-xl opacity-80 mb-10 max-w-2xl mx-auto">
              Ready to start your journey with us? Learn more about our admissions process or get in touch with our team.
            </p>
            <div className="flex justify-center items-center space-x-4">
              <Button size="lg" variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/admissions">Admissions Info</Link>
              </Button>
               <Button size="lg" variant="outline" asChild className="bg-transparent border-white text-white hover:bg-white/20 shadow-lg transition-transform hover:scale-105">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MainFooter academicYear={branding.current_academic_year} />
    </div>
  );
}
