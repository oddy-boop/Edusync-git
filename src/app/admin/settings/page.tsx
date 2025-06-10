
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, CalendarCog, School, Bell, Puzzle } from "lucide-react";

export default function AdminSettingsPage() {
  const settingCategories = [
    {
      title: "Academic Year Management",
      icon: CalendarCog,
      description: "Configure academic terms, semesters, school holidays, and manage transitions between academic years.",
      details: "This section would allow setting start and end dates for terms, defining grading periods, and archiving old academic year data."
    },
    {
      title: "School Information & Branding",
      icon: School,
      description: "Update school name, address, contact details, and upload logos or other branding elements.",
      details: "Settings for school motto, official colors, and information displayed on public-facing pages or documents could be managed here."
    },
    {
      title: "Notification Settings",
      icon: Bell, // Changed from BellCog to Bell
      description: "Manage email and SMS notification templates, and configure triggers for automated alerts.",
      details: "Customize content for notifications related to fee payments, attendance, new assignments, and system announcements."
    },
    {
      title: "Integrations & API",
      icon: Puzzle,
      description: "Configure integrations with third-party services (e.g., payment gateways, SMS providers) and manage API access.",
      details: "API keys, webhook configurations, and settings for external tools would be managed in this area."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Settings className="mr-3 h-8 w-8" /> System Settings
        </h2>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>System Configuration Overview</CardTitle>
          <CardDescription>
            Manage various system-wide parameters and preferences from the sections below. 
            Each section focuses on a different aspect of the school management platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {settingCategories.map((category) => (
            <Card key={category.title} className="bg-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary/90">
                  <category.icon className="mr-3 h-6 w-6" />
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <PlaceholderContent 
                  title="Configuration Options"
                  description={category.details + " Specific controls and forms for these settings would appear here."}
                  icon={Settings}
                />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

