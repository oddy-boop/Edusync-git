
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Download, Check, ClipboardList, GraduationCap } from "lucide-react";
import Link from "next/link";

const admissionSteps = [
    { title: "Submit Application", description: "Complete and submit the online application form or download the PDF version.", icon: FileText },
    { title: "Document Submission", description: "Provide required documents such as past academic records and birth certificate.", icon: ClipboardList },
    { title: "Entrance Assessment", description: "Prospective students may be required to take an age-appropriate assessment.", icon: Check },
    { title: "Admission Offer", description: "Successful candidates will receive an official admission offer from the school.", icon: GraduationCap },
];

export default function AdmissionsPage() {
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
                    <p className="text-muted-foreground">
                        We strive to provide excellent education at an affordable cost. Our fee structure is transparent and covers all core academic expenses.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        For a detailed breakdown of fees for your child's specific grade level, please contact our admissions office.
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
                    <Button disabled>
                       Download Application Form (PDF)
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2">
                       (Download functionality is currently disabled)
                    </p>
                </CardContent>
            </Card>
        </div>

      </main>
      <MainFooter />
    </div>
  );
}
