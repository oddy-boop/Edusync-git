
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase"; // Added auth
import { doc, getDoc, setDoc } from "firebase/firestore";

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

// Default academic settings if not found in Firestore
const defaultAcademicSettings = {
  currentYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  term1Start: `${new Date().getFullYear()}-09-02`,
  term1End: `${new Date().getFullYear()}-12-20`,
};

const initialSchoolInfo = {
  name: "St. Joseph's Montessori",
  address: "123 Education Road, Accra, Ghana",
  phone: "+233 12 345 6789",
  email: "info@stjosephmontessori.edu.gh",
};

const initialNotificationSettings = {
  enableEmail: true,
  enableSms: false,
  emailFooter: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
};

const initialIntegrationSettings = {
  paymentGatewayKey: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  smsProviderKey: "sms_apikey_xxxxxxxxxxxxxxxx",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const [academicSettings, setAcademicSettings] = useState(defaultAcademicSettings);
  const [schoolInfo, setSchoolInfo] = useState(initialSchoolInfo);
  const [notificationSettings, setNotificationSettings] = useState(initialNotificationSettings);
  const [integrationSettings, setIntegrationSettings] = useState(initialIntegrationSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      console.log("AdminSettingsPage: useEffect - Starting to fetch settings.");
      setIsLoadingSettings(true);
      setLoadingError(null);
      try {
        const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
        console.log(`AdminSettingsPage: Attempting to get document from path: ${APP_SETTINGS_COLLECTION}/${APP_SETTINGS_DOC_ID}`);
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
          console.log("AdminSettingsPage: Firestore document snapshot exists. Data:", docSnap.data());
          const firestoreSettings = docSnap.data();
          if (firestoreSettings.currentAcademicYear) {
            setAcademicSettings(prev => ({ ...prev, currentYear: firestoreSettings.currentAcademicYear }));
            console.log("AdminSettingsPage: Set academic year from Firestore:", firestoreSettings.currentAcademicYear);
          } else {
            console.log("AdminSettingsPage: 'currentAcademicYear' not found in Firestore document. Using default.");
             setAcademicSettings(defaultAcademicSettings); // Ensure defaults are set if not in FS
          }
          // You can load other parts of academicSettings here if they are also in Firestore
        } else {
          console.warn(`AdminSettingsPage: No '${APP_SETTINGS_DOC_ID}' document found in '${APP_SETTINGS_COLLECTION}' collection. Using default academic settings.`);
          setAcademicSettings(defaultAcademicSettings); // Using defaults if doc doesn't exist
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error fetching settings from Firestore:", error);
        console.error("AdminSettingsPage: Firestore error code:", error.code);
        console.error("AdminSettingsPage: Firestore error message:", error.message);
        setLoadingError(`Could not load settings from Firestore. Error: ${error.message} (Code: ${error.code})`);
        toast({ title: "Error", description: `Could not load settings from Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
         setAcademicSettings(defaultAcademicSettings); // Fallback to defaults on error
      } finally {
        setIsLoadingSettings(false);
        console.log("AdminSettingsPage: Finished fetching settings.");
      }
    };

    fetchSettings();
    // TODO: Load other settings (schoolInfo, notificationSettings, integrationSettings) if they were persisted
  }, [toast]);


  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: string | boolean) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveAcademicSettings = async () => {
    if (!auth.currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    console.log("AdminSettingsPage: Attempting to save academic settings. Current user:", auth.currentUser?.uid);
    try {
      const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
      await setDoc(settingsDocRef, { currentAcademicYear: academicSettings.currentYear }, { merge: true });
      toast({
        title: "Academic Year Settings Saved",
        description: `Current academic year '${academicSettings.currentYear}' saved to Firestore. Footers will update.`,
      });
      console.log("AdminSettingsPage: Academic settings saved successfully to Firestore.");
    } catch (error: any) {
      console.error("AdminSettingsPage: Error saving academic settings to Firestore:", error);
      console.error("AdminSettingsPage: Firestore error code (save):", error.code);
      console.error("AdminSettingsPage: Firestore error message (save):", error.message);
      toast({ title: "Save Failed", description: `Could not save academic settings to Firestore. Details: ${error.message}`, variant: "destructive", duration: 7000 });
    }
  };

  const handleSaveSchoolInfo = () => {
    // TODO: Persist schoolInfo to Firestore if needed
    toast({
      title: "School Information Saved (Mock)",
      description: "School information settings noted. In a real app, these would be persisted to Firestore.",
    });
  };
  
  const handleSaveNotificationSettings = () => {
    // TODO: Persist notificationSettings to Firestore if needed
    toast({
      title: "Notification Settings Saved (Mock)",
      description: "Notification settings noted. In a real app, these would be persisted to Firestore.",
    });
  };

  const handleSaveIntegrationSettings = () => {
    // TODO: Persist integrationSettings to Firestore if needed
    toast({
      title: "Integration Settings Saved (Mock)",
      description: "Integration settings noted. In a real app, these would be persisted to Firestore.",
    });
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

      {/* Academic Year Management */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <CalendarCog className="mr-3 h-6 w-6" /> Academic Year Management
          </CardTitle>
          <CardDescription>Configure academic terms and the current academic year. The 'Current Academic Year' (e.g., "2024-2025") will influence the copyright year displayed in footers (uses the end year).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSettings ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span>Loading academic year settings from Firestore...</span>
            </div>
          ) : (
            <div>
              <Label htmlFor="currentYear">Current Academic Year</Label>
              <Input id="currentYear" value={academicSettings.currentYear} onChange={(e) => handleInputChange(setAcademicSettings, 'currentYear', e.target.value)} placeholder="e.g., 2024-2025" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="term1Start">Term 1 Start Date (Mock)</Label>
              <Input type="date" id="term1Start" value={academicSettings.term1Start} onChange={(e) => handleInputChange(setAcademicSettings, 'term1Start', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="term1End">Term 1 End Date (Mock)</Label>
              <Input type="date" id="term1End" value={academicSettings.term1End} onChange={(e) => handleInputChange(setAcademicSettings, 'term1End', e.target.value)} />
            </div>
          </div>
           {isLoadingSettings && !loadingError && (
             <p className="text-sm text-muted-foreground">Attempting to load current academic year from database...</p>
           )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveAcademicSettings} disabled={isLoadingSettings || !auth.currentUser}>
            <Save className="mr-2 h-4 w-4" /> Save Academic Settings
          </Button>
        </CardFooter>
      </Card>

      {/* School Information & Branding */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <School className="mr-3 h-6 w-6" /> School Information & Branding (Mock)
          </CardTitle>
          <CardDescription>Update school name, address, contact details, and logo. (These settings are not yet saved to Firestore).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="schoolName">School Name</Label>
            <Input id="schoolName" value={schoolInfo.name} onChange={(e) => handleInputChange(setSchoolInfo, 'name', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="schoolAddress">School Address</Label>
            <Textarea id="schoolAddress" value={schoolInfo.address} onChange={(e) => handleInputChange(setSchoolInfo, 'address', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schoolPhone">Contact Phone</Label>
              <Input id="schoolPhone" type="tel" value={schoolInfo.phone} onChange={(e) => handleInputChange(setSchoolInfo, 'phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="schoolEmail">Contact Email</Label>
              <Input type="email" id="schoolEmail" value={schoolInfo.email} onChange={(e) => handleInputChange(setSchoolInfo, 'email', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="schoolLogo">School Logo</Label>
            <Input id="schoolLogo" type="file" className="file:text-primary file:font-medium file:mr-2 file:rounded-md file:border file:border-input file:px-3 file:py-1.5 hover:file:bg-primary/10" />
            <p className="text-xs text-muted-foreground mt-1">Upload a new logo (e.g., PNG, JPG). Max 2MB. (Mock upload)</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSchoolInfo}>
            <Save className="mr-2 h-4 w-4" /> Save School Information
          </Button>
        </CardFooter>
      </Card>

      {/* Notification Settings */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Bell className="mr-3 h-6 w-6" /> Notification Settings (Mock)
          </CardTitle>
          <CardDescription>Manage email and SMS notification preferences and templates. (These settings are not yet saved to Firestore).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox id="enableEmail" checked={notificationSettings.enableEmail} onCheckedChange={(checked) => handleInputChange(setNotificationSettings, 'enableEmail', !!checked)} />
            <Label htmlFor="enableEmail" className="font-normal cursor-pointer">Enable Email Notifications</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox id="enableSms" checked={notificationSettings.enableSms} onCheckedChange={(checked) => handleInputChange(setNotificationSettings, 'enableSms', !!checked)} />
            <Label htmlFor="enableSms" className="font-normal cursor-pointer">Enable SMS Notifications (requires SMS provider integration)</Label>
          </div>
          <div>
            <Label htmlFor="emailFooter">Default Email Footer Signature</Label>
            <Textarea id="emailFooter" value={notificationSettings.emailFooter} onChange={(e) => handleInputChange(setNotificationSettings, 'emailFooter', e.target.value)} placeholder="e.g., Regards, School Administration" rows={3} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveNotificationSettings}>
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
          <CardDescription>Configure third-party services and manage API access. (These settings are not yet saved to Firestore).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paymentGatewayKey">Payment Gateway API Key (Test Mode)</Label>
            <Input type="password" id="paymentGatewayKey" value={integrationSettings.paymentGatewayKey} onChange={(e) => handleInputChange(setIntegrationSettings, 'paymentGatewayKey', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="smsProviderKey">SMS Provider API Key (Test Mode)</Label>
            <Input type="password" id="smsProviderKey" value={integrationSettings.smsProviderKey} onChange={(e) => handleInputChange(setIntegrationSettings, 'smsProviderKey', e.target.value)} />
          </div>
           <div>
            <Label htmlFor="systemApiKey">System API Key for External Access</Label>
            <div className="flex items-center gap-2">
                <Input id="systemApiKey" value="•••••••••••••••••••••••••••••••• (Hidden for security)" readOnly className="bg-muted/50 cursor-not-allowed" />
                <Button variant="outline" onClick={() => toast({title: "API Key Regenerated (Mock)", description:"A new API key would typically be generated and displayed here, then saved securely."})}>
                    Regenerate Key
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use this key for secure access from external applications (mock functionality).</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveIntegrationSettings}>
            <Save className="mr-2 h-4 w-4" /> Save Integration Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
    
