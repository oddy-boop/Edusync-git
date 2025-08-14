
'use client';

import PublicLayout from "@/components/layout/PublicLayout";
import { ContactForm } from "@/components/forms/ContactForm";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from 'react';
import { Loader2 } from "lucide-react";
import { getSchoolSettings } from "@/lib/actions/settings.actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { School as SchoolIcon } from "lucide-react";

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


export default function ContactPage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchContactPageSettings() {
      try {
        const result = await getSchoolSettings();
        if (result.error) {
            throw new Error(result.error);
        }
        const data = result.data;
        if(data) {
            setSettings({
              schoolName: data.name,
              schoolEmail: data.email,
              schoolPhone: data.phone,
              schoolAddress: data.address,
              logoUrl: data.logo_url,
              socials: {
                  facebook: data.facebook_url,
                  twitter: data.twitter_url,
                  instagram: data.instagram_url,
                  linkedin: data.linkedin_url,
              },
              academicYear: data.current_academic_year,
              updated_at: data.updated_at,
            });
        } else {
            throw new Error("School settings could not be loaded.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
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
  
  if (error) {
      return (
          <PublicLayout schoolName="Error" logoUrl={null} socials={null} updated_at={undefined} schoolAddress={null} schoolEmail={null} academicYear={null}>
             <div className="container mx-auto py-16 px-4">
                <Alert variant="destructive" className="max-w-xl mx-auto">
                  <SchoolIcon className="h-5 w-5" />
                  <AlertTitle>Application Error</AlertTitle>
                  <AlertDescription>
                    <p className="font-semibold whitespace-pre-wrap">{error}</p>
                  </AlertDescription>
                </Alert>
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
