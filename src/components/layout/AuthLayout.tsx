"use client";

import { Logo } from '@/components/shared/Logo';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

export default function AuthLayout({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    // This is a client component, so we can safely check the hostname.
    const hostname = window.location.hostname;
    const mainSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const mainDomain = mainSiteUrl ? new URL(mainSiteUrl).hostname : "";

    // If on a custom domain, fetch that school's name. Otherwise, fetch the default.
    async function fetchSchoolName() {
        const supabase = getSupabase();
        let schoolId: string | null = null;
        
        if (hostname !== mainDomain && hostname !== 'localhost') {
            const { data: schoolData } = await supabase
                .from('schools')
                .select('id')
                .eq('domain', hostname)
                .single();
            if (schoolData) schoolId = schoolData.id;
        }

        // If no custom domain match, find the default school (first created)
        if (!schoolId) {
             const { data: mainSchool } = await supabase
                .from('schools')
                .select('id')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
            if (mainSchool) schoolId = mainSchool.id;
        }
        
        if (schoolId) {
            const { data: settings } = await supabase
                .from('app_settings')
                .select('school_name')
                .eq('school_id', schoolId)
                .single();
            if (settings) {
                setSchoolName(settings.school_name);
            }
        }
    }

    fetchSchoolName();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b">
        <Logo size="md" schoolName={schoolName} />
      </header>
      <main className="flex-grow flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-headline font-semibold text-primary">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          {children}
        </div>
      </main>
       <footer className="py-6 px-6 border-t text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()}. All Rights Reserved.
      </footer>
    </div>
  );
}
