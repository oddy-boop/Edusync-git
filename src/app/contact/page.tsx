
"use client";

import PublicLayout from "@/components/layout/PublicLayout";
import { useActionState, useRef, useEffect, useState } from 'react';
import { ContactForm } from "@/components/forms/ContactForm";
import { getSupabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface PageSettings {
    schoolName: string | null;
    schoolEmail: string | null;
    schoolPhone: string | null;
    schoolAddress: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
}

export default function ContactPage() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getContactPageSettings() {
      const supabase = getSupabase();
      try {
        const { data } = await supabase.from('app_settings').select('school_name, school_logo_url, school_email, school_phone, school_address, facebook_url, twitter_url, instagram_url, linkedin_url').single();
        setSettings({
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            schoolEmail: data?.school_email,
            schoolPhone: data?.school_phone,
            schoolAddress: data?.school_address,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
        });
      } catch (error) {
        console.error("Could not fetch settings for contact page:", error);
         setSettings({
            schoolName: 'EduSync',
            logoUrl: null,
            schoolEmail: 'info@edusync.com',
            schoolPhone: '+233 12 345 6789',
            schoolAddress: 'Accra, Ghana',
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
        });
      } finally {
        setIsLoading(false);
      }
    }
    getContactPageSettings();
  }, []);

  return (
    <PublicLayout schoolName={settings?.schoolName} logoUrl={settings?.logoUrl} socials={settings?.socials}>
       <div className="container mx-auto py-16 px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4 font-headline">Get In Touch</h1>
            <p className="text-muted-foreground mb-6">
              Have questions about admissions, programs, or anything else? We're here to help.
              Fill out the form, and our team will get back to you as soon as possible.
            </p>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
            ) : (
                <div className="space-y-4 text-sm">
                    <p><strong>Address:</strong> {settings?.schoolAddress || "Not Available"}</p>
                    <p><strong>Email:</strong> {settings?.schoolEmail || "Not Available"}</p>
                    <p><strong>Phone:</strong> {settings?.schoolPhone || "Not Available"}</p>
                </div>
            )}
          </div>
          <ContactForm />
        </div>
      </div>
    </PublicLayout>
  );
}
