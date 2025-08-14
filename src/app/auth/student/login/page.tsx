
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function StudentLoginPage() {
  const settings = await getSchoolBrandingAction();

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
