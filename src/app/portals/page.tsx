
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, Loader2, School, AlertCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getSubdomain } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

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

// Placeholder for a proper API call
async function getSchoolSettings(subdomain: string | null) {
    const supabase = createClient();
    let query = supabase.from('schools').select('name, logo_url, current_academic_year');
    if(subdomain) {
        query = query.eq('domain', subdomain);
    } else {
        query = query.order('created_at', { ascending: true });
    }
    const { data, error } = await query.limit(1).single();

    if(error && error.code !== 'PGRST116') {
        console.error("Error fetching school settings:", error);
        return { name: "EduSync", logo_url: null, current_academic_year: null, error: error.message, schoolExists: false };
    }
    
    if(!data) {
        return { name: "EduSync", logo_url: null, current_academic_year: null, error: 'No school configured for this domain.', schoolExists: false };
    }

    return { 
        name: data.name || "EduSync School", 
        logo_url: data.logo_url, 
        current_academic_year: data.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        error: null,
        schoolExists: true,
    };
}


export default function PortalsPage() {
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolExists, setSchoolExists] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchSchoolSettings() {
      const host = window.location.host;
      const subdomain = getSubdomain(host);

      const { name, logo_url, current_academic_year, error, schoolExists } = await getSchoolSettings(subdomain);
      
      if (error) {
          setError(error);
      } else {
          setSchoolName(name);
          setLogoUrl(logo_url);
          setAcademicYear(current_academic_year);
      }
      setSchoolExists(schoolExists);
      setIsLoading(false);
    }
    fetchSchoolSettings();
  }, []);

  if (isLoading || schoolExists === null) {
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
                <p className="font-semibold">{error || 'No school has been configured yet.'}</p>
                <p className="text-xs mt-2">
                  If this is a new installation, please visit the setup page to create the first administrator account.
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
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>For School Members</AlertTitle>
                <AlertDescription>
                    If your school has a specific web address (e.g., `campus1.edusync.com`), please use that address to log in directly.
                </AlertDescription>
            </Alert>

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
