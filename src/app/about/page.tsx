import PublicLayout from "@/components/layout/PublicLayout";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Users } from "lucide-react";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="container mx-auto py-16">
        <PlaceholderContent 
            title="About St. Joseph's Montessori"
            icon={Users}
            description="This page will detail the rich history, mission, vision, and values of our school. It will introduce our dedicated leadership team and showcase what makes our educational community unique. You can edit this content easily in /src/app/about/page.tsx."
        />
      </div>
    </PublicLayout>
  );
}
