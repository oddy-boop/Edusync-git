
"use client";

import AuthLayout from "@/components/layout/AuthLayout";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function TeacherRegisterPage() {
  return (
    <AuthLayout
      title="Teacher Registration"
      description="This page is for initial setup only."
    >
      <Card className="shadow-lg border-destructive/50 bg-destructive/5">
          <CardHeader>
              <CardTitle className="flex items-center text-destructive"><AlertCircle className="mr-2 h-5 w-5"/> Teacher Registration Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-destructive/90">
                For security reasons, new teachers can no longer register from this public page. Teachers must be invited by an administrator from within the application dashboard.
            </CardDescription>
            <Button asChild className="mt-4 w-full" variant="secondary">
                <Link href="/auth/teacher/login">Return to Teacher Login</Link>
            </Button>
          </CardContent>
      </Card>
    </AuthLayout>
  );
}
