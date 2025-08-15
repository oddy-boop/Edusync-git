
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";

function AdminLoginPageContent() {
  return (
    <AuthLayout
      title="Admin Portal Login"
      description="Access the administrative dashboard."
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <AdminLoginPageContent/>
        </Suspense>
    )
}
