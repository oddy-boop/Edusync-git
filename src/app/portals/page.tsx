"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  User,
  UserCog,
  School,
  AlertCircle,
  Building,
  Shield,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AuthLayout from "@/components/layout/AuthLayout";
import { useState, useEffect } from "react";
import { getAllSchoolsAction } from "@/lib/actions/school.actions"; // Changed to getAllSchoolsAction
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const portalOptions = [
  {
    title: "Student Portal",
    description: "Access your results, progress reports, and fee statements.",
    icon: User,
    link: "/auth/student/login",
    cta: "Login as Student",
  },
  {
    title: "Teacher Portal",
    description: "Manage attendance, assignments, results, and lesson plans.",
    icon: BookOpen,
    link: "/auth/teacher/login",
    cta: "Login as Teacher",
  },
  {
    title: "Admin Portal",
    description: "Oversee all school operations and system settings.",
    icon: UserCog,
    link: "/auth/admin/login",
    cta: "Login as Admin",
  },
];

interface School {
  id: number;
  name: string;
  domain?: string;
  has_admin?: boolean;
}

export default function PortalsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchools() {
      // Use getAllSchoolsAction instead of getSchoolsAction
      const result = await getAllSchoolsAction();
      if (result.success && result.data.length > 0) {
        setSchools(result.data);
        // After we have the authoritative list (including has_admin), hydrate selectedSchool from localStorage
        try {
          const raw = localStorage.getItem('selectedSchool');
          if (raw) {
            const sel = JSON.parse(raw);
            const matched = result.data.find((s: School) => String(s.id) === String(sel?.id));
            if (matched) setSelectedSchool(matched);
            else setSelectedSchool(null);
          }
        } catch (e) {
          // ignore
        }
      } else if (!result.success) {
        setError(result.message || "Could not load school branches.");
      } else {
        // No schools in DB: inject a safe default so public portal UI can render
        const defaultSchool = { id: 0, name: 'EduSync', domain: undefined, has_admin: true };
        setSchools([defaultSchool]);
        setSelectedSchool(defaultSchool);
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

  const schoolData = selectedSchool || (schools.length > 0 ? schools[0] : null);

  return (
    <AuthLayout
      title={`${schoolData?.name || "School"} Portals`}
      description="Select your role to access your dedicated dashboard."
      schoolName={schoolData?.name}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building className="mr-2 h-4 w-4" />
            <div>
              <div className="text-sm font-medium">{schoolData?.name || 'EduSync'}</div>
              {!schoolData?.has_admin && (
                <div className="text-xs text-muted-foreground">(No Admin)</div>
              )}
            </div>
          </div>
        </div>

        {/* Show warning if selected school has no admin */}
        {selectedSchool && !selectedSchool.has_admin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>
              This school branch does not have an administrator assigned yet.
              Some features may be limited.
            </AlertDescription>
          </Alert>
        )}

        {portalOptions.map((portal) => (
          <Card
            key={portal.title}
            className="shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                <portal.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl font-semibold text-primary">
                  {portal.title}
                </CardTitle>
                <CardDescription className="text-foreground/70">
                  {portal.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link href={`${portal.link}?schoolId=${schoolData?.id || ''}`}>
                  {portal.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        <div className="text-center text-sm">
          <Link
            href="/auth/super-admin/login"
            className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline flex items-center justify-center gap-1"
          >
            <Shield size={14} /> Super Admin Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
