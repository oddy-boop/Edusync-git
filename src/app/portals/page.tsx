
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, Loader2, School } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { createClient } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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
  const [error, setError] = useState<string | null>(null);
  const [schoolExists, setSchoolExists] = useState(false);

  useEffect(() => {
    async function fetchSchoolSettings() {
      const supabase = createClient();
      const host = window.location.host;
      const subdomain = getSubdomain(host);

      try {
        let schoolQuery;
        if (subdomain) {
            schoolQuery = supabase.from('schools').select('name, logo_url, current_academic_year').eq('domain', subdomain).single();
        } else {
            schoolQuery = supabase.from('schools').select('name, logo_url, current_academic_year').order('created_at', { ascending: true }).limit(1).single();
        }
        
        const { data, error: queryError } = await schoolQuery;
        
        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows found
             throw queryError;
        }
        
        if (data) {
          setSchoolExists(true);
          setSchoolName(data.name || "School Portals");
          setLogoUrl(data.logo_url);
          setAcademicYear(data.current_academic_year);
        } else {
          setSchoolExists(false);
          setError("No school configured.");
          setSchoolName("School Portals");
        }
      } catch (e: any) {
        console.error("Could not fetch school settings for portals page:", e);
        setError("Could not fetch school settings.");
        setSchoolName("School Portals");
        setSchoolExists(false);
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

  if (!schoolExists) {
    return (
      <AuthLayout
        title="Configuration Needed"
        description="The application is not yet set up."
        schoolName="EduSync"
      >
        <Alert variant="destructive">
            <School className="h-5 w-5" />
            <AlertTitle>Welcome to EduSync!</AlertTitle>
            <AlertDescription>
                <p className="font-semibold">No school has been configured yet.</p>
                <p className="text-xs mt-2">
                  Please visit the setup page to create the first administrator account.
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link href="/auth/setup/super-admin">
                    Go to Super Admin Setup
                  </Link>
                </Button>
            </AlertDescription>
        </Alert>
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
