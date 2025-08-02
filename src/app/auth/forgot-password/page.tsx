
"use client";

import AuthLayout from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchoolSettings() {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setSchoolName(data.school_name);
          setLogoUrl(data.school_logo_url);
        }
      } catch (error) {
        console.error("Could not fetch school settings for forgot password page:", error);
      }
    }
    fetchSchoolSettings();
  }, []);

  return (
    <AuthLayout
      title="Reset Your Password"
      description="Enter your email address and we'll send you a link to reset your password."
      schoolName={schoolName}
      logoUrl={logoUrl}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
