
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
      // Use replace to avoid the back button going to a confusing state
      router.replace(`/super-admin/dashboard`);
      return;
    }
    
    // This handles other roles like 'teacher' or 'student' if they land here by mistake
    if (!isLoading && role && !['admin', 'super_admin', 'accountant'].includes(role)) {
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
  
  // This will render the appropriate component based on the finalized role.
  // The useEffect above will handle redirection for super_admin.
  if (role === 'super_admin') {
    return (
       <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Redirecting to Super Admin Portal...</p>
      </div>
    )
  }
  
  // Default to Admin/Accountant dashboard if not super_admin
  return <AdminDashboard />;
}
