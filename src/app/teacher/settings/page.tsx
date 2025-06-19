
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings, Bell, Save, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TEACHER_LOGGED_IN_UID_KEY } from '@/lib/constants'; 
import { getSupabase } from '@/lib/supabaseClient';
import type { SupabaseClient } from "@supabase/supabase-js";

interface NotificationSettings {
  enableAssignmentSubmissionEmails: boolean;
  enableSchoolAnnouncementEmails: boolean;
}

interface TeacherProfileFromSupabase {
  auth_user_id: string;
  notification_preferences?: NotificationSettings | null;
}

const defaultNotificationSettings: NotificationSettings = {
  enableAssignmentSubmissionEmails: true,
  enableSchoolAnnouncementEmails: true,
};

export default function TeacherSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [teacherAuthUid, setTeacherAuthUid] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    async function loadTeacherAndSettings() {
      if (!supabaseRef.current || typeof window === 'undefined') return;

      const authUid = localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY);
      if (authUid) {
        if(isMounted.current) setTeacherAuthUid(authUid);
        try {
          const { data: teacherProfile, error: profileError } = await supabaseRef.current
            .from('teachers')
            .select('auth_user_id, notification_preferences')
            .eq('auth_user_id', authUid)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          if (isMounted.current) {
            if (teacherProfile && teacherProfile.notification_preferences) {
              setNotificationSettings(prev => ({...defaultNotificationSettings, ...teacherProfile.notification_preferences as NotificationSettings}));
            } else {
              setNotificationSettings(defaultNotificationSettings);
              if (teacherProfile && !teacherProfile.notification_preferences) {
                 await supabaseRef.current
                    .from('teachers')
                    .update({ notification_preferences: defaultNotificationSettings, updated_at: new Date().toISOString() })
                    .eq('auth_user_id', authUid);
              }
            }
          }
        } catch (e: any) {
          console.error("Error fetching teacher settings from Supabase:", e);
          if (isMounted.current) {
            setError(`Failed to load settings from Supabase: ${e.message}`);
            setNotificationSettings(defaultNotificationSettings);
          }
        }
      } else {
        if (isMounted.current) {
          setError("Not authenticated. Redirecting to login...");
          router.push('/auth/teacher/login');
        }
      }
      if (isMounted.current) setIsLoading(false);
    }
    
    loadTeacherAndSettings();
    
    return () => { isMounted.current = false; };
  }, [router]);

  const handleCheckboxChange = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    if (!teacherAuthUid || !supabaseRef.current) {
      toast({ title: "Error", description: "Not authenticated or Supabase client unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabaseRef.current
        .from('teachers')
        .update({ notification_preferences: notificationSettings, updated_at: new Date().toISOString() })
        .eq('auth_user_id', teacherAuthUid);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Notification settings saved to Supabase." });
    } catch (error: any) {
      console.error("Error saving teacher settings to Supabase:", error);
      setError(`Failed to save settings to Supabase: ${error.message}`);
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

  if (error && !teacherAuthUid) { // Error likely means not authenticated if teacherAuthUid is still null
    return (
      <Card className="shadow-lg border-destructive bg-destructive/10">
        <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive/90">{error}</p>
          {error.includes("Not authenticated") && (
             <Button asChild className="mt-4"><Link href="/auth/teacher/login">Go to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Settings className="mr-3 h-8 w-8" /> Teacher Account Settings
      </h2>

      {error && teacherAuthUid && (
         <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2 h-5 w-5"/> Error</CardTitle></CardHeader>
            <CardContent><p className="text-destructive/90">{error}</p></CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Bell className="mr-3 h-6 w-6" /> Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications. Settings are saved to Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="assignmentEmails" 
              checked={notificationSettings.enableAssignmentSubmissionEmails}
              onCheckedChange={() => handleCheckboxChange('enableAssignmentSubmissionEmails')}
              disabled={!teacherAuthUid || isSaving}
            />
            <Label htmlFor="assignmentEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications for new student assignment submissions. (Mock - UI Only)
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="announcementEmails" 
              checked={notificationSettings.enableSchoolAnnouncementEmails}
              onCheckedChange={() => handleCheckboxChange('enableSchoolAnnouncementEmails')}
              disabled={!teacherAuthUid || isSaving}
            />
            <Label htmlFor="announcementEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications for important school announcements relevant to teachers. (Mock - UI Only)
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving || !teacherAuthUid}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
                <KeyRound className="mr-3 h-6 w-6" /> Security & Password
            </CardTitle>
            <CardDescription>
                Manage your Supabase account security settings.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
                Your account is managed by Supabase Authentication. You can update your password and other security settings through your teacher profile page.
            </p>
            <Button asChild variant="outline">
                <Link href="/teacher/profile">
                    Go to My Profile
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    