"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import AdminDashboard from '@/components/shared/AdminDashboard';

export default function DashboardPageRouter() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the auth state is fully loaded
    if (!isLoading) {
      if (role === 'super_admin') {
        // Use replace to avoid adding the intermediate page to browser history
        router.replace('/super-admin/dashboard');
      } else if (role && !['admin', 'accountant'].includes(role)) {
        // Redirect other authenticated users (e.g., teachers, students) to their respective portals
        router.replace(`/${role}/dashboard`);
      }
    }
  }, [role, isLoading, router]);

  // Display a loading state while authentication is in progress or during redirection
  if (isLoading || role === 'super_admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">
          {isLoading ? 'Verifying user role...' : 'Redirecting to Super Admin Portal...'}
        </p>
      </div>
    );
  }
  
  // If the user is an admin or accountant, render the standard admin dashboard.
  if (role === 'admin' || role === 'accountant') {
    return <AdminDashboard />;
  }

  // Fallback for any other state (e.g., no role found but not loading)
  return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
  );
}
