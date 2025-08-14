
'use server';

import AuthLayout from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import React from 'react';
import { getSchoolBrandingAction } from "@/lib/actions/payment.actions";

export default async function ForgotPasswordPage() {
  const settingsResult = await getSchoolBrandingAction();
  
  return (
    <AuthLayout
      title="Reset Your Password"
      description="Enter your email address and we'll send you a link to reset your password."
      schoolName={settingsResult.data?.name}
      logoUrl={settingsResult.data?.logo_url}
      academicYear={settingsResult.data?.current_academic_year}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
