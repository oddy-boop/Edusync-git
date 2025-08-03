
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Calendar, CheckSquare, Mail, Download } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import * as LucideIcons from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";

export const revalidate = 0;

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
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    introText: string | null;
    admissionsPdfUrl: string | null;
    admissionsSteps: AdmissionStep[];
    academicYear?: string | null;
    updated_at?: string;
}

const defaultAdmissionSteps: Omit<AdmissionStep, 'id'>[] = [
  {
    title: "Submit Inquiry Form",
    description: "Start by filling out our online inquiry form. This helps us understand your needs and provides us with the necessary contact information to guide you through the next steps.",
    icon: 'FileText'
  },
  {
    title: "Campus Tour & Interview",
    description: "We invite prospective families to visit our campus, meet our staff, and see our facilities. A friendly interview with the student and parents is part of this process.",
    icon: 'Calendar'
  },
  {
    title: "Application & Document Submission",
    description: "Complete the official application form and submit all required documents, such as previous school records, birth certificate, and health forms.",
    icon: 'CheckSquare'
  },
  {
    title: "Admission Decision & Enrollment",
    description: "Our admissions committee will review your application. Once a decision is made, you will be notified, and you can complete the final enrollment and payment process.",
    icon: 'Mail'
  },
];

const safeParseJson = (jsonString: any, fallback: any[] = []) => {
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  if (typeof jsonString === 'string') {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
};

async function getAdmissionsPageSettings(): Promise<PageSettings | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, school_address, school_email, facebook_url, twitter_url, instagram_url, linkedin_url, admissions_intro, admissions_pdf_url, admissions_steps, updated_at, current_academic_year').single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        
        const dbSteps = safeParseJson(data.admissions_steps);

        const settings: PageSettings = {
            schoolName: data.school_name,
            logoUrl: data.school_logo_url,
            schoolAddress: data.school_address,
            schoolEmail: data.school_email,
            socials: {
                facebook: data.facebook_url,
                twitter: data.twitter_url,
                instagram: data.instagram_url,
                linkedin: data.linkedin_url,
            },
            introText: data.admissions_intro,
            admissionsPdfUrl: data.admissions_pdf_url,
            admissionsSteps: dbSteps.length > 0 ? dbSteps : defaultAdmissionSteps.map((s, i) => ({...s, id: `default-${i}`})),
            academicYear: data.current_academic_year,
            updated_at: data.updated_at,
        };
        return settings;
    } catch (error) {
        console.error("Could not fetch settings for admissions page:", error);
        return null;
    }
}


export default async function AdmissionsPage() {
  const settings = await getAdmissionsPageSettings();

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
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Admissions Process</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {settings?.introText || "We are excited you are considering joining our community. Our admissions process is designed to be straightforward and welcoming for all prospective families."}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mb-16">
          <h2 className="text-3xl font-bold text-primary font-headline text-center mb-12">How to Apply</h2>
          <div className="relative">
             {/* Dashed line connecting the steps */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-border border-dashed" />
            <div className="grid md:grid-cols-4 gap-8 relative">
              {(settings?.admissionsSteps || []).map((item, index) => {
                const IconComponent = (LucideIcons as any)[item.icon] || FileText;
                return (
                  <Card key={item.id} className="text-center shadow-lg border-t-4 border-accent">
                    <CardHeader>
                      <div className="mx-auto bg-accent/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                          <IconComponent className="h-8 w-8 text-accent" />
                      </div>
                      <CardTitle>Step {index + 1}: {item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                )
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
                        <li>Academic records/transcripts from the previous school</li>
                        <li>Copy of immunization records</li>
                        <li>Copy of parent/guardian's ID</li>
                    </ul>
                </CardContent>
            </Card>
             <Card className="bg-primary/5">
                <CardHeader>
                    <CardTitle>Ready to Start?</CardTitle>
                    <CardDescription>Take the first step towards joining our family.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        If you have any questions or need assistance at any stage of the process, please do not hesitate to reach out to our admissions office.
                    </p>
                    {settings?.admissionsPdfUrl ? (
                        <Button asChild size="lg">
                            <a href={settings.admissionsPdfUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-5 w-5" /> Download Admission Form
                            </a>
                        </Button>
                    ) : (
                        <Button asChild size="lg">
                            <Link href="/contact">Contact Admissions Office</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </AnimatedSection>
      </div>
    </PublicLayout>
  );
}
