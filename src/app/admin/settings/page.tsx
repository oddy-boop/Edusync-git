
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, Bell, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, AlertTriangle, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import type { User, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { GRADE_LEVELS } from '@/lib/constants';

interface AppSettings {
  id?: number;
  current_academic_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  enable_email_notifications: boolean;
  email_footer_signature: string;
  updated_at?: string;
}

const defaultAppSettings: AppSettings = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "EduSync Platform",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@edusync.com",
  school_logo_url: "",
  enable_email_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
};

const SUPABASE_STORAGE_BUCKET = 'school-assets';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [isPromotionConfirmOpen, setIsPromotionConfirmOpen] = useState(false);
  const [pendingNewAcademicYear, setPendingNewAcademicYear] = useState<string | null>(null);
  const [oldAcademicYearForPromotion, setOldAcademicYearForPromotion] = useState<string | null>(null);
  const [isPromotionDialogActionBusy, setIsPromotionDialogActionBusy] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    try {
      supabaseRef.current = getSupabase();
    } catch (initError: any) {
      if (isMounted.current) {
        setLoadingError("Failed to connect to the database. Settings cannot be loaded or saved.");
        setIsLoadingSettings(false);
      }
      return;
    }

    const fetchCurrentUserAndSettings = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoadingSettings(true);
      setLoadingError(null);

      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (isMounted.current) setCurrentUser(session?.user || null);

      if (!session?.user) {
        if (isMounted.current) {
            setLoadingError("You must be logged in as an admin to manage settings.");
            setIsLoadingSettings(false);
        }
        return;
      }

      try {
        const { data, error } = await supabaseRef.current.from('app_settings').select('*').limit(1).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (isMounted.current) {
            const mergedSettings = { ...defaultAppSettings, ...data } as AppSettings;
            setAppSettings(mergedSettings);
            setLogoPreview(mergedSettings.school_logo_url || null);
          }
        } else {
          if (isMounted.current) setAppSettings({ ...defaultAppSettings, id: 1 });
          const { error: upsertError } = await supabaseRef.current.from('app_settings').upsert({ ...defaultAppSettings, id: 1 }, { onConflict: 'id' });
          if (upsertError) {
             console.error("AdminSettingsPage: Error upserting default settings:", upsertError);
             if (isMounted.current) setLoadingError(`Failed to initialize settings: ${upsertError.message}`);
          }
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error loading settings:", error);
        if (isMounted.current) setLoadingError(`Could not load settings. Error: ${error.message}`);
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };

    fetchCurrentUserAndSettings();

    return () => {
      isMounted.current = false;
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, []);

  const handleSettingChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPreview(appSettings.school_logo_url || null);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!supabaseRef.current) return null;
    const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).upload(fileName, file, { upsert: true });
    if (error) {
      toast({ title: "Upload Failed", description: `Could not upload logo: ${error.message}`, variant: "destructive" });
      return null;
    }
    const { data } = supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(fileName);
    return data?.publicUrl || null;
  };

  const promoteAllStudents = async (oldAcademicYear: string, newAcademicYear: string) => {
    if (!supabaseRef.current || !currentUser) return;
    try {
      const { data: students, error: studentsError } = await supabaseRef.current.from('students').select('id, student_id_display, grade_level, full_name');
      if (studentsError) throw new Error(`Failed to fetch students: ${studentsError.message}`);

      for (const student of students || []) {
        const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
        if (currentGradeIndex < GRADE_LEVELS.length - 1 && currentGradeIndex !== -1) {
          const nextGrade = GRADE_LEVELS[currentGradeIndex + 1];
          await supabaseRef.current.from('students').update({ grade_level: nextGrade, updated_at: new Date().toISOString() }).eq('id', student.id);
        }
      }
      toast({ title: "Promotion Complete", description: "Students have been promoted to the next grade level." });
    } catch (error: any) {
      toast({ title: "Promotion Failed", description: `An error occurred during student promotion: ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser || !supabaseRef.current) return;
    setIsSaving(true);
    let settingsToSave = { ...appSettings };

    if (logoFile) {
      const newLogoUrl = await uploadLogo(logoFile);
      if (newLogoUrl) {
        settingsToSave.school_logo_url = newLogoUrl;
      } else {
        setIsSaving(false);
        return;
      }
    }

    try {
      const { data, error } = await supabaseRef.current.from('app_settings').upsert(settingsToSave, { onConflict: 'id' }).select().single();
      if (error) throw error;
      toast({ title: "Settings Saved", description: "Your school settings have been updated successfully." });
      if (isMounted.current && data) setAppSettings(data as AppSettings);
    } catch (error: any) {
      toast({ title: "Error Saving Settings", description: error.message, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
        setLogoFile(null);
      }
    }
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      toast({ title: "LocalStorage Cleared", description: "Browser data cleared. Please refresh or log in again.", duration: 7000 });
      setIsClearDataDialogOpen(false);
      window.location.reload(); 
    }
  };

  if (isLoadingSettings) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading system settings...</p></div>;
  }
  if (loadingError) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{loadingError}</p></CardContent></Card>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System & App Settings</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><School /> School Information</CardTitle>
            <CardDescription>Manage the core details of your school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleSettingChange('school_name', e.target.value)} /></div>
            <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
            <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
            <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
            <div className="space-y-2">
              <Label htmlFor="logo_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> School Logo</Label>
              {logoPreview && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={logoPreview} alt="Logo Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/></div>}
              <Input id="logo_file" type="file" accept="image/*" onChange={handleLogoFileChange} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle>
                    <CardDescription>Configure the current academic year.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div><Label htmlFor="current_academic_year">Current Academic Year</Label><Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" /></div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage system-wide email notifications.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
                    <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={!currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />}
              Save All Settings
          </Button>
      </div>

      <Card className="shadow-lg border-destructive bg-destructive/5">
        <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-3 h-7 w-7" /> Dangerous Actions</CardTitle><CardDescription className="text-destructive/90">Irreversible actions for maintenance.</CardDescription></CardHeader>
        <CardContent>
            <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
            <AlertDialogTrigger asChild><Button variant="destructive" className="w-full" disabled={!currentUser || isSaving}><Trash2 className="mr-2 h-4 w-4" /> Clear All LocalStorage Data</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete ALL application data stored in THIS browser's local storage. This will NOT delete any data from your remote database.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive hover:bg-destructive/90">Yes, delete all localStorage data</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-3">Use this for clearing old browser data not managed by the database.</p>
        </CardContent>
      </Card>
    </div>
  );
}

  