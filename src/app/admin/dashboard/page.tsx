
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import AdminDashboard from '@/components/shared/AdminDashboard';
import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';

export default function DashboardPageRouter() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && role === 'super_admin') {
      router.replace(`/super-admin/dashboard`);
      return;
    }
    
    if (!isLoading && role && role !== 'admin' && role !== 'super_admin' && role !== 'accountant') {
      // If a user with another role lands here, redirect them
      router.replace(`/${role}/dashboard`);
    }
  }, [role, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying user role...</p>
      </div>
    );
  }

  // Fallback for super_admin if redirect hasn't completed
  if (role === 'super_admin') {
    return (
       <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Redirecting to Super Admin Portal...</p>
      </div>
    )
  }
  
  // Default to Admin/Accountant dashboard
  return <AdminDashboard />;
}
