
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Download, Check, ClipboardList, GraduationCap } from "lucide-react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

interface AdmissionsContent {
    step1Desc: string;
    step2Desc: string;
    step3Desc: string;
    step4Desc: string;
    tuitionInfo: string;
    admissionsFormUrl?: string;
}

async function getAdmissionsContent(): Promise<AdmissionsContent> {
    const defaultContent = {
        step1Desc: "Complete and submit the online application form or download the PDF version.",
        step2Desc: "Provide required documents such as past academic records and birth certificate.",
        step3Desc: "Prospective students may be required to take an age-appropriate assessment.",
        step4Desc: "Successful candidates will receive an official admission offer from the school.",
        tuitionInfo: "We strive to provide excellent education at an affordable cost. Our fee structure is transparent and covers all core academic expenses. For a detailed breakdown of fees for your child's specific grade level, please contact our admissions office.",
        admissionsFormUrl: "",
    };

    try {
        const supabase = getSupabase();
        const { data } = await supabase
            .from("app_settings")
            .select("admissions_step1_desc, admissions_step2_desc, admissions_step3_desc, admissions_step4_desc, admissions_tuition_info, admissions_form_url")
            .eq("id", 1)
            .single();

        return {
            step1Desc: data?.admissions_step1_desc || defaultContent.step1Desc,
            step2Desc: data?.admissions_step2_desc || defaultContent.step2Desc,
            step3Desc: data?.admissions_step3_desc || defaultContent.step3Desc,
            step4Desc: data?.admissions_step4_desc || defaultContent.step4Desc,
            tuitionInfo: data?.admissions_tuition_info || defaultContent.tuitionInfo,
            admissionsFormUrl: data?.admissions_form_url || defaultContent.admissionsFormUrl,
        };
    } catch (error) {
        console.warn("Could not fetch Admissions content from settings, using defaults.", error);
        return defaultContent;
    }
}


export default async function AdmissionsPage() {
  const content = await getAdmissionsContent();

  const admissionSteps = [
      { title: "Submit Application", description: content.step1Desc, icon: FileText },
      { title: "Document Submission", description: content.step2Desc, icon: ClipboardList },
      { title: "Entrance Assessment", description: content.step3Desc, icon: Check },
      { title: "Admission Offer", description: content.step4Desc, icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <MainHeader />
      <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">
                Admissions
            </h1>
            <p className="text-lg text-muted-foreground">
                Join the St. Joseph's Montessori family.
            </p>
        </div>

        <Card className="shadow-lg mb-12">
            <CardHeader>
                <CardTitle className="text-2xl text-primary flex items-center">
                    <ClipboardList className="mr-3 h-6 w-6"/> Our Admissions Process
                </CardTitle>
                <CardDescription>
                    We have a straightforward admissions process designed to be as smooth as possible for prospective families.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {admissionSteps.map((step, index) => (
                     <div key={step.title} className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex flex-col items-center">
                           <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                                {index + 1}
                           </div>
                           {index < admissionSteps.length - 1 && <div className="w-px h-16 bg-border mt-2"></div>}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl text-primary flex items-center">
                        <DollarSign className="mr-2 h-5 w-5" /> Tuition & Fees
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                        {content.tuitionInfo}
                    </p>
                    <Button variant="link" className="p-0" asChild>
                        <Link href="/contact">Contact Admissions Office</Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl text-primary flex items-center">
                        <Download className="mr-2 h-5 w-5" /> Application Form
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                       You can download our application form to fill out and submit at the school's front desk.
                    </p>
                    {content.admissionsFormUrl ? (
                        <Button asChild>
                           <a href={content.admissionsFormUrl} target="_blank" rel="noopener noreferrer" download>
                             <Download className="mr-2 h-4 w-4" /> Download Application Form
                           </a>
                        </Button>
                    ) : (
                        <>
                            <Button disabled>
                               Download Application Form
                            </Button>
                             <p className="text-xs text-muted-foreground mt-2">
                               (No form has been uploaded by the admin yet.)
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>

      </main>
      <MainFooter />
    </div>
  );
}
