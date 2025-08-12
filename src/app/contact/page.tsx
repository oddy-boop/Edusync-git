
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from 'react';
import { Loader2 } from "lucide-react";

interface PageSettings {
    schoolName: string | null;
    schoolEmail: string | null;
    schoolPhone: string | null;
    schoolAddress: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    academicYear?: string | null;
    updated_at?: string;
}

// NOTE: This is a placeholder for a proper API call.
async function getContactPageSettings() {
    return { settings: null, error: "Data fetching not implemented." };
}

export default function ContactPage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchContactPageSettings() {
      // client-side logic placeholder
      const { settings, error } = await getContactPageSettings();
      if(settings) {
          setSettings(settings);
      }
      setIsLoading(false);
    }
    fetchContactPageSettings();
  }, []);
  
  if (isLoading) {
    return (
      <PublicLayout schoolName={null} logoUrl={null} socials={null} updated_at={undefined} schoolAddress={null} schoolEmail={null} academicYear={null}>
        <div className="h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout 
        schoolName={settings?.schoolName} 
        logoUrl={settings?.logoUrl} 
        socials={settings?.socials} 
        updated_at={settings?.updated_at}
        schoolAddress={settings?.schoolAddress}
        schoolEmail={settings?.schoolEmail}
        academicYear={settings?.academicYear}
    >
       <div className="container mx-auto py-16 px-4">
        <AnimatedSection className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
                <p><strong>Address:</strong> {settings?.schoolAddress || "Not Available"}</p>
                <p><strong>Email:</strong> {settings?.schoolEmail || "Not Available"}</p>
                <p><strong>Phone:</strong> {settings?.schoolPhone || "Not Available"}</p>
            </div>
          </div>
          <ContactForm />
        </AnimatedSection>
      </div>
    </PublicLayout>
  );
}
