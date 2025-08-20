
"use client";

import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function SuperAdminDashboardPage() {
    const { role, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // Only after loading is complete, we check the role.
    if (role !== 'super_admin') {
        return (
             <Card className="shadow-lg border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                        <AlertCircle className="mr-2"/> Access Denied
                    </CardTitle>
                    <CardDescription className="text-destructive/90">
                        You do not have the required permissions to view this page. Redirecting...
                    </CardDescription>
                </CardHeader>
             </Card>
        );
    }
    
    // If loading is done and role is correct, show the dashboard.
    return <SuperAdminDashboard />;
}
