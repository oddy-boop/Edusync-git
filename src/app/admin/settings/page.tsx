
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  CalendarCog,
  Bell,
  Save,
  Loader2,
  AlertCircle,
  KeyRound,
  Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { endOfYearProcessAction, updateAppSettingsAction } from "@/lib/actions/settings.actions";
import { AppSettingsSchemaType } from "@/lib/actions/settings.actions";
import { hslStringToHex, hexToHslString } from "@/lib/utils";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [formState, setFormState] = useState<AppSettingsSchemaType | null>(null);
  const [originalAcademicYear, setOriginalAcademicYear] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingYearEnd, setIsProcessingYearEnd] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const fetchInitialData = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      
      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (!session?.user) {
        if (isMounted.current) {
          setError("You must be an admin to view settings.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error: fetchError } = await supabaseRef.current
          .from("app_settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        
        if (isMounted.current) {
          if (data) {
            setFormState(data);
            setOriginalAcademicYear(data.current_academic_year);
          } else {
            // Pre-populate with default values if no settings row exists
            const defaultState: AppSettingsSchemaType = {
              current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
              school_name: 'Your School Name',
              enable_email_notifications: true,
              email_footer_signature: 'Regards,\nThe School Administration',
              color_primary: "220 25% 20%",
              color_background: "0 0% 100%",
              color_accent: "52 93% 62%",
            };
            setFormState(defaultState);
            setOriginalAcademicYear(defaultState.current_academic_year);
          }
        }
      } catch (e: any) {
        console.error("Error fetching settings:", e);
        if (isMounted.current) {
          setError(`Failed to load settings: ${e.message}`);
        }
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => { isMounted.current = false; };
  }, []);

  const handleInputChange = (field: keyof AppSettingsSchemaType, value: any) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState) return;

    const academicYearChanged = originalAcademicYear !== formState.current_academic_year;

    const processSave = async () => {
      setIsProcessingYearEnd(true);
      
      const formData = new FormData();
      Object.keys(formState).forEach(key => {
        const value = (formState as any)[key];
        if (value !== null && value !== undefined) {
           formData.append(key, typeof value === 'boolean' ? value.toString() : value);
        }
      });
      
      const result = await updateAppSettingsAction(new FormData(), formData);
      if (result.success) {
        toast({ title: "Settings Saved", description: result.message });
        if (academicYearChanged) {
          const eoyResult = await endOfYearProcessAction(originalAcademicYear);
          toast({
            title: eoyResult.success ? "End-of-Year Process Successful" : "End-of-Year Process Failed",
            description: eoyResult.message,
            variant: eoyResult.success ? "default" : "destructive",
            duration: 10000,
          });
        }
        setOriginalAcademicYear(formState.current_academic_year);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsProcessingYearEnd(false);
    };

    if (academicYearChanged) {
      setIsConfirmDialogOpen(true);
    } else {
      await processSave();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="mr-2 h-8 w-8 animate-spin"/> Loading Settings...</div>;
  }
  if (error) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>;
  }
  if (!formState) {
    return <Card><CardHeader><CardTitle>No Settings Found</CardTitle><CardContent><p>Initial application settings have not been loaded.</p></CardContent></Card>;
  }

  return (
    <form onSubmit={handleSaveSettings}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System Settings</h2>
          <Button type="submit" disabled={isProcessingYearEnd}>
            {isProcessingYearEnd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Settings
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Settings</CardTitle>
              <CardDescription>Manage the core academic year and school information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="school_name">School Name</Label>
                <Input id="school_name" value={formState.school_name || ''} onChange={(e) => handleInputChange('school_name', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="current_academic_year">Current Academic Year</Label>
                <Input id="current_academic_year" value={formState.current_academic_year} onChange={(e) => handleInputChange('current_academic_year', e.target.value)} placeholder="e.g., 2023-2024" />
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-semibold text-amber-600">Important:</span> Changing this value and saving will trigger the End-of-Year process (calculating arrears, promoting students).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90"><KeyRound /> API Keys</CardTitle>
              <CardDescription>Manage third-party service API keys.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paystack_public_key">Paystack Public Key</Label>
                <Input id="paystack_public_key" value={formState.paystack_public_key || ''} onChange={(e) => handleInputChange('paystack_public_key', e.target.value)} placeholder="pk_test_..."/>
              </div>
              <div>
                <Label htmlFor="paystack_secret_key">Paystack Secret Key</Label>
                <Input id="paystack_secret_key" type="password" value={formState.paystack_secret_key || ''} onChange={(e) => handleInputChange('paystack_secret_key', e.target.value)} placeholder="sk_test_..."/>
              </div>
              <div>
                <Label htmlFor="resend_api_key">Resend API Key</Label>
                <Input id="resend_api_key" type="password" value={formState.resend_api_key || ''} onChange={(e) => handleInputChange('resend_api_key', e.target.value)} placeholder="re_..."/>
              </div>
              <div>
                <Label htmlFor="google_api_key">Google AI API Key</Label>
                <Input id="google_api_key" type="password" value={formState.google_api_key || ""} onChange={(e) => handleInputChange('google_api_key', e.target.value)} placeholder="AIzaSy..."/>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle>
              <CardDescription>Manage system-wide email notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox id="enable_email_notifications" checked={formState.enable_email_notifications} onCheckedChange={(checked) => handleInputChange('enable_email_notifications', !!checked)} />
                <Label htmlFor="enable_email_notifications">Enable Email Notifications</Label>
              </div>
              <div>
                <Label htmlFor="email_footer_signature">Default Email Footer</Label>
                <Textarea id="email_footer_signature" value={formState.email_footer_signature || ''} onChange={(e) => handleInputChange('email_footer_signature', e.target.value)} rows={3}/>
              </div>
            </CardContent>
          </Card>
           
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90"><Palette /> Theme & Colors</CardTitle>
              <CardDescription>Customize the application's color scheme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="color_primary">Primary Color</Label>
                <Input id="color_primary" type="color" value={hslStringToHex(formState.color_primary || '0 0% 0%')} onChange={(e) => handleInputChange('color_primary', hexToHslString(e.target.value))}/>
                <p className="text-xs text-muted-foreground mt-1">Used for headers, buttons, and major UI elements.</p>
              </div>
              <div>
                <Label htmlFor="color_background">Background Color</Label>
                <Input id="color_background" type="color" value={hslStringToHex(formState.color_background || '0 0% 100%')} onChange={(e) => handleInputChange('color_background', hexToHslString(e.target.value))}/>
                <p className="text-xs text-muted-foreground mt-1">Main background color for pages.</p>
              </div>
              <div>
                <Label htmlFor="color_accent">Accent Color</Label>
                <Input id="color_accent" type="color" value={hslStringToHex(formState.color_accent || '45 93% 62%')} onChange={(e) => handleInputChange('color_accent', hexToHslString(e.target.value))}/>
                <p className="text-xs text-muted-foreground mt-1">Used for highlights and calls-to-action.</p>
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Academic Year Change</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                    <p>
                        You are about to change the academic year from{' '}
                        <strong>{originalAcademicYear}</strong> to{' '}
                        <strong>{formState.current_academic_year}</strong>. This action
                        is significant and will trigger the following automated processes:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground pl-4 space-y-1">
                        <li>All student balances for {originalAcademicYear} will be calculated, and any outstanding amounts will be logged as arrears for the new year.</li>
                        <li>All students will be promoted to their next grade level (e.g., Basic 1 becomes Basic 2).</li>
                    </ul>
                    <p>This action cannot be easily undone. Are you sure you want to proceed?</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={() => {
                    setIsConfirmDialogOpen(false);
                    handleSaveSettings({ preventDefault: () => {} } as React.FormEvent);
                }}
                className="bg-destructive hover:bg-destructive/90"
                >
                Yes, Proceed
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
