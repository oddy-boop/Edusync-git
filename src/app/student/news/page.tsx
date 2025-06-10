import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Bell } from "lucide-react";

export default function StudentNewsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">School News & Announcements</h2>
      <PlaceholderContent 
        title="Stay Updated" 
        icon={Bell}
        description="This page will display the latest news, announcements, and updates from the school administration and teachers. Check here regularly for important information."
      />
    </div>
  );
}
