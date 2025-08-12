
import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
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
        console.error("Could not fetch school settings for teacher login:", error);
        return null;
    }
}

export default async function TeacherLoginPage() {
  const settings = await getSchoolSettings();
  
  return (
    <AuthLayout
      title="Teacher Portal Login"
      description="Access your teaching tools and resources."
      schoolName={settings?.name}
      logoUrl={settings?.logo_url}
      academicYear={settings?.current_academic_year}
    >
      <TeacherLoginForm />
    </AuthLayout>
  );
}
