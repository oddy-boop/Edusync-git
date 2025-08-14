
'use server';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, User, UserCog, School, AlertCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { getSchoolBrandingAction } from '@/lib/actions/payment.actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default async function PortalsPage() {
  const settingsResult = await getSchoolBrandingAction();

  if (settingsResult.error) {
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
                <p className="font-semibold whitespace-pre-wrap">{settingsResult.error}</p>
            </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  const schoolData = settingsResult.data;

  return (
    <AuthLayout
        title={`${schoolData?.name || 'School'} Portals`}
        description="Select your role to access your dedicated dashboard."
        schoolName={schoolData?.name}
        logoUrl={schoolData?.logo_url}
        academicYear={schoolData?.current_academic_year}
    >
        <div className="space-y-6">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>For School Members</AlertTitle>
                <AlertDescription>
                    If your school has a specific web address (e.g., `campus1.edusync.com`), please use that address to log in directly.
                </AlertDescription>
            </Alert>

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
                        <Button asChild className="w-full">
                            <Link href={portal.link}>
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
