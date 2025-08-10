
import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Prevent caching of this page

async function getSchoolSettings() {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, current_academic_year').eq('id', 1).single();
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
      schoolName={settings?.school_name}
      logoUrl={settings?.school_logo_url}
      academicYear={settings?.current_academic_year}
    >
      <TeacherLoginForm />
    </AuthLayout>
  );
}
