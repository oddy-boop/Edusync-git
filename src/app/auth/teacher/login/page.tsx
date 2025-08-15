
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { TeacherLoginForm } from "@/components/forms/TeacherLoginForm";
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";


function TeacherLoginPageContent() {
  return (
    <AuthLayout
      title="Teacher Portal Login"
      description="Access your teaching tools and resources."
    >
      <TeacherLoginForm />
    </AuthLayout>
  );
}


export default function TeacherLoginPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <TeacherLoginPageContent/>
        </Suspense>
    )
}
