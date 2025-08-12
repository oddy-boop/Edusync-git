
import AuthLayout from "@/components/layout/AuthLayout";
import { UpdatePasswordForm } from "@/components/forms/UpdatePasswordForm";
import { Suspense } from 'react';
import { createClient } from "@/lib/supabase/server";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';

export const revalidate = 0; // Prevent caching of this page

async function getSchoolSettings() {
    const supabase = createClient();
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);

    try {
        let schoolQuery = supabase.from('schools');
        if (subdomain) {
            schoolQuery = schoolQuery.select('name, logo_url, current_academic_year').eq('domain', subdomain).single();
        } else {
            schoolQuery = schoolQuery.select('name, logo_url, current_academic_year').eq('id', 1).single(); // Fallback to ID 1
        }
        
        const { data, error } = await schoolQuery;
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
