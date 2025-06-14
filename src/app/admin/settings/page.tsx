
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSupabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AppSettings {
  currentAcademicYear: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolLogoUrl: string;
  schoolHeroImageUrl: string;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  emailFooterSignature: string;
  paymentGatewayApiKey: string;
  smsProviderApiKey: string;
  schoolSlogan?: string;
}

const defaultAppSettings: AppSettings = {
  currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  schoolName: "St. Joseph's Montessori",
  schoolAddress: "123 Education Road, Accra, Ghana",
  schoolPhone: "+233 12 345 6789",
  schoolEmail: "info@stjosephmontessori.edu.gh",
  schoolLogoUrl: "",
  schoolHeroImageUrl: "",
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  emailFooterSignature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  paymentGatewayApiKey: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  smsProviderApiKey: "sms_apikey_xxxxxxxxxxxxxxxx",
  schoolSlogan: "A modern solution for St. Joseph's Montessori (Ghana) to manage school operations, enhance learning, and empower students, teachers, and administrators.",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false); // Keep for localStorage clear for now
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  useEffect(() => {
    isMounted.current = true;

    const fetchCurrentUserAndSettings = async () => {
      if (!isMounted.current) return;
      setIsLoadingSettings(true);
      setLoadingError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted.current) {
        setCurrentUser(session?.user || null);
      }
      
      if (!session?.user) {
        if (isMounted.current) {
            setLoadingError("You must be logged in as an admin to manage settings.");
            setIsLoadingSettings(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
          throw error;
        }

        if (data) {
          if (isMounted.current) setAppSettings(prev => ({ ...defaultAppSettings, ...prev, ...data }));
        } else {
          // No settings found, try to insert defaults
          if (isMounted.current) setAppSettings(defaultAppSettings);
          const { error: insertError } = await supabase
            .from('app_settings')
            .insert([{ ...defaultAppSettings, id: 1 }])
            .single();
          if (insertError) {
            console.error("AdminSettingsPage: Error inserting default settings into Supabase:", insertError);
            if (isMounted.current) setLoadingError(`Failed to initialize settings: ${insertError.message}`);
          } else {
            if (isMounted.current) toast({ title: "Settings Initialized", description: "Default settings have been saved to Supabase."});
          }
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error loading settings from Supabase:", error);
        if (isMounted.current) setLoadingError(`Could not load settings from Supabase. Error: ${error.message}`);
        if (isMounted.current) setAppSettings(defaultAppSettings); // Fallback to defaults on error
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };
    
    fetchCurrentUserAndSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, [supabase, toast]);


  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (section: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ ...appSettings, id: 1 }, { onConflict: 'id' }); // Upsert ensures row is created if not exist or updated if exists

      if (error) throw error;

      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings have been updated in Supabase.`,
      });

    } catch (error: any) {
      console.error(`Error saving ${section} settings to Supabase:`, error);
      toast({ title: "Save Failed", description: `Could not save ${section} settings to Supabase. Details: ${error.message}`, variant: "destructive", duration: 9000 });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };
  
  const handleRemoveImage = async (type: 'logo' | 'hero') => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const urlField = type === 'logo' ? 'schoolLogoUrl' : 'schoolHeroImageUrl';
    const updatePayload = { [urlField]: "", id: 1, updatedAt: new Date().toISOString() };


    try {
      const { error } = await supabase
        .from('app_settings')
        .update(updatePayload)
        .eq('id', 1);
      
      if (error) throw error;
      
      if (isMounted.current) {
        setAppSettings(prev => ({...prev, [urlField]: ""}));
      }
      toast({ title: "Image URL Cleared", description: `${type === 'logo' ? 'School logo' : 'Hero image'} URL has been cleared in Supabase.` });
    } catch (error: any) {
      toast({ title: "Clearing Failed", description: `Could not clear ${type} image URL from Supabase. ${error.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  // Clear localStorage data - keep this utility for now, it's separate from Supabase settings
  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      toast({
        title: "LocalStorage Cleared",
        description: "All application data stored in your browser's local storage has been deleted. This does not affect Supabase data. Please refresh or log in again.",
        duration: 7000,
      });
      setIsClearDataDialogOpen(false); 
      window.location.reload();
    }
  };


  if (isLoadingSettings && !loadingError) {
     return (
       <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading system settings from Supabase...</p>
        </div>
     );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Settings className="mr-3 h-8 w-8" /> System Settings
        </h2>
      </div>

      {loadingError && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader>
          <CardContent><p>{loadingError}</p></CardContent>
        </Card>
      )}

      {!isLoadingSettings && !loadingError && currentUser && (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle>
            <CardDescription>Configure current academic year for copyright etc. (Saves to Supabase)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentAcademicYear">Current Academic Year</Label>
              <Input id="currentAcademicYear" value={appSettings.currentAcademicYear} onChange={(e) => handleInputChange('currentAcademicYear', e.target.value)} placeholder="e.g., 2024-2025" />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Academic")} disabled={!currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Academic
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><School/> School Information</CardTitle>
            <CardDescription>Update school details. Image URLs are saved to Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div><Label htmlFor="schoolName">School Name</Label><Input id="schoolName" value={appSettings.schoolName} onChange={(e) => handleInputChange('schoolName', e.target.value)} /></div>
            <div><Label htmlFor="schoolSlogan">School Slogan (for Homepage)</Label><Textarea id="schoolSlogan" value={appSettings.schoolSlogan || ""} onChange={(e) => handleInputChange('schoolSlogan', e.target.value)} /></div>
            <div><Label htmlFor="schoolAddress">School Address</Label><Textarea id="schoolAddress" value={appSettings.schoolAddress} onChange={(e) => handleInputChange('schoolAddress', e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="schoolPhone">Contact Phone</Label><Input id="schoolPhone" type="tel" value={appSettings.schoolPhone} onChange={(e) => handleInputChange('schoolPhone', e.target.value)} /></div>
              <div><Label htmlFor="schoolEmail">Contact Email</Label><Input type="email" id="schoolEmail" value={appSettings.schoolEmail} onChange={(e) => handleInputChange('schoolEmail', e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolLogoUrl" className="flex items-center"><LinkIcon className="mr-2 h-4 w-4" /> School Logo URL</Label>
              {appSettings.schoolLogoUrl && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={appSettings.schoolLogoUrl} alt="Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="schoolLogoUrl" type="url" placeholder="https://example.com/logo.png" value={appSettings.schoolLogoUrl} onChange={(e) => handleInputChange('schoolLogoUrl', e.target.value)} />
              <p className="text-xs text-muted-foreground">Enter a publicly accessible URL for the school logo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolHeroImageUrl" className="flex items-center"><LinkIcon className="mr-2 h-4 w-4" /> Homepage Hero Image URL</Label>
               {appSettings.schoolHeroImageUrl && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={appSettings.schoolHeroImageUrl} alt="Hero Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="schoolHeroImageUrl" type="url" placeholder="https://example.com/hero.jpg" value={appSettings.schoolHeroImageUrl} onChange={(e) => handleInputChange('schoolHeroImageUrl', e.target.value)} />
              <p className="text-xs text-muted-foreground">Enter a publicly accessible URL for the homepage hero image.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("School Information")} disabled={!currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save School Info
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage notification preferences (Saves to Supabase)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3"><Checkbox id="enableEmailNotifications" checked={appSettings.enableEmailNotifications} onCheckedChange={(checked) => handleInputChange('enableEmailNotifications', !!checked)} /><Label htmlFor="enableEmailNotifications">Enable Email Notifications</Label></div>
            <div className="flex items-center space-x-3"><Checkbox id="enableSmsNotifications" checked={appSettings.enableSmsNotifications} onCheckedChange={(checked) => handleInputChange('enableSmsNotifications', !!checked)} /><Label htmlFor="enableSmsNotifications">Enable SMS (mock)</Label></div>
            <div><Label htmlFor="emailFooterSignature">Default Email Footer</Label><Textarea id="emailFooterSignature" value={appSettings.emailFooterSignature} onChange={(e) => handleInputChange('emailFooterSignature', e.target.value)} rows={3} /></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Notification")} disabled={!currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Notifications
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Puzzle/> Integrations (Mock)</CardTitle><CardDescription>API Keys are mock (Saves to Supabase)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="paymentGatewayApiKey">Payment Gateway API Key (Test)</Label><Input type="password" id="paymentGatewayApiKey" value={appSettings.paymentGatewayApiKey} onChange={(e) => handleInputChange('paymentGatewayApiKey', e.target.value)} /></div>
            <div><Label htmlFor="smsProviderApiKey">SMS Provider API Key (Test)</Label><Input type="password" id="smsProviderApiKey" value={appSettings.smsProviderApiKey} onChange={(e) => handleInputChange('smsProviderApiKey', e.target.value)} /></div>
            <div><Label htmlFor="systemApiKey">System API Key</Label><div className="flex items-center gap-2"><Input id="systemApiKey" value="•••••••• (Mock)" readOnly /><Button variant="outline" onClick={() => toast({title: "API Key Regenerated (Mock)"})}>Regenerate</Button></div></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Integration")} disabled={!currentUser || isSaving}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Integrations
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-destructive bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-3 h-7 w-7" /> Reset LocalStorage Data
                </CardTitle>
                <CardDescription className="text-destructive/90">
                This action is irreversible and will permanently delete data stored in your browser. It does not affect Supabase data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={!currentUser || isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All LocalStorage Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete ALL application data stored in THIS browser's local storage,
                        including NON-Supabase user registrations, fee structures, payments, announcements, assignments, results, timetables etc.
                        This cannot be undone.
                        <br/><br/>
                        <strong>This will NOT delete any data from your Supabase database.</strong>
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all localStorage data
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-3">
                Use this if you want to clear out any old data from browser storage that is not managed by Supabase.
                </p>
            </CardContent>
        </Card>
      </>
      )}
       {!isLoadingSettings && !currentUser && !loadingError && (
           <Card className="border-amber-500 bg-amber-500/10">
             <CardHeader><CardTitle className="text-amber-700 flex items-center"><AlertCircle /> Admin Access Required</CardTitle></CardHeader>
             <CardContent><p className="text-amber-600">You must be logged in as an administrator to view and manage system settings.</p></CardContent>
           </Card>
       )}
    </div>
  );
}
