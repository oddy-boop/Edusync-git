
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, Users, DollarSign, Edit3, BarChart2, Brain, Loader2 } from 'lucide-react';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';
import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';


interface BrandingSettings {
  school_name: string;
  school_slogan?: string;
  school_hero_image_url: string;
  current_academic_year?: string;
}

const defaultBrandingSettings: BrandingSettings = {
  school_name: "St. Joseph's Montessori",
  school_slogan: "A modern solution for St. Joseph's Montessori (Ghana) to manage school operations, enhance learning, and empower students, teachers, and administrators.",
  school_hero_image_url: "https://placehold.co/1200x600.png",
  current_academic_year: `${new Date().getFullYear()}`,
};

export default function HomePage() {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBrandingSettings);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const isMounted = useRef(true);


  useEffect(() => {
    isMounted.current = true;
    
    async function fetchBrandingSettings() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoadingBranding(true);

      let supabase: SupabaseClient | null = null;
      try {
        supabase = getSupabase();
      } catch (initError: any) {
        console.error("HomePage: Failed to initialize Supabase client:", initError.message);
        if (isMounted.current) {
          setBranding(defaultBrandingSettings);
          setIsLoadingBranding(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('school_name, school_slogan, school_hero_image_url, current_academic_year')
          .eq('id', 1)
          .single();

        if (isMounted.current) {
            if (error && error.code !== 'PGRST116') {
              console.error("HomePage: Error loading app settings from Supabase:", error.message);
              setBranding(defaultBrandingSettings);
            } else if (data) {
              setBranding({
                school_name: data.school_name || defaultBrandingSettings.school_name,
                school_slogan: data.school_slogan || defaultBrandingSettings.school_slogan,
                school_hero_image_url: data.school_hero_image_url || defaultBrandingSettings.school_hero_image_url,
                current_academic_year: data.current_academic_year || defaultBrandingSettings.current_academic_year,
              });
            } else {
              setBranding(defaultBrandingSettings);
              console.warn("HomePage: No app_settings found, using defaults.");
            }
        }
      } catch (e: any) {
        console.error("HomePage: Exception fetching app settings:", e.message);
        if (isMounted.current) setBranding(defaultBrandingSettings);
      } finally {
        if (isMounted.current) setIsLoadingBranding(false);
      }
    }

    fetchBrandingSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, []);


  const features = [
    {
      title: "Fee Management",
      description: "Streamlined configuration of school fees across all grade levels.",
      icon: DollarSign,
      link: "/auth/admin/login",
      cta: "Admin Portal"
    },
    {
      title: "Attendance & Behavior",
      description: "Digital tracking for daily student attendance and behavior incidents.",
      icon: Edit3,
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
    {
      title: "Assignment System",
      description: "Efficiently create, distribute, and grade student assignments.",
      icon: BookOpen,
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
    {
      title: "Student Results",
      description: "Access payment-gated results and track academic progress.",
      icon: BarChart2,
      link: "/auth/student/login",
      cta: "Student Portal"
    },
    {
      title: "AI Lesson Planner",
      description: "Intelligent assistant for generating innovative lesson plan ideas.",
      icon: Brain,
      link: "/auth/teacher/login",
      cta: "Teacher Portal"
    },
  ];

  if (isLoadingBranding) {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading school information...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <main className="flex-grow">
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary mb-6">
              Welcome to {branding.school_name}
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-3xl mx-auto">
              {branding.school_slogan}
            </p>
            <div className="flex justify-center items-center space-x-4 mb-12">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/student/login">
                  Student Login <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/teacher/login">
                  Teacher Login <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
             <div className="relative aspect-[2/1] w-full max-w-[1200px] mx-auto rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={branding.school_hero_image_url || defaultBrandingSettings.school_hero_image_url}
                alt={`${branding.school_name || 'School'} Campus`}
                fill
                className="object-cover"
                data-ai-hint="school campus students"
                priority
              />
              <div className="absolute inset-0 bg-primary/30"></div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold text-primary text-center mb-12">
              Core Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-center text-primary">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription className="text-center text-foreground/70">{feature.description}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Button variant="link" asChild className="w-full text-accent hover:text-accent/80">
                      <Link href={feature.link}>
                        ACCESS {feature.cta.toUpperCase()} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-headline font-semibold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg md:text-xl opacity-80 mb-10 max-w-2xl mx-auto">
              Log in to your respective portal to access dedicated tools and resources.
            </p>
            <div className="space-x-4">
              <Button size="lg" variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/auth/admin/login">Admin Portal</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MainFooter academicYear={branding.current_academic_year} />
    </div>
  );
}
