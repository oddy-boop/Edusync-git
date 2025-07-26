
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Calendar, CheckSquare, Mail } from "lucide-react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

export const revalidate = 0;

interface PageSettings {
    schoolName: string | null;
    logoUrl: string | null;
    socials: { facebook: string | null; twitter: string | null; instagram: string | null; linkedin: string | null; };
    introText: string | null;
}

const admissionSteps = [
  {
    step: 1,
    title: "Submit Inquiry Form",
    description: "Start by filling out our online inquiry form. This helps us understand your needs and provides us with the necessary contact information to guide you through the next steps.",
    icon: FileText
  },
  {
    step: 2,
    title: "Campus Tour & Interview",
    description: "We invite prospective families to visit our campus, meet our staff, and see our facilities. A friendly interview with the student and parents is part of this process.",
    icon: Calendar
  },
  {
    step: 3,
    title: "Application & Document Submission",
    description: "Complete the official application form and submit all required documents, such as previous school records, birth certificate, and health forms.",
    icon: CheckSquare
  },
  {
    step: 4,
    title: "Admission Decision & Enrollment",
    description: "Our admissions committee will review your application. Once a decision is made, you will be notified, and you can complete the final enrollment and payment process.",
    icon: Mail
  },
];

async function getAdmissionsPageSettings(): Promise<PageSettings> {
    const supabase = getSupabase();
    try {
        const { data } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url, admissions_intro').single();
        return {
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            },
            introText: data?.admissions_intro,
        };
    } catch (error) {
        console.error("Could not fetch settings for admissions page:", error);
        return {
            schoolName: 'EduSync',
            logoUrl: null,
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null },
            introText: "Introduction text not set in admin settings.",
        };
    }
}

export default async function AdmissionsPage() {
  const { schoolName, logoUrl, socials, introText } = await getAdmissionsPageSettings();

  return (
    <PublicLayout schoolName={schoolName} logoUrl={logoUrl} socials={socials}>
       <div className="container mx-auto py-16 px-4">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">Admissions Process</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
            {introText || "We are excited you are considering joining our community. Our admissions process is designed to be straightforward and welcoming for all prospective families."}
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-primary font-headline text-center mb-12">How to Apply</h2>
          <div className="relative">
             {/* Dashed line connecting the steps */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-border border-dashed" />
            <div className="grid md:grid-cols-4 gap-8 relative">
              {admissionSteps.map((item) => (
                <Card key={item.step} className="text-center shadow-lg border-t-4 border-accent">
                  <CardHeader>
                    <div className="mx-auto bg-accent/10 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                        <item.icon className="h-8 w-8 text-accent" />
                    </div>
                    <CardTitle>Step {item.step}: {item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
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
                    <Button asChild size="lg">
                        <Link href="/contact">Contact Admissions Office</Link>
                    </Button>
                </CardContent>
            </Card>
        </section>
      </div>
    </PublicLayout>
  );
}
