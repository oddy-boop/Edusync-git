
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function TeacherLoginPage() {
  const settings = await getSchoolBrandingAction();
  
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
