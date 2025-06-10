import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Settings } from "lucide-react";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Account Settings</h2>
      <PlaceholderContent 
        title="Manage Your Preferences" 
        icon={Settings}
        description="This section will allow you to manage your account settings, such as notification preferences and password changes (if applicable for student accounts)."
      />
    </div>
  );
}
