
"use client";

import { useEffect } from 'react';
import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuperAdminDashboardPage() {
    const { role, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // This effect will run when isLoading or role changes.
        // It's a failsafe to redirect non-super-admins if they somehow land here.
        if (!isLoading && role && role !== 'super_admin') {
            router.replace('/admin/dashboard');
        }
    }, [isLoading, role, router]);

    // The CRITICAL CHANGE is here. We now check `isLoading` first.
    // We will show a loading screen while the AuthProvider is still fetching the user's session and role.
    // This prevents the page from prematurely deciding the user is not a super_admin.
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4 text-lg text-muted-foreground">Verifying Super Admin access...</p>
            </div>
        );
    }
    
    // Once loading is complete, we can safely check the role.
    if (role !== 'super_admin') {
        return (
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Access Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have the required permissions to view this page. If you believe this is an error, please try logging in again.</p></CardContent>
            </Card>
        );
    }

    // If loading is false AND the role is correct, render the dashboard.
    return <SuperAdminDashboard />;
}
