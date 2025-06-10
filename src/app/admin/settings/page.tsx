import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">System Settings</h2>
      <PlaceholderContent 
        title="Configure System Parameters" 
        icon={Settings}
        description="This section will allow administrators to configure various system-wide settings, such as academic year management, school branding, email notification templates, and integration with third-party services."
      />
    </div>
  );
}
