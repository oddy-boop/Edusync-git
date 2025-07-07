
import { MainHeader } from "@/components/layout/MainHeader";
import { MainFooter } from "@/components/layout/MainFooter";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { FileText } from "lucide-react";

export default function AdmissionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
        <MainHeader />
        <main className="flex-grow container mx-auto px-6 py-12 md:py-16">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-8 text-center">
                Admissions
            </h1>
            <div className="max-w-4xl mx-auto space-y-8">
                <PlaceholderContent
                    title="Our Admissions Process"
                    icon={FileText}
                    description="Detail the step-by-step admissions process here. Include information on required documents (birth certificate, past academic records), application deadlines, entrance examinations (if any), and the interview process. Clearly outlining these steps helps parents navigate the application journey smoothly."
                />
                <PlaceholderContent
                    title="Tuition & Fees"
                    icon={DollarSign}
                    description="Provide a general overview of the tuition and fee structure. While specific details might be in the student portal, you can list the main fee components here, such as tuition, books, uniforms, and extracurricular activities. Mentioning payment methods and schedules is also helpful."
                />
                 <PlaceholderContent
                    title="Download Application Form"
                    icon={Download}
                    description="If you have a printable application form, you can add a button here to allow parents to download it. Example: <Button>Download Application Form (PDF)</Button>"
                />
            </div>
        </main>
        <MainFooter />
    </div>
  );
}
