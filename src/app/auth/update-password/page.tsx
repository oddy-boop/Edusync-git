
import AuthLayout from "@/components/layout/AuthLayout";
import { UpdatePasswordForm } from "@/components/forms/UpdatePasswordForm";
import { Suspense } from 'react';

export default function UpdatePasswordPage() {
  return (
    <AuthLayout
      title="Update Your Password"
      description="Enter your new password below. Make sure it's strong and memorable."
    >
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
