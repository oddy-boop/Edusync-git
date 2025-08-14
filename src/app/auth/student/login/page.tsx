
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function StudentLoginPage() {
  const settingsResult = await getSchoolBrandingAction();

  return (
    <AuthLayout
      title="Student Portal Login"
      description="Enter your email and password to continue."
      schoolName={settingsResult.data?.name}
      logoUrl={settingsResult.data?.logo_url}
      academicYear={settingsResult.data?.current_academic_year}
    >
      <StudentLoginForm />
    </AuthLayout>
  );
}
