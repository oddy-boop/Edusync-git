
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
        if (!isLoading && role && role !== 'super_admin') {
            router.replace('/admin/dashboard');
        }
    }, [isLoading, role, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Verifying Super Admin access...</p>
            </div>
        );
    }
    
    if (role !== 'super_admin') {
        return (
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/> Access Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have the required permissions to view this page. Redirecting...</p></CardContent>
            </Card>
        );
    }

    return <SuperAdminDashboard />;
}
