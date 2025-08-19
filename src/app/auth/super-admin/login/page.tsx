
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { SuperAdminLoginForm } from "@/components/forms/SuperAdminLoginForm";
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";

function SuperAdminLoginPageContent() {
  return (
    <AuthLayout
      title="Super Admin Login"
      description="Platform-wide administration access."
      schoolName="EduSync Platform"
    >
      <SuperAdminLoginForm />
    </AuthLayout>
  );
}

export default function SuperAdminLoginPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <SuperAdminLoginPageContent/>
        </Suspense>
    )
}
