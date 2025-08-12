
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { UpdatePasswordForm } from "@/components/forms/UpdatePasswordForm";
import { Suspense } from 'react';
import React from 'react';
import { Loader2 } from "lucide-react";

// NOTE: This is a placeholder for a proper API call.
async function getSchoolSettings() {
    return { name: "EduSync", logo_url: null, current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` };
}

export default function UpdatePasswordPage() {
  const [settings, setSettings] = React.useState<{ name: string | null, logo_url: string | null, current_academic_year: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchSchoolSettings() {
      // client-side logic placeholder
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
      title="Update Your Password"
      description="Enter your new password below. Make sure it's strong and memorable."
      schoolName={settings?.name}
      logoUrl={settings?.logo_url}
      academicYear={settings?.current_academic_year}
    >
      <Suspense>
        <UpdatePasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
