
"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { School, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SchoolStats {
    id: number;
    name: string;
    student_count: number;
    teacher_count: number;
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<SchoolStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/super-admin/stats');
            const json = await res.json();
            console.debug('SuperAdminDashboard: api response', json);
            if (!json.success) {
                throw new Error(json.message || 'Failed to fetch stats');
            }
            setStats(json.data || []);
        } catch (e: any) {
            setError(e.message || 'Unknown error fetching stats');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-destructive">{error}</div>;
    }

    if (!stats || stats.length === 0) {
        return (
            <div className="py-8">
                <h2 className="text-2xl font-semibold">Super Admin Dashboard</h2>
                <p className="text-muted-foreground mt-4">No school statistics available. Check console for debug logs (SuperAdminDashboard).</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-headline font-semibold text-primary">Super Admin Dashboard</h2>
            <CardDescription>An overview of all school branches on the platform.</CardDescription>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map(school => (
                    <Card key={school.id} className="shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <School className="h-6 w-6 text-primary" />
                                {school.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                                <span className="font-medium flex items-center gap-2"><Users className="h-5 w-5 text-blue-600"/>Total Students</span>
                                <span className="font-bold text-lg">{school.student_count}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                                <span className="font-medium flex items-center gap-2"><Users className="h-5 w-5 text-green-600"/>Total Teachers</span>
                                <span className="font-bold text-lg">{school.teacher_count}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Platform Management</CardTitle>
                    <CardDescription>Use the sidebar links to manage schools, create new branch administrators, and oversee the entire platform.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center gap-2">
                        <Button onClick={() => fetchStats()}>Refresh Stats</Button>
                        <Button asChild>
                            <Link href="/admin/schools">Go to Schools Management</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    