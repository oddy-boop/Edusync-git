
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings, Bell, Save, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // db import removed
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
// Firestore imports removed: doc, getDoc, setDoc, serverTimestamp
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TEACHER_SETTINGS_KEY_PREFIX } from '@/lib/constants'; // Import localStorage key prefix

interface NotificationSettings {
  enableAssignmentSubmissionEmails: boolean;
  enableSchoolAnnouncementEmails: boolean;
}

interface StoredTeacherSettings {
  notifications: NotificationSettings;
  lastUpdated: string; // ISO Date string
}

const defaultNotificationSettings: NotificationSettings = {
  enableAssignmentSubmissionEmails: true,
  enableSchoolAnnouncementEmails: true,
};

export default function TeacherSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const isMounted = useRef(true);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;
      if (user) {
        setCurrentUser(user);
        try {
          if (typeof window !== 'undefined') {
            const settingsKey = `${TEACHER_SETTINGS_KEY_PREFIX}${user.uid}`;
            const storedSettingsRaw = localStorage.getItem(settingsKey);
            if (storedSettingsRaw) {
              const storedSettings: StoredTeacherSettings = JSON.parse(storedSettingsRaw);
              setNotificationSettings(prev => ({ ...defaultNotificationSettings, ...storedSettings.notifications }));
            } else {
              setNotificationSettings(defaultNotificationSettings);
            }
          }
        } catch (e: any) {
          console.error("Error fetching teacher settings from localStorage:", e);
          setError(`Failed to load settings: ${e.message}`);
          setNotificationSettings(defaultNotificationSettings);
        }
      } else {
        setCurrentUser(null);
        setError("Not authenticated. Redirecting to login...");
        router.push('/auth/teacher/login');
      }
      setIsLoading(false);
    });
    return () => { isMounted.current = false; unsubscribe(); };
  }, [router]);

  const handleCheckboxChange = (field: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    if (!currentUser || typeof window === 'undefined') {
      toast({ title: "Error", description: "Not authenticated or localStorage unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const settingsKey = `${TEACHER_SETTINGS_KEY_PREFIX}${currentUser.uid}`;
      const settingsToStore: StoredTeacherSettings = {
        notifications: notificationSettings,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(settingsKey, JSON.stringify(settingsToStore));
      toast({ title: "Success", description: "Notification settings saved to localStorage." });
    } catch (error: any) {
      console.error("Error saving teacher settings to localStorage:", error);
      toast({ title: "Save Failed", description: `Could not save settings: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
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

  if (error) {
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Bell className="mr-3 h-6 w-6" /> Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications. Settings are saved locally in your browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="assignmentEmails" 
              checked={notificationSettings.enableAssignmentSubmissionEmails}
              onCheckedChange={() => handleCheckboxChange('enableAssignmentSubmissionEmails')}
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
            />
            <Label htmlFor="announcementEmails" className="font-normal cursor-pointer flex-1">
              Receive email notifications for important school announcements relevant to teachers. (Mock - UI Only)
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
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
                Manage your account security settings, including password changes.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
                For security reasons, password changes and other sensitive account modifications are handled on your main profile page.
            </p>
            <Button asChild variant="outline">
                <Link href="/teacher/profile">
                    Go to My Profile to Change Password
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
