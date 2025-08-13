
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import React from 'react';
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

async function getSchoolSettings() {
    const supabase = createClient();
    // In a multi-tenant app, you might derive this from the domain.
    // For now, we fetch the first created school as the default.
    const { data } = await supabase.from('schools').select('name, logo_url, current_academic_year').order('created_at', {ascending: true}).limit(1).single();
    return data || { name: "EduSync", logo_url: null, current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` };
}

export default function AdminLoginPage() {
  const [settings, setSettings] = React.useState<{ name: string | null, logo_url: string | null, current_academic_year: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchSchoolSettings() {
      const settings = await getSchoolSettings();
      setSettings(settings);
      setIsLoading(false);
    }
    fetchSchoolSettings();
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
