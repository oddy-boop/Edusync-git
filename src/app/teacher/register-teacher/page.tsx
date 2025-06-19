
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function DeprecatedRegisterTeacherPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-6 w-6" /> This Page is Deprecated
          </CardTitle>
          <CardDescription className="text-destructive/90">
            Teacher registration is now handled by school administrators through the Admin Portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/80">
            This local registration page is no longer in use and has been replaced by a centralized registration system using Supabase Authentication, managed by administrators.
          </p>
          <p className="text-sm text-foreground/80 mt-2">
            If you are a teacher needing an account, please contact your school administrator.
          </p>
          <p className="text-sm text-foreground/80 mt-2">
            If you are an administrator, please use the "Register Teacher" section in the Admin Portal.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/teacher/login">
                Go to Teacher Login
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/admin/login">
                Go to Admin Portal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
