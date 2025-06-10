import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { UserCircle } from "lucide-react";

export default function TeacherProfilePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Teacher Profile</h2>
      <PlaceholderContent 
        title="Your Profile Information" 
        icon={UserCircle}
        description="This page will display your teacher profile details. You'll be able to update your contact information, qualifications, subjects taught, and manage your account settings."
      />
    </div>
  );
}
