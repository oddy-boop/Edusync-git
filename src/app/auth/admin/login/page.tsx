
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function AdminLoginPage() {
  const settingsResult = await getSchoolBrandingAction();

  return (
    <AuthLayout
      title="Admin Portal Login"
      description="Access the administrative dashboard."
      schoolName={settingsResult.data?.name}
      logoUrl={settingsResult.data?.logo_url}
      academicYear={settingsResult.data?.current_academic_year}
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}
