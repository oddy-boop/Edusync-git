
"use client";

import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Application Settings</h2>
      <PlaceholderContent 
        title="Settings Management" 
        icon={Settings}
        description="This page will contain forms to manage application-wide settings, such as school branding, API keys for services like Paystack and Resend, academic year configuration, and homepage content customization. This feature is currently under development."
      />
    </div>
  );
}
