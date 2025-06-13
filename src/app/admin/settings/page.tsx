
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import NextImage from 'next/image';
import { APP_SETTINGS_KEY } from '@/lib/constants';
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

const LOGO_STORAGE_PATH = "branding/schoolLogo";
const HERO_IMAGE_STORAGE_PATH = "branding/schoolHeroImage";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [heroImagePreviewUrl, setHeroImagePreviewUrl] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);

  useEffect(() => {
    setIsLoadingSettings(true);
    setLoadingError(null);
    if (typeof window !== 'undefined') {
      try {
        const storedSettingsRaw = localStorage.getItem(APP_SETTINGS_KEY);
        if (storedSettingsRaw) {
          const storedSettings = JSON.parse(storedSettingsRaw);
          setAppSettings(prev => ({ ...defaultAppSettings, ...prev, ...storedSettings }));
          if (storedSettings.schoolLogoUrl) setLogoPreviewUrl(storedSettings.schoolLogoUrl);
          if (storedSettings.schoolHeroImageUrl) setHeroImagePreviewUrl(storedSettings.schoolHeroImageUrl);
        } else {
          setAppSettings(defaultAppSettings);
          localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(defaultAppSettings));
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error loading settings from localStorage:", error);
        setLoadingError(`Could not load settings from localStorage. Error: ${error.message}`);
        setAppSettings(defaultAppSettings);
      }
    }
    setIsLoadingSettings(false);
    
    return () => {
      if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select an image smaller than ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      const newPreviewUrl = URL.createObjectURL(file);
      if (type === 'logo') {
        if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
        setLogoFile(file);
        setLogoPreviewUrl(newPreviewUrl);
      } else {
        if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
        setHeroImageFile(file);
        setHeroImagePreviewUrl(newPreviewUrl);
      }
    }
  };
  
  const uploadImageToStorage = async (file: File, storagePath: string): Promise<string> => {
    const imageRef = storageRef(storage, storagePath);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  };

  const handleSaveSettings = async (section: string) => {
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    
    let finalSettings = { ...appSettings };

    try {
      if (section === "School Information" || section === "All") {
        if (logoFile) {
          toast({ title: "Uploading Logo...", description: "Please wait." });
          finalSettings.schoolLogoUrl = await uploadImageToStorage(logoFile, LOGO_STORAGE_PATH);
          setLogoFile(null); 
          setLogoPreviewUrl(finalSettings.schoolLogoUrl);
          toast({ title: "Logo Uploaded", description: "School logo updated." });
        }
        if (heroImageFile) {
          toast({ title: "Uploading Hero Image...", description: "Please wait." });
          finalSettings.schoolHeroImageUrl = await uploadImageToStorage(heroImageFile, HERO_IMAGE_STORAGE_PATH);
          setHeroImageFile(null);
          setHeroImagePreviewUrl(finalSettings.schoolHeroImageUrl);
          toast({ title: "Hero Image Uploaded", description: "Homepage hero image updated." });
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(finalSettings));
        setAppSettings(finalSettings);
      }
      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings have been updated in localStorage.`,
      });

    } catch (error: any) {
      console.error(`Error saving ${section} settings:`, error);
      let description = `Could not save ${section} settings. Details: ${error.message}`;
      
      if ((section === "School Information" || section === "All") && (logoFile || heroImageFile)) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('storage/')) {
            description = `Image upload failed: ${error.message}. Please check Firebase Storage permissions and ensure the admin has proper claims.`;
        } else {
            description = `Failed to save school information or upload image: ${error.message}`;
        }
      }
      
      toast({ title: "Save Failed", description: description, variant: "destructive", duration: 9000 });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveImage = async (type: 'logo' | 'hero') => {
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const path = type === 'logo' ? LOGO_STORAGE_PATH : HERO_IMAGE_STORAGE_PATH;
    const urlField = type === 'logo' ? 'schoolLogoUrl' : 'schoolHeroImageUrl';
    const currentUrl = appSettings[urlField];

    try {
      if (currentUrl && currentUrl.includes("firebasestorage.googleapis.com")) {
        const imageRef = storageRef(storage, path);
        await deleteObject(imageRef).catch(err => {
          if (err.code === 'storage/object-not-found') console.warn(`Object not found at ${path}. Proceeding.`);
          else throw err;
        });
      }
      
      const updatedSettings = { ...appSettings, [urlField]: "" };
      if (typeof window !== 'undefined') {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updatedSettings));
        setAppSettings(updatedSettings); 
      }
      
      if (type === 'logo') {
        setLogoFile(null);
        if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      } else {
        setHeroImageFile(null);
        if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
        setHeroImagePreviewUrl(null);
      }
      toast({ title: "Image Removed", description: `${type === 'logo' ? 'School logo' : 'Hero image'} has been removed.` });
    } catch (error: any) {
      toast({ title: "Removal Failed", description: `Could not remove ${type} image. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      toast({
        title: "LocalStorage Cleared",
        description: "All application data stored in your browser's local storage has been deleted. Please refresh or log in again.",
        duration: 7000,
      });
      setIsClearDataDialogOpen(false); 
      // Optionally force a reload or redirect to login to reflect the cleared state
      // window.location.reload();
    }
  };


  if (isLoadingSettings && !loadingError) {
     return (
       <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading system settings from localStorage...</p>
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

      {!isLoadingSettings && !loadingError && (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle>
            <CardDescription>Configure current academic year for copyright etc. (Saves to localStorage)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentAcademicYear">Current Academic Year</Label>
              <Input id="currentAcademicYear" value={appSettings.currentAcademicYear} onChange={(e) => handleInputChange('currentAcademicYear', e.target.value)} placeholder="e.g., 2024-2025" />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Academic")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Academic
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><School/> School Information</CardTitle>
            <CardDescription>Update school details. Images use Firebase Storage, URLs saved to localStorage.</CardDescription>
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
              <Label htmlFor="schoolLogoFile" className="flex items-center"><ImageIcon/> School Logo</Label>
              {(logoPreviewUrl || appSettings.schoolLogoUrl) && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={logoPreviewUrl || appSettings.schoolLogoUrl || "https://placehold.co/150x80.png"} alt="Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  {(appSettings.schoolLogoUrl || logoPreviewUrl) && 
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>}
                </div>
              )}
              <Input id="schoolLogoFile" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
              <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_BYTES / (1024*1024)}MB. Upload replaces existing.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolHeroImageFile" className="flex items-center"><ImageIcon/> Homepage Hero Image</Label>
               {(heroImagePreviewUrl || appSettings.schoolHeroImageUrl) && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={heroImagePreviewUrl || appSettings.schoolHeroImageUrl || "https://placehold.co/300x169.png"} alt="Hero Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                   {(appSettings.schoolHeroImageUrl || heroImagePreviewUrl) &&
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving}><Trash2 className="h-4 w-4"/></Button>}
                </div>
              )}
              <Input id="schoolHeroImageFile" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'hero')} />
              <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_BYTES / (1024*1024)}MB. Upload replaces existing.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("School Information")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save School Info
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage notification preferences (Saves to localStorage)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3"><Checkbox id="enableEmailNotifications" checked={appSettings.enableEmailNotifications} onCheckedChange={(checked) => handleInputChange('enableEmailNotifications', !!checked)} /><Label htmlFor="enableEmailNotifications">Enable Email Notifications</Label></div>
            <div className="flex items-center space-x-3"><Checkbox id="enableSmsNotifications" checked={appSettings.enableSmsNotifications} onCheckedChange={(checked) => handleInputChange('enableSmsNotifications', !!checked)} /><Label htmlFor="enableSmsNotifications">Enable SMS (mock)</Label></div>
            <div><Label htmlFor="emailFooterSignature">Default Email Footer</Label><Textarea id="emailFooterSignature" value={appSettings.emailFooterSignature} onChange={(e) => handleInputChange('emailFooterSignature', e.target.value)} rows={3} /></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Notification")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Notifications
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Puzzle/> Integrations (Mock)</CardTitle><CardDescription>API Keys are mock (Saves to localStorage)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="paymentGatewayApiKey">Payment Gateway API Key (Test)</Label><Input type="password" id="paymentGatewayApiKey" value={appSettings.paymentGatewayApiKey} onChange={(e) => handleInputChange('paymentGatewayApiKey', e.target.value)} /></div>
            <div><Label htmlFor="smsProviderApiKey">SMS Provider API Key (Test)</Label><Input type="password" id="smsProviderApiKey" value={appSettings.smsProviderApiKey} onChange={(e) => handleInputChange('smsProviderApiKey', e.target.value)} /></div>
            <div><Label htmlFor="systemApiKey">System API Key</Label><div className="flex items-center gap-2"><Input id="systemApiKey" value="•••••••• (Mock)" readOnly /><Button variant="outline" onClick={() => toast({title: "API Key Regenerated (Mock)"})}>Regenerate</Button></div></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Integration")} disabled={!auth.currentUser || isSaving}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Integrations
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-destructive bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-3 h-7 w-7" /> Reset Application Data
                </CardTitle>
                <CardDescription className="text-destructive/90">
                This action is irreversible and will permanently delete data stored in your browser.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={!auth.currentUser || isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All LocalStorage Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete ALL application data stored in your browser's local storage,
                        including settings, user registrations, fee structures, payments, announcements, assignments, results, timetables etc.
                        This cannot be undone. You will need to set up the application from scratch.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all data
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-3">
                Use this if you want to completely reset the application to its initial state for testing or a fresh start.
                You may need to refresh the page or log out and log back in after clearing data.
                </p>
            </CardContent>
        </Card>
      </>
      )}
    </div>
  );
}
