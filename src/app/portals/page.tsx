
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, School, AlertCircle, Building } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AuthLayout from '@/components/layout/AuthLayout';
import { useState, useEffect } from 'react';
import { getSchoolsAction } from '@/lib/actions/school.actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const portalOptions = [
    {
      title: "Student Portal",
      description: "Access your results, progress reports, and fee statements.",
      icon: User,
      link: "/auth/student/login",
      cta: "Login as Student"
    },
    {
      title: "Teacher Portal",
      description: "Manage attendance, assignments, results, and lesson plans.",
      icon: BookOpen,
      link: "/auth/teacher/login",
      cta: "Login as Teacher"
    },
    {
      title: "Admin Portal",
      description: "Oversee all school operations and system settings.",
      icon: UserCog,
      link: "/auth/admin/login",
      cta: "Login as Admin"
    },
];

interface School {
    id: number;
    name: string;
}

export default function PortalsPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSchools() {
            const result = await getSchoolsAction();
            if (result.success && result.data.length > 0) {
                setSchools(result.data);
                setSelectedSchool(result.data[0]); // Default to the first school
            } else if (!result.success) {
                setError(result.message || "Could not load school branches.");
            } else {
                setError("No school branches have been configured yet.");
            }
        }
        fetchSchools();
    }, []);

  if (error) {
    return (
      <AuthLayout
        title="Application Error"
        description="There was a problem loading school data."
        schoolName="EduSync"
      >
        <Alert variant="destructive">
            <School className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                <p className="font-semibold whitespace-pre-wrap">{error}</p>
            </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }
  
  const schoolData = selectedSchool;

  return (
    <AuthLayout
        title={`${schoolData?.name || 'School'} Portals`}
        description="Select your role to access your dedicated dashboard."
        schoolName={schoolData?.name}
    >
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="branch-select" className="flex items-center"><Building className="mr-2 h-4 w-4"/>Select Your School Branch</Label>
                <Select 
                    value={selectedSchool?.id.toString()}
                    onValueChange={(schoolId) => {
                        const school = schools.find(s => s.id.toString() === schoolId);
                        setSelectedSchool(school || null);
                    }}
                >
                    <SelectTrigger id="branch-select">
                        <SelectValue placeholder="Select a branch..." />
                    </SelectTrigger>
                    <SelectContent>
                        {schools.map((school) => (
                            <SelectItem key={school.id} value={school.id.toString()}>{school.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {portalOptions.map((portal) => (
                <Card key={portal.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                            <portal.icon className="w-6 h-6" />
                        </div>
                        <div className='flex-1'>
                            <CardTitle className="text-xl font-semibold text-primary">{portal.title}</CardTitle>
                            <CardDescription className="text-foreground/70">{portal.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full" disabled={!selectedSchool}>
                            <Link href={`${portal.link}?schoolId=${selectedSchool?.id}`}>
                                {portal.cta} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    </AuthLayout>
  );
}
