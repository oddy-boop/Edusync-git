
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Bell, UserCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Mock state for UI demonstration
import { useState } from "react";

export default function StudentSettingsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    gradeEmails: true,
    eventEmails: false,
  });

  const handlePrefChange = (prefKey: keyof typeof prefs) => {
    setPrefs(current => ({ ...current, [prefKey]: !current[prefKey] }));
    toast({
      title: "Preference Updated (Mock)",
      description: "This is a UI demonstration. Preferences are not currently saved.",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Settings className="mr-3 h-8 w-8" /> My Account Settings
      </h2>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Bell className="mr-3 h-6 w-6" /> Notification Preferences (Mock)
          </CardTitle>
          <CardDescription>Manage how you receive updates. (These settings are for demonstration and are not currently functional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="gradeEmails" 
              checked={prefs.gradeEmails}
              onCheckedChange={() => handlePrefChange('gradeEmails')}
            />
            <Label htmlFor="gradeEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications when new grades are posted.
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="eventEmails" 
              checked={prefs.eventEmails}
              onCheckedChange={() => handlePrefChange('eventEmails')}
            />
            <Label htmlFor="eventEmails" className="font-normal cursor-pointer flex-1">
              Get notified about upcoming school events and announcements.
            </Label>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Note: Student notification features are illustrative. Actual implementation depends on system capabilities for student communication (e.g., if student emails are collected and used).
            </p>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <UserCircle className="mr-3 h-6 w-6" /> Account Information
          </CardTitle>
          <CardDescription>Manage your personal and account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground/80">
            Your personal information, such as name, date of birth, and guardian details, is managed by the school administration.
          </p>
          <p className="text-sm text-foreground/80">
            If you need to update any of this information or have questions about your student account, please contact the school office.
          </p>
           <Button variant="outline" asChild className="mt-2">
            <Link href="/student/profile">View My Profile Details</Link>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-md border-blue-500/30 bg-blue-500/5">
        <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                <Info className="mr-2 h-5 w-5"/> Important Note
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-blue-600 dark:text-blue-300">
                As a student, you log in using your unique Student ID. There is no password to manage for your portal access.
                For any issues related to accessing your account or your Student ID, please reach out to the school administration for assistance.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
