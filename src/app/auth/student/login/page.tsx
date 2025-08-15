
'use client';

import AuthLayout from "@/components/layout/AuthLayout";
import { StudentLoginForm } from "@/components/forms/StudentLoginForm";
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";


function StudentLoginPageContent() {
    return (
        <AuthLayout
            title="Student Portal Login"
            description="Enter your email and password to continue."
        >
            <StudentLoginForm />
        </AuthLayout>
    );
}

export default function StudentLoginPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <StudentLoginPageContent/>
        </Suspense>
    )
}
