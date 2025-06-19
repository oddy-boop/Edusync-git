
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Bell, UserCircle, Info, KeyRound } from "lucide-react"; // Added KeyRound
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Mock state for UI demonstration
import { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { STUDENT_PREFERENCES_KEY_PREFIX, CURRENTLY_LOGGED_IN_STUDENT_ID } from '@/lib/constants'; // Corrected to STUDENT_PREFERENCES_KEY_PREFIX and added CURRENTLY_LOGGED_IN_STUDENT_ID

interface NotificationSettings {
  enableAssignmentSubmissionEmails: boolean;
  enableSchoolAnnouncementEmails: boolean;
}

interface StoredStudentSettings { // Renamed for clarity
  notifications: NotificationSettings;
  lastUpdated: string; 
}

const defaultNotificationSettings: NotificationSettings = {
  enableAssignmentSubmissionEmails: true,
  enableSchoolAnnouncementEmails: true,
};

export default function StudentSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true); // Added isMounted ref

  const [studentId, setStudentId] = useState<string | null>(null); // Added studentId state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    if (typeof window !== 'undefined') {
      const idFromStorage = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      if (idFromStorage) {
        setStudentId(idFromStorage);
        try {
          const settingsKey = `${STUDENT_PREFERENCES_KEY_PREFIX}${idFromStorage}`; // Corrected key prefix
          const storedSettingsRaw = localStorage.getItem(settingsKey);
          if (storedSettingsRaw) {
            const storedSettings: StoredStudentSettings = JSON.parse(storedSettingsRaw);
            if (isMounted.current) setNotificationSettings(prev => ({ ...defaultNotificationSettings, ...storedSettings.notifications }));
          } else {
            if (isMounted.current) setNotificationSettings(defaultNotificationSettings);
          }
        } catch (e: any) {
          console.error("Error fetching student settings from localStorage:", e);
          if (isMounted.current) {
            setError(`Failed to load settings: ${e.message}`);
            setNotificationSettings(defaultNotificationSettings);
          }
        }
      } else {
        if (isMounted.current) {
          // No explicit error setting here, page content handles missing student ID
        }
      }
    }
    if (isMounted.current) setIsLoading(false);
    
    return () => { isMounted.current = false; };
  }, []); // Removed router dependency as it's not used

  const handleCheckboxChange = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    if (!studentId || typeof window === 'undefined') { // Check for studentId
      toast({ title: "Error", description: "Student not identified or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const settingsKey = `${STUDENT_PREFERENCES_KEY_PREFIX}${studentId}`; // Corrected key prefix
      const settingsToStore: StoredStudentSettings = {
        notifications: notificationSettings,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(settingsKey, JSON.stringify(settingsToStore));
      toast({ title: "Success", description: "Notification settings saved to localStorage." });
    } catch (error: any) {
      console.error("Error saving student settings to localStorage:", error);
      toast({ title: "Save Failed", description: `Could not save settings: ${error.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Settings className="mr-3 h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading your settings...</p>
      </div>
    );
  }
  
  if (!studentId && !isLoading) { // Handle case where studentId is not found after loading
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-destructive">
                    <UserCircle className="mr-3 h-6 w-6" /> Access Denied
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive/90">Student ID not found. Please log in to access settings.</p>
                <Button asChild className="mt-4">
                    <Link href="/auth/student/login">Go to Student Login</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Settings className="mr-3 h-8 w-8" /> My Account Settings
      </h2>
      
      {error && (
         <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><Info className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
            <CardContent><p className="text-destructive/90">{error}</p></CardContent>
        </Card>
      )}

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
              checked={notificationSettings.enableAssignmentSubmissionEmails}
              onCheckedChange={() => handleCheckboxChange('enableAssignmentSubmissionEmails')}
            />
            <Label htmlFor="gradeEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications when new grades are posted.
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="eventEmails" 
              checked={notificationSettings.enableSchoolAnnouncementEmails}
              onCheckedChange={() => handleCheckboxChange('enableSchoolAnnouncementEmails')}
            />
            <Label htmlFor="eventEmails" className="font-normal cursor-pointer flex-1">
              Get notified about upcoming school events and announcements.
            </Label>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveSettings} disabled={isSaving || !studentId}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Notification Settings"}
            </Button>
        </CardFooter>
         <CardFooter className="pt-2"> {/* Added pt-2 to separate from main footer button */}
            <p className="text-xs text-muted-foreground">
                Note: Student notification features are illustrative. Actual implementation depends on system capabilities for student communication (e.g., if student emails are collected and used). Settings are saved locally in your browser.
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
