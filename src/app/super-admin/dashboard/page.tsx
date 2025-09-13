
"use client";

import { useAuth } from "@/lib/auth-context";
import { Loader2, AlertCircle } from "lucide-react";
import EnhancedSuperAdminDashboard from '@/components/shared/EnhancedSuperAdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SuperAdminDashboardPage() {
    const { role, isLoading, user } = useAuth();

    // Debug logging to see what we're getting from auth context
    console.log('SuperAdminDashboard auth state:', { user: !!user, role, isLoading });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4 text-lg text-muted-foreground">
                    Verifying Super Admin session...
                </p>
            </div>
        );
    }

    if (user && role === 'super_admin') {
        return <EnhancedSuperAdminDashboard />;
    }

    // More detailed error info
    return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Access Denied</CardTitle></CardHeader>
            <CardContent>
                <p className="text-destructive/90">You do not have the required permissions to view this page. This is for super administrators only.</p>
                <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                    Debug: user={user ? 'present' : 'null'}, role={role || 'null'}, isLoading={isLoading}
                </div>
                <Button asChild className="mt-4"><Link href="/portals">Return to Portal Selection</Link></Button>
            </CardContent>
        </Card>
    );
}
