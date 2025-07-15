import PublicLayout from "@/components/layout/PublicLayout";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookOpen } from "lucide-react";

export default function ProgramsPage() {
  return (
    <PublicLayout>
       <div className="container mx-auto py-16">
        <PlaceholderContent 
            title="Our Academic Programs"
            icon={BookOpen}
            description="This section will provide a comprehensive overview of our academic programs, from creche and nursery to Junior High School. It will outline our curriculum, teaching philosophy, and extracurricular activities available for students. You can edit this page at /src/app/programs/page.tsx."
        />
      </div>
    </PublicLayout>
  );
}
