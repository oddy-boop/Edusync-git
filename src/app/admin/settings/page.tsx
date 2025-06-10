
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data structures for initial state
const initialAcademicSettings = {
  currentYear: "2024-2025",
  term1Start: "2024-09-02", // Assuming typical start
  term1End: "2024-12-20",
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

  const [academicSettings, setAcademicSettings] = useState(initialAcademicSettings);
  const [schoolInfo, setSchoolInfo] = useState(initialSchoolInfo);
  const [notificationSettings, setNotificationSettings] = useState(initialNotificationSettings);
  const [integrationSettings, setIntegrationSettings] = useState(initialIntegrationSettings);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: string | boolean) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = (sectionName: string, data: any) => {
    console.log(`Saving ${sectionName}:`, data);
    // In a real app, you'd save this to localStorage or make an API call.
    // localStorage.setItem(`${sectionName.toLowerCase().replace(/\s+/g, '_')}_settings_sjm`, JSON.stringify(data));
    toast({
      title: `${sectionName} Saved (Mock)`,
      description: `Your ${sectionName.toLowerCase()} settings have been noted. In a real app, these would be persisted.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Settings className="mr-3 h-8 w-8" /> System Settings
        </h2>
      </div>

      {/* Academic Year Management */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <CalendarCog className="mr-3 h-6 w-6" /> Academic Year Management
          </CardTitle>
          <CardDescription>Configure academic terms, semesters, and school holidays.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentYear">Current Academic Year</Label>
            <Input id="currentYear" value={academicSettings.currentYear} onChange={(e) => handleInputChange(setAcademicSettings, 'currentYear', e.target.value)} placeholder="e.g., 2024-2025" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="term1Start">Term 1 Start Date</Label>
              <Input type="date" id="term1Start" value={academicSettings.term1Start} onChange={(e) => handleInputChange(setAcademicSettings, 'term1Start', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="term1End">Term 1 End Date</Label>
              <Input type="date" id="term1End" value={academicSettings.term1End} onChange={(e) => handleInputChange(setAcademicSettings, 'term1End', e.target.value)} />
            </div>
          </div>
          {/* Add more terms or holiday settings as needed */}
        </CardContent>
        <CardFooter>
          <Button onClick={() => handleSave("Academic Year Settings", academicSettings)}>
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
          <CardDescription>Update school name, address, contact details, and logo.</CardDescription>
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
          <Button onClick={() => handleSave("School Information", schoolInfo)}>
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
          <CardDescription>Manage email and SMS notification preferences and templates.</CardDescription>
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
          <Button onClick={() => handleSave("Notification Settings", notificationSettings)}>
            <Save className="mr-2 h-4 w-4" /> Save Notification Settings
          </Button>
        </CardFooter>
      </Card>

      {/* Integrations & API */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-primary/90">
            <Puzzle className="mr-3 h-6 w-6" /> Integrations & API
          </CardTitle>
          <CardDescription>Configure third-party services (e.g., payment gateways) and manage API access.</CardDescription>
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
          <Button onClick={() => handleSave("Integration Settings", integrationSettings)}>
            <Save className="mr-2 h-4 w-4" /> Save Integration Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
