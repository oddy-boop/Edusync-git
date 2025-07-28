
import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0; // Prevent caching of this page

async function getSchoolSettings() {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error("Could not fetch school settings for admin login:", error);
        return null;
    }
}

export default async function AdminLoginPage() {
  const settings = await getSchoolSettings();

  return (
    <AuthLayout
      title="Admin Portal Login"
      description="Access the administrative dashboard."
      schoolName={settings?.school_name}
      logoUrl={settings?.school_logo_url}
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}
