
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import { getSubdomain } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import React from 'react';
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [settings, setSettings] = React.useState<{ name: string | null, logo_url: string | null, current_academic_year: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function getSchoolSettings() {
      const supabase = createClient();
      const host = window.location.host;
      const subdomain = getSubdomain(host);

      try {
        let query;
        if (subdomain) {
          query = supabase.from('schools').select('name, logo_url, current_academic_year').eq('domain', subdomain).single();
        } else {
          query = supabase.from('schools').select('name, logo_url, current_academic_year').order('created_at', { ascending: true }).limit(1).single();
        }
        
        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;
        setSettings(data);
      } catch (error) {
        console.error("Could not fetch school settings for admin login:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getSchoolSettings();
  }, []);

  if (isLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary"/>
          </div>
      );
  }

  return (
    <AuthLayout
      title="Admin Portal Login"
      description="Access the administrative dashboard."
      schoolName={settings?.name}
      logoUrl={settings?.logo_url}
      academicYear={settings?.current_academic_year}
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}
