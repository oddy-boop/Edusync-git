
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
    const supabase = createClient();

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: schools, error: schoolsError } = await supabase.from('schools').select('id, name');
            if (schoolsError) throw schoolsError;

            const statsPromises = schools.map(async (school) => {
                const { count: student_count, error: studentError } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', school.id)
                    .eq('is_deleted', false);
                
                if(studentError) console.warn(`Error fetching student count for ${school.name}:`, studentError.message);

                const { count: teacher_count, error: teacherError } = await supabase
                    .from('teachers')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', school.id)
                    .eq('is_deleted', false);
                
                if(teacherError) console.warn(`Error fetching teacher count for ${school.name}:`, teacherError.message);

                return {
                    id: school.id,
                    name: school.name,
                    student_count: student_count || 0,
                    teacher_count: teacher_count || 0,
                };
            });

            const results = await Promise.all(statsPromises);
            setStats(results);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (isLoading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-destructive">{error}</div>;
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
                     <Button asChild>
                        <Link href="/admin/schools">Go to Schools Management</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    