
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2, AlertCircle } from "lucide-react";
import AdminDashboard from '@/components/shared/AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPageRouter() {
  const { role, isLoading, user } = useAuth();
  const router = useRouter();

  // This effect handles redirection for non-admin roles if they land here.
  useEffect(() => {
    if (!isLoading && user) {
      if (role === 'super_admin') {
        router.replace('/super-admin/dashboard');
      } else if (role && !['admin', 'accountant'].includes(role)) {
        router.replace(`/${role}/dashboard`);
      }
    }
  }, [role, isLoading, router, user]);

  // Display a loading state while authentication is in progress.
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">
          Verifying user role...
        </p>
      </div>
    );
  }
  
  // After loading, if the role is correct, render the dashboard.
  if (user && (role === 'admin' || role === 'accountant')) {
    return <AdminDashboard />;
  }

  // If loading is finished and the user is not an admin/accountant, show an access denied message.
  // This covers edge cases and users trying to access the URL directly without permission.
  return (
    <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Access Denied</CardTitle></CardHeader>
        <CardContent>
            <p className="text-destructive/90">You must be logged in as an administrator or accountant to view this page.</p>
            <Button asChild className="mt-4"><Link href="/portals">Return to Portal Selection</Link></Button>
        </CardContent>
    </Card>
  );
}
