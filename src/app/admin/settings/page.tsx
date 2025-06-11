
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

// Default settings if not found in Firestore
const defaultAppSettings = {
  currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  schoolName: "St. Joseph's Montessori",
  schoolAddress: "123 Education Road, Accra, Ghana",
  schoolPhone: "+233 12 345 6789",
  schoolEmail: "info@stjosephmontessori.edu.gh",
  schoolLogoUrl: "https://placehold.co/150x80.png", // Default placeholder logo
  schoolHeroImageUrl: "https://placehold.co/1200x675.png", // Default placeholder hero
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  emailFooterSignature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  paymentGatewayApiKey: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  smsProviderApiKey: "sms_apikey_xxxxxxxxxxxxxxxx",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const [appSettings, setAppSettings] = useState(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    console.log("AdminSettingsPage: useEffect - Setting up Firestore listener for settings.");
    setIsLoadingSettings(true);
    setLoadingError(null);

    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("AdminSettingsPage: Firestore document snapshot exists. Data:", docSnap.data());
        const firestoreSettings = docSnap.data();
        setAppSettings(prev => ({
          ...defaultAppSettings, // Ensure all keys from default exist
          ...prev, // Keep current state for fields not in Firestore yet
          ...firestoreSettings // Overwrite with Firestore data
        }));
      } else {
        console.warn(`AdminSettingsPage: No '${APP_SETTINGS_DOC_ID}' document found in '${APP_SETTINGS_COLLECTION}' collection. Using default settings.`);
        setAppSettings(defaultAppSettings);
      }
      setIsLoadingSettings(false);
    }, (error: any) => {
      console.error("AdminSettingsPage: Error fetching settings from Firestore:", error);
      setLoadingError(`Could not load settings from Firestore. Error: ${error.message} (Code: ${error.code})`);
      toast({ title: "Error", description: `Could not load settings from Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
      setAppSettings(defaultAppSettings); // Fallback to defaults on error
      setIsLoadingSettings(false);
    });

    return () => {
      console.log("AdminSettingsPage: useEffect - Cleaning up Firestore listener.");
      unsubscribe();
    };
  }, [toast]);


  const handleInputChange = (field: keyof typeof appSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (section: string) => {
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    console.log(`AdminSettingsPage: Attempting to save ${section} settings. Current user:`, auth.currentUser?.uid);
    
    // Prepare only the relevant settings to save, to avoid overwriting unrelated fields if sections are saved separately.
    // For this example, we are saving all fields to appSettings/general
    const settingsToSave = {
        currentAcademicYear: appSettings.currentAcademicYear,
        schoolName: appSettings.schoolName,
        schoolAddress: appSettings.schoolAddress,
        schoolPhone: appSettings.schoolPhone,
        schoolEmail: appSettings.schoolEmail,
        schoolLogoUrl: appSettings.schoolLogoUrl,
        schoolHeroImageUrl: appSettings.schoolHeroImageUrl,
        // Add other settings fields as they are implemented for saving
        enableEmailNotifications: appSettings.enableEmailNotifications,
        emailFooterSignature: appSettings.emailFooterSignature,
        // API Keys should ideally be managed via environment variables or a secure backend config, not directly in Firestore by client.
        // For mock purposes, we can include them, but warn about security.
    };

    try {
      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      await setDoc(settingsDocRef, settingsToSave, { merge: true }); // Use merge:true to avoid overwriting other fields if any
      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings saved to Firestore.`,
      });
      console.log(`AdminSettingsPage: ${section} settings saved successfully to Firestore.`);
    } catch (error: any) {
      console.error(`AdminSettingsPage: Error saving ${section} settings to Firestore:`, error);
      toast({ title: "Save Failed", description: `Could not save ${section} settings to Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
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
            <p className="text-sm text-muted-foreground mt-2">Please check your Firestore security rules for the '{APP_SETTINGS_COLLECTION}/{APP_SETTINGS_DOC_ID}' path and ensure read/write access is allowed for admins. Also, verify your internet connection.</p>
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
        {/* Academic Year Management */}
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
            <Button onClick={() => handleSaveSettings("Academic")} disabled={!auth.currentUser}>
              <Save className="mr-2 h-4 w-4" /> Save Academic Settings
            </Button>
          </CardFooter>
        </Card>

        {/* School Information & Branding */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90">
              <School className="mr-3 h-6 w-6" /> School Information & Branding
            </CardTitle>
            <CardDescription>Update school name, address, contact details, logo URL, and homepage hero image URL. These settings will be saved to Firestore and reflected across the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div>
              <Label htmlFor="schoolLogoUrl" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>School Logo URL</Label>
              <Input id="schoolLogoUrl" type="text" value={appSettings.schoolLogoUrl} onChange={(e) => handleInputChange('schoolLogoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
              <p className="text-xs text-muted-foreground mt-1">Enter the full URL for the school logo. Used on receipts. (e.g., 150x80px)</p>
            </div>
            <div>
              <Label htmlFor="schoolHeroImageUrl" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Homepage Hero Image URL</Label>
              <Input id="schoolHeroImageUrl" type="text" value={appSettings.schoolHeroImageUrl} onChange={(e) => handleInputChange('schoolHeroImageUrl', e.target.value)} placeholder="https://example.com/hero-image.jpg" />
              <p className="text-xs text-muted-foreground mt-1">Enter the full URL for the main image on the homepage. (e.g., 1200x675px)</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("School Information")} disabled={!auth.currentUser}>
              <Save className="mr-2 h-4 w-4" /> Save School Information
            </Button>
          </CardFooter>
        </Card>

        {/* Notification Settings */}
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
            <Button onClick={() => handleSaveSettings("Notification")} disabled={!auth.currentUser}>
              <Save className="mr-2 h-4 w-4" /> Save Notification Settings
            </Button>
          </CardFooter>
        </Card>

        {/* Integrations & API */}
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
            <Button onClick={() => handleSaveSettings("Integration")} disabled={!auth.currentUser}>
              <Save className="mr-2 h-4 w-4" /> Save Integration Settings (Mock for API Keys)
            </Button>
          </CardFooter>
        </Card>
      </>
      )}
    </div>
  );
}
    

    