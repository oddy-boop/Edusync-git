
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon, UploadCloud, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth, storage } from "@/lib/firebase"; // Import storage
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; // Storage functions
import NextImage from 'next/image'; // For preview

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

const defaultAppSettings = {
  currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  schoolName: "St. Joseph's Montessori",
  schoolAddress: "123 Education Road, Accra, Ghana",
  schoolPhone: "+233 12 345 6789",
  schoolEmail: "info@stjosephmontessori.edu.gh",
  schoolLogoUrl: "", // Default empty, will show placeholder
  schoolHeroImageUrl: "", // Default empty, will show placeholder
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  emailFooterSignature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  paymentGatewayApiKey: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  smsProviderApiKey: "sms_apikey_xxxxxxxxxxxxxxxx",
};

const LOGO_STORAGE_PATH = "branding/schoolLogo";
const HERO_IMAGE_STORAGE_PATH = "branding/schoolHeroImage";

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const [appSettings, setAppSettings] = useState(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [heroImagePreviewUrl, setHeroImagePreviewUrl] = useState<string | null>(null);


  useEffect(() => {
    console.log("AdminSettingsPage: useEffect - Setting up Firestore listener for settings.");
    setIsLoadingSettings(true);
    setLoadingError(null);
    console.log("AdminSettingsPage: Current auth user at start of effect:", auth.currentUser);

    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("AdminSettingsPage: Firestore document snapshot exists. Data:", docSnap.data());
        const firestoreSettings = docSnap.data();
        setAppSettings(prev => ({
          ...defaultAppSettings, 
          ...prev, 
          ...firestoreSettings 
        }));
        // Set initial previews from fetched URLs
        if (firestoreSettings.schoolLogoUrl) setLogoPreviewUrl(firestoreSettings.schoolLogoUrl);
        if (firestoreSettings.schoolHeroImageUrl) setHeroImagePreviewUrl(firestoreSettings.schoolHeroImageUrl);

      } else {
        console.warn(`AdminSettingsPage: No '${APP_SETTINGS_DOC_ID}' document found in '${APP_SETTINGS_COLLECTION}' collection. Using default settings.`);
        setAppSettings(defaultAppSettings);
        setLogoPreviewUrl(null);
        setHeroImagePreviewUrl(null);
      }
      setIsLoadingSettings(false);
    }, (error: any) => {
      console.error("AdminSettingsPage: Error fetching settings from Firestore:", error);
      setLoadingError(`Could not load settings from Firestore. Error: ${error.message} (Code: ${error.code})`);
      toast({ title: "Error Loading Settings", description: `Could not load settings from Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
      setAppSettings(defaultAppSettings);
      setIsLoadingSettings(false);
    });

    return () => {
      console.log("AdminSettingsPage: useEffect - Cleaning up Firestore listener.");
      unsubscribe();
      // Revoke object URLs on unmount
      if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
    };
  }, [toast]);


  const handleInputChange = (field: keyof typeof appSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'logo') {
        if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
        setLogoFile(file);
        setLogoPreviewUrl(URL.createObjectURL(file));
      } else {
        if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
        setHeroImageFile(file);
        setHeroImagePreviewUrl(URL.createObjectURL(file));
      }
    }
  };
  
  const uploadImageToStorage = async (file: File, storagePath: string): Promise<string> => {
    const imageRef = storageRef(storage, storagePath);
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const handleSaveSettings = async (section: string) => {
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    console.log(`AdminSettingsPage: Attempting to save ${section} settings. Current user:`, auth.currentUser?.uid);
    
    let finalSettings = { ...appSettings };

    try {
      if (logoFile) {
        toast({ title: "Uploading Logo...", description: "Please wait." });
        const newLogoUrl = await uploadImageToStorage(logoFile, LOGO_STORAGE_PATH);
        finalSettings.schoolLogoUrl = newLogoUrl;
        setLogoFile(null); // Clear file after upload
        setLogoPreviewUrl(newLogoUrl); // Update preview to final URL
         toast({ title: "Logo Uploaded", description: "School logo updated successfully." });
      }
      if (heroImageFile) {
        toast({ title: "Uploading Hero Image...", description: "Please wait." });
        const newHeroImageUrl = await uploadImageToStorage(heroImageFile, HERO_IMAGE_STORAGE_PATH);
        finalSettings.schoolHeroImageUrl = newHeroImageUrl;
        setHeroImageFile(null); // Clear file after upload
        setHeroImagePreviewUrl(newHeroImageUrl); // Update preview to final URL
        toast({ title: "Hero Image Uploaded", description: "Homepage hero image updated successfully." });
      }

      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      await setDoc(settingsDocRef, finalSettings, { merge: true });
      setAppSettings(finalSettings); // Update local state with final URLs

      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings saved to Firestore.`,
      });
      console.log(`AdminSettingsPage: ${section} settings saved successfully to Firestore.`);
    } catch (error: any) {
      console.error(`AdminSettingsPage: Error saving ${section} settings:`, error);
      toast({ title: "Save Failed", description: `Could not save ${section} settings. Details: ${error.message}`, variant: "destructive", duration: 7000 });
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
      if (currentUrl) {
        const imageRef = storageRef(storage, path); // Use path not full URL for deletion ref
        await deleteObject(imageRef).catch(err => {
          // If file doesn't exist in storage (e.g. placeholder), don't throw error
          if (err.code !== 'storage/object-not-found') throw err;
          console.warn(`Tried to delete ${path} but it was not found in Storage. Proceeding to clear Firestore URL.`);
        });
      }
      
      const updatedSettings = { ...appSettings, [urlField]: "" };
      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      await setDoc(settingsDocRef, { [urlField]: "" }, { merge: true });
      
      setAppSettings(updatedSettings);
      if (type === 'logo') {
        setLogoFile(null);
        setLogoPreviewUrl(null);
      } else {
        setHeroImageFile(null);
        setHeroImagePreviewUrl(null);
      }
      toast({ title: "Image Removed", description: `${type === 'logo' ? 'School logo' : 'Hero image'} has been removed.` });
    } catch (error: any) {
      console.error(`Error removing ${type} image:`, error);
      toast({ title: "Removal Failed", description: `Could not remove ${type} image. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Settings className="mr-3 h-8 w-8" /> System Settings
        </h2>
      </div>

      {loadingError && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" /> Loading Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/90">{loadingError}</p>
            <p className="text-sm text-muted-foreground mt-2">Please check your Firestore security rules for the '{APP_SETTINGS_COLLECTION}/{APP_SETTINGS_DOC_ID}' path and ensure read access is allowed. Also, verify your internet connection.</p>
          </CardContent>
        </Card>
      )}

      {isLoadingSettings ? (
         <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading system settings from Firestore...</p>
          </div>
      ) : (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
              <CalendarCog className="mr-3 h-6 w-6" /> Academic Year Management
            </CardTitle>
            <CardDescription>Configure the current academic year. This influences the copyright year displayed in footers (uses the end year of the format "YYYY-YYYY").</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentAcademicYear">Current Academic Year</Label>
              <Input id="currentAcademicYear" value={appSettings.currentAcademicYear} onChange={(e) => handleInputChange('currentAcademicYear', e.target.value)} placeholder="e.g., 2024-2025" />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Academic")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Academic Settings
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
              <School className="mr-3 h-6 w-6" /> School Information & Branding
            </CardTitle>
            <CardDescription>Update school name, address, contact details. Upload logo and homepage hero image (uploads overwrite existing). These settings will be saved to Firestore and reflected across the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="schoolName">School Name</Label>
              <Input id="schoolName" value={appSettings.schoolName} onChange={(e) => handleInputChange('schoolName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="schoolAddress">School Address</Label>
              <Textarea id="schoolAddress" value={appSettings.schoolAddress} onChange={(e) => handleInputChange('schoolAddress', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolPhone">Contact Phone</Label>
                <Input id="schoolPhone" type="tel" value={appSettings.schoolPhone} onChange={(e) => handleInputChange('schoolPhone', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="schoolEmail">Contact Email</Label>
                <Input type="email" id="schoolEmail" value={appSettings.schoolEmail} onChange={(e) => handleInputChange('schoolEmail', e.target.value)} />
              </div>
            </div>
            
            {/* School Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="schoolLogoFile" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>School Logo</Label>
              {logoPreviewUrl && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={logoPreviewUrl} alt="School Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full" onClick={() => handleRemoveImage('logo')} disabled={isSaving}>
                    <Trash2 className="h-3 w-3"/>
                  </Button>
                </div>
              )}
              <Input id="schoolLogoFile" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground mt-1">Recommended: PNG or JPG, approx. 150x80px. Uploading will replace existing logo.</p>
            </div>

            {/* Homepage Hero Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="schoolHeroImageFile" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Homepage Hero Image</Label>
               {heroImagePreviewUrl && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={heroImagePreviewUrl} alt="Hero Image Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                   <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full" onClick={() => handleRemoveImage('hero')} disabled={isSaving}>
                    <Trash2 className="h-3 w-3"/>
                  </Button>
                </div>
              )}
              <Input id="schoolHeroImageFile" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'hero')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground mt-1">Recommended: JPG or PNG, landscape (e.g., 1200x675px). Uploading replaces existing image.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("School Information")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save School Information
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
              <Bell className="mr-3 h-6 w-6" /> Notification Settings
            </CardTitle>
            <CardDescription>Manage email and SMS notification preferences and templates. (SMS settings are mock).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox id="enableEmailNotifications" checked={appSettings.enableEmailNotifications} onCheckedChange={(checked) => handleInputChange('enableEmailNotifications', !!checked)} />
              <Label htmlFor="enableEmailNotifications" className="font-normal cursor-pointer">Enable Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="enableSmsNotifications" checked={appSettings.enableSmsNotifications} onCheckedChange={(checked) => handleInputChange('enableSmsNotifications', !!checked)} />
              <Label htmlFor="enableSmsNotifications" className="font-normal cursor-pointer">Enable SMS Notifications (mock, requires SMS provider integration)</Label>
            </div>
            <div>
              <Label htmlFor="emailFooterSignature">Default Email Footer Signature</Label>
              <Textarea id="emailFooterSignature" value={appSettings.emailFooterSignature} onChange={(e) => handleInputChange('emailFooterSignature', e.target.value)} placeholder="e.g., Regards, School Administration" rows={3} />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Notification")} disabled={!auth.currentUser || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Notification Settings
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
              <Puzzle className="mr-3 h-6 w-6" /> Integrations & API (Mock)
            </CardTitle>
            <CardDescription>Configure third-party services. API Keys are mock and for demonstration; manage sensitive keys securely.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paymentGatewayApiKey">Payment Gateway API Key (Test Mode)</Label>
              <Input type="password" id="paymentGatewayApiKey" value={appSettings.paymentGatewayApiKey} onChange={(e) => handleInputChange('paymentGatewayApiKey', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="smsProviderApiKey">SMS Provider API Key (Test Mode)</Label>
              <Input type="password" id="smsProviderApiKey" value={appSettings.smsProviderApiKey} onChange={(e) => handleInputChange('smsProviderApiKey', e.target.value)} />
            </div>
             <div>
              <Label htmlFor="systemApiKey">System API Key for External Access</Label>
              <div className="flex items-center gap-2">
                  <Input id="systemApiKey" value="•••••••••••••••••••••••••••••••• (Mock - Not Saved)" readOnly className="bg-muted/50 cursor-not-allowed" />
                  <Button variant="outline" onClick={() => toast({title: "API Key Regenerated (Mock)", description:"A new API key would typically be generated and displayed here, then saved securely."})}>
                      Regenerate Key
                  </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use this key for secure access from external applications (mock functionality).</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Integration")} disabled={!auth.currentUser || isSaving}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Integration Settings (Mock for API Keys)
            </Button>
          </CardFooter>
        </Card>
      </>
      )}
    </div>
  );
}
