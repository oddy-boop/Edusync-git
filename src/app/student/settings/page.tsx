
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Bell, UserCircle, Info, KeyRound, Loader2, AlertCircle, Save } from "lucide-react"; // Added Save, Loader2, AlertCircle
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";
import { CURRENTLY_LOGGED_IN_STUDENT_ID } from '@/lib/constants';
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

interface NotificationSettings {
  enableAssignmentSubmissionEmails: boolean;
  enableSchoolAnnouncementEmails: boolean;
}

interface StudentProfileFromSupabase {
  student_id_display: string;
  notification_preferences?: NotificationSettings | null;
}

const defaultNotificationSettings: NotificationSettings = {
  enableAssignmentSubmissionEmails: true,
  enableSchoolAnnouncementEmails: true,
};

export default function StudentSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    async function loadStudentAndSettings() {
      if (!supabaseRef.current || typeof window === 'undefined') return;
      
      const idFromStorage = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
      if (idFromStorage) {
        if(isMounted.current) setStudentId(idFromStorage);
        try {
          const { data: studentProfile, error: profileError } = await supabaseRef.current
            .from('students')
            .select('student_id_display, notification_preferences')
            .eq('student_id_display', idFromStorage)
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows, not necessarily an error for settings
            throw profileError;
          }

          if (isMounted.current) {
            if (studentProfile && studentProfile.notification_preferences) {
              setNotificationSettings(prev => ({ ...defaultNotificationSettings, ...studentProfile.notification_preferences as NotificationSettings }));
            } else {
              setNotificationSettings(defaultNotificationSettings);
              // Optionally, save default settings to Supabase if profile exists but prefs don't
              if (studentProfile && !studentProfile.notification_preferences) {
                await supabaseRef.current
                  .from('students')
                  .update({ notification_preferences: defaultNotificationSettings, updated_at: new Date().toISOString() })
                  .eq('student_id_display', idFromStorage);
              }
            }
          }
        } catch (e: any) {
          console.error("Error fetching student settings from Supabase:", e);
          if (isMounted.current) {
            setError(`Failed to load settings from Supabase: ${e.message}`);
            setNotificationSettings(defaultNotificationSettings); // Fallback to defaults
          }
        }
      } else {
        if (isMounted.current) {
          setError("Student not identified. Please log in.");
        }
      }
      if (isMounted.current) setIsLoading(false);
    }
    
    loadStudentAndSettings();
    
    return () => { isMounted.current = false; };
  }, []);

  const handleCheckboxChange = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    if (!studentId || !supabaseRef.current) {
      toast({ title: "Error", description: "Student not identified or Supabase client unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabaseRef.current
        .from('students')
        .update({ notification_preferences: notificationSettings, updated_at: new Date().toISOString() })
        .eq('student_id_display', studentId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Notification settings saved to Supabase." });
    } catch (error: any) {
      console.error("Error saving student settings to Supabase:", error);
      setError(`Failed to save settings: ${error.message}`);
      toast({ title: "Save Failed", description: `Could not save settings: ${error.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your settings...</p>
      </div>
    );
  }
  
  if (error && !studentId) { // If error occurred before studentId was set (e.g., not logged in)
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-destructive">
                    <AlertCircle className="mr-3 h-6 w-6" /> Access Denied or Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive/90">{error || "Student not identified. Please log in."}</p>
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
      
      {error && studentId && ( // Show error only if studentId is set (meaning login was attempted)
         <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><Info className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
            <CardContent><p className="text-destructive/90">{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Bell className="mr-3 h-6 w-6" /> Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive updates. Settings are saved to Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="gradeEmails" 
              checked={notificationSettings.enableAssignmentSubmissionEmails}
              onCheckedChange={() => handleCheckboxChange('enableAssignmentSubmissionEmails')}
              disabled={!studentId || isSaving}
            />
            <Label htmlFor="gradeEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications when new grades are posted. (Mock - UI Only)
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="eventEmails" 
              checked={notificationSettings.enableSchoolAnnouncementEmails}
              onCheckedChange={() => handleCheckboxChange('enableSchoolAnnouncementEmails')}
              disabled={!studentId || isSaving}
            />
            <Label htmlFor="eventEmails" className="font-normal cursor-pointer flex-1">
              Get notified about upcoming school events and announcements. (Mock - UI Only)
            </Label>
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveSettings} disabled={isSaving || !studentId}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Notification Settings"}
            </Button>
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
            Your personal information is managed by the school administration.
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

    