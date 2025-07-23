
"use client";

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

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface HomepageSettings {
    homepage_slideshow: HomepageSlide[];
}

export default function HomePage() {
  const [settings, setSettings] = React.useState<HomepageSettings | null>(null);
  const autoplayPlugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  React.useEffect(() => {
    const supabase = getSupabase();
    async function getPublicSettings() {
        try {
            const { data } = await supabase.from('app_settings').select('homepage_slideshow').eq('id', 1).single();
            setSettings(data as HomepageSettings);
        } catch (error) {
            console.error("Could not fetch public data for homepage:", error);
        }
    }
    getPublicSettings();
  }, []);

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
        <section className="relative bg-primary text-primary-foreground h-[60vh] md:h-[80vh] flex items-center">
            <Carousel
                plugins={[autoplayPlugin.current]}
                className="w-full h-full"
                onMouseEnter={autoplayPlugin.current.stop}
                onMouseLeave={autoplayPlugin.current.reset}
            >
                <CarouselContent className="h-full">
                    {slideshow.length > 0 ? slideshow.map((slide) => (
                        <CarouselItem key={slide.id} className="h-full">
                            <div className="relative w-full h-full">
                                <Image
                                    src={slide.imageUrl}
                                    alt={slide.title}
                                    fill
                                    className="object-cover opacity-20"
                                    priority
                                    data-ai-hint="modern campus"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="container mx-auto px-4 text-center">
                                        <div className="max-w-4xl mx-auto">
                                            <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight">
                                               {slide.title}
                                            </h1>
                                            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
                                                {slide.subtitle}
                                            </p>
                                            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold py-6 px-10">
                                                <Link href="/admissions">Get Started</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    )) : (
                        <CarouselItem className="h-full">
                             <div className="relative w-full h-full">
                                <Image
                                    src="https://placehold.co/1920x1080.png"
                                    alt="Abstract background of a modern school campus"
                                    fill
                                    className="object-cover opacity-10"
                                    priority
                                    data-ai-hint="modern campus"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="container mx-auto px-4 text-center">
                                        <div className="max-w-4xl mx-auto">
                                            <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight">
                                               Boost Your <span className="text-accent">Success</span> With Our Expert Educational Programs
                                            </h1>
                                            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
                                                We provide a transformative educational experience, nurturing talent and fostering a community of lifelong learners ready to make their mark on the world.
                                            </p>
                                            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold py-6 px-10">
                                                <Link href="/admissions">Get Started</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    )}
                </CarouselContent>
            </Carousel>
        </section>
      
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
