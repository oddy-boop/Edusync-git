
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import React from 'react';
import { Loader2 } from "lucide-react";

// NOTE: This is a placeholder for a proper API call.
async function getSchoolSettings() {
    return { name: "EduSync", logo_url: null, current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` };
}

export default function ForgotPasswordPage() {
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
      title="Reset Your Password"
      description="Enter your email address and we'll send you a link to reset your password."
      schoolName={settings?.name}
      logoUrl={settings?.logo_url}
      academicYear={settings?.current_academic_year}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
