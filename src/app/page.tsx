
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarCheck, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

async function getPublicSettings() {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings').select('homepage_title, homepage_subtitle, homepage_slideshow').single();
        return data;
    } catch (error) {
        console.error("Could not fetch public settings for homepage:", error);
        return null;
    }
}

export default async function HomePage() {
  const settings = await getPublicSettings();
  const homepageTitle = settings?.homepage_title || "EduSync Platform";
  const homepageSubtitle = settings?.homepage_subtitle || "Nurturing Minds, Building Futures.";
  const slideshow: HomepageSlide[] = settings?.homepage_slideshow || [];

  return (
    <PublicLayout>
       {slideshow.length > 0 ? (
        <section className="w-full">
            <Carousel
                plugins={[ Autoplay({ delay: 5000, stopOnInteraction: true }) ]}
                className="w-full"
                opts={{ loop: true }}
            >
                <CarouselContent>
                    {slideshow.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className="relative h-[60vh] min-h-[400px] w-full">
                                <Image
                                    src={slide.imageUrl || "https://placehold.co/1200x600.png"}
                                    alt={slide.title}
                                    layout="fill"
                                    objectFit="cover"
                                    className="brightness-50"
                                    data-ai-hint="school students"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
                                    <h1 className="text-4xl md:text-6xl font-bold font-headline drop-shadow-lg">
                                        {slide.title}
                                    </h1>
                                    <p className="mt-4 text-lg md:text-xl max-w-3xl drop-shadow-md">
                                        {slide.subtitle}
                                    </p>
                                    <Button asChild size="lg" className="mt-8">
                                        <Link href="/admissions">Enroll Now</Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:border-white" />
                <CarouselNext className="absolute right-4 text-white bg-black/30 hover:bg-black/50 border-white/50 hover:border-white" />
            </Carousel>
        </section>
      ) : (
        <section className="bg-primary/5 py-20 text-center">
            <div className="container mx-auto">
            <h1 className="text-5xl font-bold text-primary mb-4 font-headline">
                {homepageTitle}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
                {homepageSubtitle}
            </p>
            <Button asChild size="lg">
                <Link href="/admissions">Enroll Now</Link>
            </Button>
            </div>
        </section>
      )}


      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4 font-headline">
            Explore Our Programs
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            From creche to Junior High School, our curriculum is designed to challenge and inspire students at every level.
          </p>
          <Button asChild variant="outline">
            <Link href="/programs">Learn More</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
