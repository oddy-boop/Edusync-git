
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { createClient } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils';


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
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSchoolSettings() {
      const supabase = createClient();
      const host = window.location.host;
      const subdomain = getSubdomain(host);

      try {
        let schoolQuery = supabase.from('schools');
        if (subdomain) {
            schoolQuery = schoolQuery.select('name, logo_url, current_academic_year').eq('domain', subdomain).single();
        } else {
            schoolQuery = schoolQuery.select('name, logo_url, current_academic_year').eq('id', 1).single(); // Fallback
        }
        
        const { data, error } = await schoolQuery;
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setSchoolName(data.name || "School Portals");
          setLogoUrl(data.logo_url);
          setAcademicYear(data.current_academic_year);
        } else {
          setSchoolName("School Portals");
        }
      } catch (error) {
        console.error("Could not fetch school settings for portals page:", error);
        setSchoolName("School Portals");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchoolSettings();
  }, []);

  if (isLoading) {
    return (
      <AuthLayout
        title="Loading Portals..."
        description="Please wait while we fetch school details."
        schoolName="School"
      >
        <div className="flex items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
        title={`${schoolName || 'School'} Portals`}
        description="Select your role to access your dedicated dashboard."
        schoolName={schoolName}
        logoUrl={logoUrl}
        academicYear={academicYear}
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
