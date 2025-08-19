
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import AdminDashboard from '@/components/shared/AdminDashboard'; // Assuming you have this
import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';

export default function DashboardPageRouter() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
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

  // Render the correct dashboard based on the role
  if (role === 'super_admin') {
    return <SuperAdminDashboard />;
  }
  
  // Default to Admin/Accountant dashboard
  return <AdminDashboard />;
}
