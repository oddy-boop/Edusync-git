
import AuthLayout from "@/components/layout/AuthLayout";
import { UpdatePasswordForm } from "@/components/forms/UpdatePasswordForm";
import { Suspense } from 'react';
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Prevent caching of this page

async function getSchoolSettings() {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, current_academic_year').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error("Could not fetch school settings for update password page:", error);
        return null;
    }
}

export default async function UpdatePasswordPage() {
  const settings = await getSchoolSettings();

  return (
    <AuthLayout
      title="Update Your Password"
      description="Enter your new password below. Make sure it's strong and memorable."
      schoolName={settings?.school_name}
      logoUrl={settings?.school_logo_url}
      academicYear={settings?.current_academic_year}
    >
      <Suspense>
        <UpdatePasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
