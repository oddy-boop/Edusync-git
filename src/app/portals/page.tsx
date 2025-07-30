
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getSupabase } from '@/lib/supabaseClient';

const portalOptions = [
    {
      title: "Student Portal",
      description: "Access your results, progress reports, and fee statements.",
      icon: User,
      link: "/auth/student/login",
      cta: "Login as Student"
    },
    {
      title: "Teacher Portal",
      description: "Manage attendance, assignments, results, and lesson plans.",
      icon: BookOpen,
      link: "/auth/teacher/login",
      cta: "Login as Teacher"
    },
    {
      title: "Admin Portal",
      description: "Oversee all school operations and system settings.",
      icon: UserCog,
      link: "/auth/admin/login",
      cta: "Login as Admin"
    },
];

export default function PortalsPage() {
  const [schoolName, setSchoolName] = useState<string | null>("School Portals");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSchoolSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('school_name, school_logo_url')
          .eq('id', 1)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setSchoolName(data.school_name || "School Portals");
          setLogoUrl(data.school_logo_url);
        }
      } catch (error) {
        console.error("Could not fetch school settings for portals page:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchoolSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading Portals...</p>
      </div>
    );
  }

  return (
    <AuthLayout
        title={`${schoolName || 'School'} Portals`}
        description="Select your role to access your dedicated dashboard."
        schoolName={schoolName}
        logoUrl={logoUrl}
    >
        <div className="space-y-6">
            {portalOptions.map((portal) => (
                <Card key={portal.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                            <portal.icon className="w-6 h-6" />
                        </div>
                        <div className='flex-1'>
                            <CardTitle className="text-xl font-semibold text-primary">{portal.title}</CardTitle>
                            <CardDescription className="text-foreground/70">{portal.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href={portal.link}>
                                {portal.cta} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    </AuthLayout>
  );
}
