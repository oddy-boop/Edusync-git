
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import React from 'react';
import { Loader2 } from "lucide-react";

// NOTE: This is a placeholder for a proper API call.
async function getSchoolSettings() {
    return { name: "EduSync", logo_url: null, current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` };
}

export default function StudentLoginPage() {
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
      title="Student Portal Login"
      description="Enter your email and password to continue."
      schoolName={settings?.name}
      logoUrl={settings?.logo_url}
      academicYear={settings?.current_academic_year}
    >
      <StudentLoginForm />
    </AuthLayout>
  );
}
