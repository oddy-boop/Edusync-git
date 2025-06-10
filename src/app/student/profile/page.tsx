import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { UserCircle } from "lucide-react";

export default function StudentProfilePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Student Profile</h2>
      <PlaceholderContent 
        title="Your Profile Information" 
        icon={UserCircle}
        description="This page will display your student profile details, including personal information, class, and contact details. Some information might be editable by you or your guardian."
      />
    </div>
  );
}
