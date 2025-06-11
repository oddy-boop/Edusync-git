
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2 } from "lucide-react"; // Removed UploadCloud as it's not directly used in UI now
import { useToast } from "@/hooks/use-toast";
import { db, auth, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import NextImage from 'next/image';

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

const defaultAppSettings = {
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
};

const LOGO_STORAGE_PATH = "branding/schoolLogo";
const HERO_IMAGE_STORAGE_PATH = "branding/schoolHeroImage";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

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
    setIsLoadingSettings(true);
    setLoadingError(null);
    console.log("AdminSettingsPage: Current auth user at start of effect:", auth.currentUser);

    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    console.log(`AdminSettingsPage: Attempting to get document from path: ${APP_SETTINGS_COLLECTION}/${APP_SETTINGS_DOC_ID}`);
    
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("AdminSettingsPage: Firestore document snapshot exists. Data:", docSnap.data());
        const firestoreSettings = docSnap.data();
        setAppSettings(prev => ({
          ...defaultAppSettings, 
          ...prev, 
          ...firestoreSettings 
        }));
        if (firestoreSettings.schoolLogoUrl) setLogoPreviewUrl(firestoreSettings.schoolLogoUrl);
        else setLogoPreviewUrl(null); // Ensure preview is cleared if URL is removed from DB
        if (firestoreSettings.schoolHeroImageUrl) setHeroImagePreviewUrl(firestoreSettings.schoolHeroImageUrl);
        else setHeroImagePreviewUrl(null); // Ensure preview is cleared

      } else {
        console.warn(`AdminSettingsPage: No '${APP_SETTINGS_DOC_ID}' document found in '${APP_SETTINGS_COLLECTION}' collection. Using default settings.`);
        setAppSettings(defaultAppSettings);
        setLogoPreviewUrl(null);
        setHeroImagePreviewUrl(null);
      }
      setIsLoadingSettings(false);
    }, (error: any) => {
      console.error("AdminSettingsPage: Error listening to settings from Firestore:", error);
      setLoadingError(`Could not load settings from Firestore. Error: ${error.message} (Code: ${error.code})`);
      toast({ title: "Error Loading Settings", description: `Could not load settings from Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
      setAppSettings(defaultAppSettings); // Fallback to defaults
      setIsLoadingSettings(false);
    });

    return () => {
      console.log("AdminSettingsPage: useEffect - Cleaning up Firestore listener.");
      unsubscribe();
      if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      if (heroImagePreviewUrl && heroImagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(heroImagePreviewUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // toast is stable, only run on mount essentially


  const handleInputChange = (field: keyof typeof appSettings, value: string | boolean) => {
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
        e.target.value = ""; // Clear the input
        return;
      }

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
    console.log(`uploadImageToStorage: Uploading ${file.name} to ${storagePath}`);
    const imageRef = storageRef(storage, storagePath);
    try {
      const snapshot = await uploadBytes(imageRef, file);
      console.log(`uploadImageToStorage: Uploaded ${file.name} successfully. Snapshot:`, snapshot);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`uploadImageToStorage: Got download URL for ${file.name}: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error(`uploadImageToStorage: Error uploading file ${file.name} to ${storagePath}:`, error);
      throw error; // Re-throw to be caught by handleSaveSettings
    }
  };

  const handleSaveSettings = async (section: string) => {
    console.log("handleSaveSettings: Save process initiated for section:", section);
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      console.error("handleSaveSettings: User not authenticated.");
      return;
    }
    setIsSaving(true);
    console.log(`handleSaveSettings: User ${auth.currentUser.uid} is attempting to save ${section} settings.`);
    
    let finalSettings = { ...appSettings }; // Operate on a copy

    try {
      if (section === "School Information" || section === "All") { // Assuming section based saving
        if (logoFile) {
          toast({ title: "Uploading Logo...", description: "Please wait." });
          try {
            console.log("handleSaveSettings: Attempting to upload logo:", logoFile.name);
            const newLogoUrl = await uploadImageToStorage(logoFile, LOGO_STORAGE_PATH);
            finalSettings.schoolLogoUrl = newLogoUrl;
            setLogoFile(null); // Clear file after successful upload
            // setLogoPreviewUrl(newLogoUrl); // Preview will update from Firestore listener
            console.log("handleSaveSettings: Logo uploaded successfully. New URL:", newLogoUrl);
            toast({ title: "Logo Uploaded", description: "School logo updated." });
          } catch (uploadError: any) {
            console.error("handleSaveSettings: Error uploading logo:", uploadError);
            toast({ title: "Logo Upload Failed", description: `Could not upload logo: ${uploadError.message}. Previous logo (if any) will be kept.`, variant: "destructive", duration: 7000 });
            // Keep existing logo URL if upload fails, already in finalSettings from appSettings
          }
        }
        if (heroImageFile) {
          toast({ title: "Uploading Hero Image...", description: "Please wait." });
          try {
            console.log("handleSaveSettings: Attempting to upload hero image:", heroImageFile.name);
            const newHeroImageUrl = await uploadImageToStorage(heroImageFile, HERO_IMAGE_STORAGE_PATH);
            finalSettings.schoolHeroImageUrl = newHeroImageUrl;
            setHeroImageFile(null); // Clear file after successful upload
            // setHeroImagePreviewUrl(newHeroImageUrl); // Preview will update from Firestore listener
            console.log("handleSaveSettings: Hero image uploaded successfully. New URL:", newHeroImageUrl);
            toast({ title: "Hero Image Uploaded", description: "Homepage hero image updated." });
          } catch (uploadError: any) {
            console.error("handleSaveSettings: Error uploading hero image:", uploadError);
            toast({ title: "Hero Image Upload Failed", description: `Could not upload hero image: ${uploadError.message}. Previous image (if any) will be kept.`, variant: "destructive", duration: 7000 });
            // Keep existing hero image URL if upload fails
          }
        }
      }

      console.log("handleSaveSettings: finalSettings to save to Firestore:", finalSettings);
      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      console.log("handleSaveSettings: Attempting to save to Firestore path:", `${APP_SETTINGS_COLLECTION}/${APP_SETTINGS_DOC_ID}`);
      await setDoc(settingsDocRef, finalSettings, { merge: true });
      // setAppSettings(finalSettings); // State will be updated by onSnapshot listener
      console.log(`handleSaveSettings: ${section} settings saved successfully to Firestore.`);
      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings have been updated in Firestore.`,
      });

    } catch (error: any) {
      console.error(`handleSaveSettings: Error saving ${section} settings to Firestore:`, error);
      toast({ title: "Save Failed", description: `Could not save ${section} settings to Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
    } finally {
      console.log("handleSaveSettings: Save process finished.");
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

    console.log(`handleRemoveImage: Attempting to remove ${type} image. Current URL: ${currentUrl}, Storage Path: ${path}`);

    try {
      // Delete from Firebase Storage if a URL exists and it's a Firebase Storage URL
      if (currentUrl && currentUrl.includes("firebasestorage.googleapis.com")) {
        // Construct the ref from the full URL. This is more robust if path changes or if URL contains tokens.
        // However, for simple fixed paths, using storageRef(storage, path) is fine if currentUrl correctly points to that path.
        // Let's assume 'path' is the canonical reference.
        const imageRef = storageRef(storage, path);
        console.log(`handleRemoveImage: Deleting from Storage ref: ${imageRef}`);
        await deleteObject(imageRef).catch(err => {
          if (err.code === 'storage/object-not-found') {
            console.warn(`handleRemoveImage: Object not found at ${path} in Storage. Proceeding to clear Firestore URL.`);
          } else {
            throw err; // Re-throw other storage errors
          }
        });
         console.log(`handleRemoveImage: Successfully deleted or confirmed not found in Storage: ${path}`);
      } else {
        console.log(`handleRemoveImage: No valid Firebase Storage URL for ${type}, or no URL at all. Skipping Storage deletion.`);
      }
      
      // Update Firestore to remove the URL
      const updatedSettings = { ...appSettings, [urlField]: "" }; // Create a full settings object with the field cleared
      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      console.log(`handleRemoveImage: Updating Firestore to set ${urlField} to empty string.`);
      await setDoc(settingsDocRef, { [urlField]: "" }, { merge: true }); // Merge to only update this field
      
      // Update local state (though Firestore listener should also do this)
      setAppSettings(updatedSettings); 
      if (type === 'logo') {
        setLogoFile(null);
        setLogoPreviewUrl(null); // Clear preview
      } else {
        setHeroImageFile(null);
        setHeroImagePreviewUrl(null); // Clear preview
      }
      toast({ title: "Image Removed", description: `${type === 'logo' ? 'School logo' : 'Hero image'} has been removed.` });
      console.log(`handleRemoveImage: Successfully removed ${type} image URL from Firestore and cleared local state.`);
    } catch (error: any) {
      console.error(`handleRemoveImage: Error removing ${type} image:`, error);
      toast({ title: "Removal Failed", description: `Could not remove ${type} image. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings && !loadingError) {
     return (
       <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading system settings from Firestore...</p>
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

      {!isLoadingSettings && !loadingError && (
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
            
            <div className="space-y-2">
              <Label htmlFor="schoolLogoFile" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>School Logo</Label>
              {(logoPreviewUrl || appSettings.schoolLogoUrl) && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={logoPreviewUrl || appSettings.schoolLogoUrl || "https://placehold.co/150x80.png"} alt="School Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  {(appSettings.schoolLogoUrl || logoPreviewUrl) && // Show remove button only if there's an image (preview or saved)
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  }
                </div>
              )}
              <Input id="schoolLogoFile" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={(e) => handleFileChange(e, 'logo')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground mt-1">Recommended: PNG, JPG, GIF, WebP. Max {MAX_FILE_SIZE_BYTES / (1024*1024)}MB. Approx. 150x80px. Uploading will replace existing logo.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolHeroImageFile" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Homepage Hero Image</Label>
               {(heroImagePreviewUrl || appSettings.schoolHeroImageUrl) && (
                <div className="my-2 p-2 border rounded-md inline-block relative">
                  <NextImage src={heroImagePreviewUrl || appSettings.schoolHeroImageUrl || "https://placehold.co/300x169.png"} alt="Hero Image Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                   {(appSettings.schoolHeroImageUrl || heroImagePreviewUrl) &&
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving}>
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                   }
                </div>
              )}
              <Input id="schoolHeroImageFile" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={(e) => handleFileChange(e, 'hero')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground mt-1">Recommended: JPG, PNG, GIF, WebP. Max {MAX_FILE_SIZE_BYTES / (1024*1024)}MB. Landscape (e.g., 1200x675px). Uploading replaces existing image.</p>
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
