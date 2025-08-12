
import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';
import pool from "@/lib/db";

export const revalidate = 0; // Prevent caching of this page

async function getSchoolSettings() {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);
    const client = await pool.connect();
    
    try {
        let query;
        let queryParams;
        if (subdomain) {
            query = 'SELECT name, logo_url, current_academic_year FROM schools WHERE domain = $1 LIMIT 1';
            queryParams = [subdomain];
        } else {
            query = 'SELECT name, logo_url, current_academic_year FROM schools ORDER BY created_at ASC LIMIT 1';
            queryParams = [];
        }
        
        const { rows } = await client.query(query, queryParams);
        return rows[0] || null;
    } catch (error) {
        console.error("Could not fetch school settings for teacher login:", error);
        return null;
    } finally {
        client.release();
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
