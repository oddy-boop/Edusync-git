
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BookOpen, ShieldCheck, Users, Milestone } from "lucide-react";
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
import { format } from "date-fns";

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface Announcement {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

async function getPublicSettings() {
    const supabase = getSupabase();
    try {
        const [settingsRes, announcementsRes] = await Promise.all([
            supabase.from('app_settings').select('homepage_title, homepage_subtitle, homepage_slideshow').eq('id', 1).single(),
            supabase.from('school_announcements').select('id, title, message, created_at').or('target_audience.eq.All,target_audience.eq.Students').order('created_at', { ascending: false }).limit(3)
        ]);
        
        if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
             console.error("Could not fetch public settings for homepage:", settingsRes.error);
        }
        if (announcementsRes.error) {
            console.error("Could not fetch announcements for homepage:", announcementsRes.error);
        }

        return {
            settings: settingsRes.data,
            announcements: announcementsRes.data,
        };

    } catch (error) {
        console.error("Could not fetch public data for homepage:", error);
        return { settings: null, announcements: [] };
    }
}

export default async function HomePage() {
  const { settings, announcements } = await getPublicSettings();
  const homepageTitle = settings?.homepage_title || "EduSync Platform";
  const homepageSubtitle = settings?.homepage_subtitle || "Nurturing Minds, Building Futures.";
  const slideshow: HomepageSlide[] = settings?.homepage_slideshow || [];

  const features = [
    {
      icon: Users,
      title: "Expert Faculty",
      description: "Our teachers are passionate, experienced, and dedicated to nurturing each student's potential."
    },
    {
      icon: BookOpen,
      title: "Modern Curriculum",
      description: "We offer a balanced and comprehensive curriculum that prepares students for future challenges."
    },
    {
      icon: ShieldCheck,
      title: "Safe & Inclusive Environment",
      description: "We prioritize a secure and supportive atmosphere where every student feels valued and respected."
    },
    {
      icon: Milestone,
      title: "Holistic Development",
      description: "We focus on academic excellence, character building, and extracurricular engagement."
    },
  ];

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
                                    fill
                                    className="object-cover brightness-50"
                                    priority={true}
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
      
      <section className="py-16">
        <div className="container mx-auto">
          <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-primary mb-4 font-headline">
                Why Choose Our School?
             </h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">
                We are committed to providing an exceptional educational experience that fosters growth, creativity, and a lifelong love of learning.
             </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {announcements && announcements.length > 0 && (
        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-primary mb-4 font-headline">
                  Latest News & Events
               </h2>
               <p className="text-muted-foreground max-w-2xl mx-auto">
                  Stay up to date with the latest happenings at our school.
               </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    <CardDescription>{format(new Date(announcement.created_at), "do MMMM, yyyy")}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground line-clamp-4">{announcement.message}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="link" className="p-0" asChild>
                        <Link href="/contact">Read More</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold font-headline mb-4">
                Join Our Community
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Discover the right path for your child's future. Contact our admissions team today to learn more about our programs and how to enroll.
            </p>
            <div className="flex justify-center gap-4">
                <Button asChild size="lg" variant="secondary">
                    <Link href="/admissions">Admissions Info</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    <Link href="/contact">Contact Us</Link>
                </Button>
            </div>
        </div>
      </section>

    </PublicLayout>
  );
}
