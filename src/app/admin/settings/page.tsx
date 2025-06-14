
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
import type { User, SupabaseClient } from '@supabase/supabase-js';

interface AppSettings {
  current_academic_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  school_hero_image_url: string;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  email_footer_signature: string;
  payment_gateway_api_key: string;
  sms_provider_api_key: string;
  school_slogan?: string;
}

const defaultAppSettings: AppSettings = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "St. Joseph's Montessori",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@stjosephmontessori.edu.gh",
  school_logo_url: "",
  school_hero_image_url: "",
  enable_email_notifications: true,
  enable_sms_notifications: false,
  email_footer_signature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  payment_gateway_api_key: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  sms_provider_api_key: "sms_apikey_xxxxxxxxxxxxxxxx",
  school_slogan: "A modern solution for St. Joseph's Montessori (Ghana) to manage school operations, enhance learning, and empower students, teachers, and administrators.",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  useEffect(() => {
    isMounted.current = true;

    const fetchCurrentUserAndSettings = async () => {
      if (!isMounted.current) return;
      setIsLoadingSettings(true);
      setLoadingError(null);

      let supabase: SupabaseClient | null = null;
      try {
        supabase = getSupabase();
      } catch (initError: any) {
        console.error("AdminSettingsPage: Failed to initialize Supabase client:", initError.message);
        if (isMounted.current) {
          setLoadingError("Failed to connect to the database. Settings cannot be loaded.");
          setIsLoadingSettings(false);
        }
        return;
      }
      
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

        if (error && error.code !== 'PGRST116') { 
          throw error;
        }

        if (data) {
          if (isMounted.current) {
             // Ensure all default keys are present even if data from DB is partial
            const mergedSettings = { ...defaultAppSettings, ...data };
            setAppSettings(mergedSettings as AppSettings);
          }
        } else {
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
        if (isMounted.current) setAppSettings(defaultAppSettings); 
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };
    
    fetchCurrentUserAndSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, [toast]);


  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (section: string) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    
    let supabase: SupabaseClient | null = null;
    try {
        supabase = getSupabase();
    } catch (initError: any) {
        toast({ title: "Save Failed", description: `Supabase client error: ${initError.message}`, variant: "destructive" });
        setIsSaving(false);
        return;
    }
    
    try {
      // Ensure all keys defined in AppSettings interface are present in appSettings state before saving
      const settingsToSave: Partial<AppSettings> & { id: number; updated_at: string } = {
        ...appSettings, // Spread current state which should be snake_case
        id: 1, // Ensure ID is always 1 for upsert
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('app_settings')
        .upsert(settingsToSave, { onConflict: 'id' }); 

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
    const urlField = type === 'logo' ? 'school_logo_url' : 'school_hero_image_url';
    const updatePayload = { [urlField]: "", id: 1, updated_at: new Date().toISOString() };

    let supabase: SupabaseClient | null = null;
    try {
        supabase = getSupabase();
    } catch (initError: any) {
        toast({ title: "Clearing Failed", description: `Supabase client error: ${initError.message}`, variant: "destructive" });
        setIsSaving(false);
        return;
    }

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
              <Label htmlFor="current_academic_year">Current Academic Year</Label>
              <Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleInputChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" />
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
            <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleInputChange('school_name', e.target.value)} /></div>
            <div><Label htmlFor="school_slogan">School Slogan (for Homepage)</Label><Textarea id="school_slogan" value={appSettings.school_slogan || ""} onChange={(e) => handleInputChange('school_slogan', e.target.value)} /></div>
            <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address} onChange={(e) => handleInputChange('school_address', e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleInputChange('school_phone', e.target.value)} /></div>
              <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleInputChange('school_email', e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_logo_url" className="flex items-center"><LinkIcon className="mr-2 h-4 w-4" /> School Logo URL</Label>
              {appSettings.school_logo_url && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={appSettings.school_logo_url} alt="Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="school_logo_url" type="url" placeholder="https://example.com/logo.png" value={appSettings.school_logo_url} onChange={(e) => handleInputChange('school_logo_url', e.target.value)} />
              <p className="text-xs text-muted-foreground">Enter a publicly accessible URL for the school logo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_hero_image_url" className="flex items-center"><LinkIcon className="mr-2 h-4 w-4" /> Homepage Hero Image URL</Label>
               {appSettings.school_hero_image_url && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={appSettings.school_hero_image_url} alt="Hero Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="school_hero_image_url" type="url" placeholder="https://example.com/hero.jpg" value={appSettings.school_hero_image_url} onChange={(e) => handleInputChange('school_hero_image_url', e.target.value)} />
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
            <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleInputChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
            <div className="flex items-center space-x-3"><Checkbox id="enable_sms_notifications" checked={appSettings.enable_sms_notifications} onCheckedChange={(checked) => handleInputChange('enable_sms_notifications', !!checked)} /><Label htmlFor="enable_sms_notifications">Enable SMS (mock)</Label></div>
            <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleInputChange('email_footer_signature', e.target.value)} rows={3} /></div>
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
            <div><Label htmlFor="payment_gateway_api_key">Payment Gateway API Key (Test)</Label><Input type="password" id="payment_gateway_api_key" value={appSettings.payment_gateway_api_key} onChange={(e) => handleInputChange('payment_gateway_api_key', e.target.value)} /></div>
            <div><Label htmlFor="sms_provider_api_key">SMS Provider API Key (Test)</Label><Input type="password" id="sms_provider_api_key" value={appSettings.sms_provider_api_key} onChange={(e) => handleInputChange('sms_provider_api_key', e.target.value)} /></div>
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
