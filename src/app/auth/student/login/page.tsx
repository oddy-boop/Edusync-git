
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import React from 'react';
import { getSubdomain } from '@/lib/utils';
import pool from "@/lib/db";
import { Loader2 } from "lucide-react";

export default function StudentLoginPage() {
  const [settings, setSettings] = React.useState<{ name: string | null, logo_url: string | null, current_academic_year: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function getSchoolSettings() {
      // client-side logic placeholder
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
