import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { UserCircle } from "lucide-react";

export default function AdminProfilePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Profile</h2>
      <PlaceholderContent 
        title="Your Profile Information" 
        icon={UserCircle}
        description="This page will display your administrator profile details. You'll be able to update your personal information, change your password, and manage notification preferences here."
      />
    </div>
  );
}
