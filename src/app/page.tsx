
import * as React from 'react';
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, TrendingUp, Lightbulb, Megaphone, School } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { HomepageCarousel } from '@/components/shared/HomepageCarousel';

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface HomepageSettings {
    homepage_slideshow: HomepageSlide[];
}

async function getHomepageSettings() {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings').select('homepage_slideshow').eq('id', 1).single();
        return data as HomepageSettings;
    } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
        return null;
    }
}


export default async function HomePage() {
  const settings = await getHomepageSettings();

  const slideshow = settings?.homepage_slideshow?.filter(s => s.imageUrl) || [];

  const features = [
    {
      icon: ShieldCheck,
      title: "Credibility and Trust",
      description: "Our accredited programs and experienced faculty provide a solid foundation for academic and personal growth."
    },
    {
      icon: Users,
      title: "Broader Audience",
      description: "Join a diverse and vibrant community of students from various backgrounds, fostering a rich learning environment."
    },
    {
      icon: Lightbulb,
      title: "Digital Learning",
      description: "Leverage our modern digital tools, online resources, and interactive platforms to enhance your educational journey."
    },
    {
      icon: TrendingUp,
      title: "Increased Opportunities",
      description: "Our strong industry connections and dedicated career services open doors to internships and successful careers."
    },
    {
      icon: Megaphone,
      title: "Brand Awareness",
      description: "Graduate with a respected degree that is recognized by employers and institutions worldwide."
    },
    {
      icon: School,
      title: "Modern Facilities",
      description: "Learn in a state-of-the-art environment designed for collaboration, innovation, and academic excellence."
    },
  ];

  return (
    <PublicLayout>
        <HomepageCarousel slides={slideshow} />
      
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center shadow-md hover:shadow-xl transition-transform duration-300 hover:-translate-y-2 border-t-4 border-accent bg-card">
                <CardHeader className="items-center pt-8">
                  <div className="mx-auto bg-accent/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary/5 py-20">
        <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold text-primary font-headline mb-4">
                Join Our Community
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Discover the right path for your child's future. Contact our admissions team today to learn more about our programs and how to enroll.
            </p>
            <div className="flex justify-center gap-4">
                <Button asChild size="lg" variant="default" className="bg-primary text-primary-foreground">
                    <Link href="/admissions">Admissions Info</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/contact">Contact Us</Link>
                </Button>
            </div>
        </div>
      </section>
    </PublicLayout>
  );
}
