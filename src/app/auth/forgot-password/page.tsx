
import AuthLayout from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
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
        let schoolQuery;
        if (subdomain) {
            schoolQuery = supabase.from('schools').select('name, logo_url, current_academic_year').eq('domain', subdomain).single();
        } else {
            schoolQuery = supabase.from('schools').select('name, logo_url, current_academic_year').order('created_at', { ascending: true }).limit(1).single();
        }
        
        const { data, error } = await schoolQuery;
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error("Could not fetch school settings for forgot password page:", error);
        return null;
    }
}

export default async function ForgotPasswordPage() {
  const settings = await getSchoolSettings();

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
