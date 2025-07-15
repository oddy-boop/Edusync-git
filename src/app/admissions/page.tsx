import PublicLayout from "@/components/layout/PublicLayout";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { FileText } from "lucide-react";

export default function AdmissionsPage() {
  return (
    <PublicLayout>
       <div className="container mx-auto py-16">
        <PlaceholderContent 
            title="Admissions Process"
            icon={FileText}
            description="Here you will find detailed information about the admissions process, including timelines, requirements, necessary forms, and our school's admission policy. Contact details for the admissions office will also be provided. This content can be modified in /src/app/admissions/page.tsx."
        />
      </div>
    </PublicLayout>
  );
}
