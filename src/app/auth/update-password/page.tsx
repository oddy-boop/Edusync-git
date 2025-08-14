
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { UpdatePasswordForm } from "@/components/forms/UpdatePasswordForm";
import { Suspense } from 'react';
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function UpdatePasswordPage() {
  const settings = await getSchoolBrandingAction();

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
