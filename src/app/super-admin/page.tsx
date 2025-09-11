"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function SuperAdminRootPage() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (role === 'super_admin') {
        // Redirect to dashboard for super admins
        router.replace('/super-admin/dashboard');
      } else {
        // Redirect to auth for non-super admins
        router.replace('/auth/super-admin');
      }
    }
  }, [isLoading, role, router]);

  // Show loading while checking auth and redirecting
  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-4 text-lg text-muted-foreground">
        Loading Super Admin Portal...
      </p>
    </div>
  );
}
