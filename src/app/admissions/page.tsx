"use client";

import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileText,
  Calendar,
  CheckSquare,
  Mail,
  Download,
  ArrowRight,
  Loader2,
  Building,
} from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import React from "react";
import { getSchoolSettings } from "@/lib/actions/settings.actions";
import { getAllSchoolsAction } from "@/lib/actions/school.actions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { School as SchoolIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AdmissionStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface PageSettings {
  schoolName: string | null;
  logoUrl: string | null;
  schoolAddress: string | null;
  schoolEmail: string | null;
  socials: {
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
  introText: string | null;
  admissionsPdfUrl: string | null;
  admissionsSteps: AdmissionStep[];
  academicYear?: string | null;
  updated_at?: string;
}

interface School {
  id: number;
  name: string;
  domain?: string;
  has_admin?: boolean;
}

const defaultAdmissionSteps: AdmissionStep[] = [
  {
    id: "step-1",
    title: "Submit Inquiry Form",
    description:
      "Start by filling out our online inquiry form. This helps us understand your needs and provides us with the necessary contact information to guide you through the next steps.",
    icon: "FileText",
  },
  {
    id: "step-2",
    title: "Campus Tour & Interview",
    description:
      "We invite prospective families to visit our campus, meet our staff, and see our facilities. A friendly interview with the student and parents is part of this process.",
    icon: "Calendar",
  },
  {
    id: "step-3",
    title: "Application & Document Submission",
    description:
      "Complete the official application form and submit all required documents, such as previous school records, birth certificate, and health forms.",
    icon: "CheckSquare",
  },
  {
    id: "step-4",
    title: "Admission Decision & Enrollment",
    description:
      "Our admissions committee will review your application. Once a decision is made, you will be notified, and you can complete the final enrollment and payment process.",
    icon: "Mail",
  },
];

export default function AdmissionsPage() {
  const [settings, setSettings] = React.useState<PageSettings | null>(null);
  const [schools, setSchools] = React.useState<School[]>([]);
  // Some runtime data from API includes optional fields; keep selectedSchool loose to avoid TS indexing issues
  const [selectedSchool, setSelectedSchool] = React.useState<School | any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both school settings and available schools
        const [settingsResult, schoolsResult] = await Promise.all([
          getSchoolSettings(),
          getAllSchoolsAction(),
        ]);

        // Handle settings
        if (settingsResult.error) {
          throw new Error(settingsResult.error);
        }

        const settingsData = settingsResult.data;
        if (settingsData) {
          setSettings({
            schoolName: settingsData.name,
            logoUrl: settingsData.logo_url,
            schoolAddress: settingsData.address,
            schoolEmail: settingsData.email,
            socials: {
              facebook: settingsData.facebook_url,
              twitter: settingsData.twitter_url,
              instagram: settingsData.instagram_url,
              linkedin: settingsData.linkedin_url,
            },
            introText: settingsData.admissions_intro,
            admissionsPdfUrl: settingsData.admissions_pdf_url,
            admissionsSteps:
              Array.isArray(settingsData.admissions_steps) &&
              settingsData.admissions_steps.length > 0
                ? settingsData.admissions_steps
                : defaultAdmissionSteps,
            academicYear: settingsData.current_academic_year,
            updated_at: settingsData.updated_at,
          });
        }

        // Handle schools
        if (schoolsResult.success && schoolsResult.data) {
          setSchools(schoolsResult.data);
          // If branch already selected by BranchGate, use it
          try {
            const raw = localStorage.getItem('selectedSchool');
            if (raw) {
              const sel = JSON.parse(raw);
              const found = schoolsResult.data.find((s: School) => s.id.toString() === sel?.id?.toString());
              if (found) setSelectedSchool(found);
            }
          } catch (e) {
            // ignore
          }
        } else {
          console.warn(
            "Could not load school branches:",
            schoolsResult.message
          );
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <PublicLayout
        schoolName={null}
        logoUrl={null}
        socials={null}
        updated_at={undefined}
        schoolAddress={null}
        schoolEmail={null}
        academicYear={null}
      >
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout
        schoolName="Error"
        logoUrl={null}
        socials={null}
        updated_at={undefined}
        schoolAddress={null}
        schoolEmail={null}
        academicYear={null}
      >
        <div className="container mx-auto py-16 px-4">
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <SchoolIcon className="h-5 w-5" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription>
              <p className="font-semibold whitespace-pre-wrap">{error}</p>
            </AlertDescription>
          </Alert>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      schoolName={settings?.schoolName}
      logoUrl={settings?.logoUrl}
      socials={settings?.socials}
      updated_at={settings?.updated_at}
      schoolAddress={settings?.schoolAddress}
      schoolEmail={settings?.schoolEmail}
      academicYear={settings?.academicYear}
    >
      <div className="container mx-auto py-16 px-4">
        <AnimatedSection className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">
            Admissions Process
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {settings?.introText ||
              "We are excited you are considering joining our community. Our admissions process is designed to be straightforward and welcoming for all prospective families."}
          </p>
        </AnimatedSection>

  {/* Branch Selection Section - only show when no branch selected by BranchGate */}
  {schools.length > 1 && !selectedSchool && (
          <AnimatedSection className="mb-16">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Select School Branch
                </CardTitle>
                <CardDescription>
                  Choose the branch you're interested in applying to
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branch-select">School Branch</Label>
                  <Select
                    value={selectedSchool ? String(selectedSchool.id) : undefined}
                    onValueChange={(schoolId: string) => {
                      const school = schools.find(
                        (s: School) => String(s.id) === schoolId
                      );
                      setSelectedSchool(school || null);
                    }}
                  >
                    <SelectTrigger id="branch-select">
                      <SelectValue placeholder="Select a branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(schools as School[]).map((school: School) => (
                        <SelectItem
                          key={school.id}
                          value={school.id.toString()}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{school.name}</span>
                            {!school.has_admin && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Setup in progress)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSchool && typeof selectedSchool.has_admin !== "undefined" && !selectedSchool.has_admin && (
                  <Alert>
                    <SchoolIcon className="h-4 w-4" />
                    <AlertTitle>Branch Notice</AlertTitle>
                    <AlertDescription>
                      This branch is still being set up. You can still apply,
                      but some features may be limited.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Show admission steps only if no school selection is needed, or a school is selected */}
        {(schools.length <= 1 || selectedSchool) && (
          <>
            <AnimatedSection className="mb-16">
              <h2 className="text-3xl font-bold text-primary font-headline text-center mb-12">
                How to Apply
              </h2>
              <div className="relative">
                {/* Dashed line connecting the steps */}
                <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-border border-dashed" />
                <div className="grid md:grid-cols-4 gap-8 relative">
                  {(settings?.admissionsSteps || []).map((item, index) => {
                    const IconComponent =
                      (LucideIcons as any)[item.icon] || FileText;
                    return (
                      <Card
                        key={item.id}
                        className="text-center shadow-lg border-t-4 border-accent"
                      >
                        <CardHeader>
                          <div className="mx-auto bg-accent/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                            <IconComponent className="h-8 w-8 text-accent" />
                          </div>
                          <CardTitle>
                            Step {index + 1}: {item.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            {item.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Required Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Completed Application Form</li>
                    <li>Copy of student's birth certificate</li>
                    <li>Two recent passport-sized photographs</li>
                    <li>
                      Academic records/transcripts from the previous school
                    </li>
                    <li>Copy of immunization records</li>
                    <li>Copy of parent/guardian's ID</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle>Ready to Start?</CardTitle>
                  <CardDescription>
                    Take the first step towards joining our family by applying
                    online today.
                    {selectedSchool && (
                      <span className="block mt-1 font-medium">
                        Applying to: {selectedSchool.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions or need assistance at any stage of
                    the process, please do not hesitate to reach out to our
                    admissions office.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    disabled={schools.length > 1 && !selectedSchool}
                  >
                    <Link
                      href={
                        selectedSchool
                          ? `/apply?schoolId=${selectedSchool.id}`
                          : "/apply"
                      }
                    >
                      Apply Online Now <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </AnimatedSection>
          </>
        )}

        {/* Show message when school selection is required but none selected */}
        {schools.length > 1 && !selectedSchool && (
          <AnimatedSection className="text-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Please select a school branch above to view the admission
                  process and requirements.
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </PublicLayout>
  );
}
