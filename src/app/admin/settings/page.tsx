
"use client";

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getSupabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Settings, Building, Palette, KeyRound, Globe, BookCopy, Save, AlertTriangle, UploadCloud } from 'lucide-react';
import { updateAppSettingsAction, endOfYearProcessAction, type AppSettingsSchemaType } from '@/lib/actions/settings.actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { hslStringToHex, hexToHslString } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Combine all settings into one schema for the form
const appSettingsSchema = z.object({
  id: z.number().optional(),
  current_academic_year: z.string().regex(/^\d{4}-\d{4}$/, "Academic Year must be in YYYY-YYYY format."),
  school_name: z.string().min(3, "School name is required."),
  school_address: z.string().optional(),
  school_phone: z.string().optional(),
  school_email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
  resend_api_key: z.string().optional(),
  google_api_key: z.string().optional(),
  homepage_title: z.string().optional(),
  homepage_subtitle: z.string().optional(),
  color_primary_hex: z.string().optional(),
  color_accent_hex: z.string().optional(),
  color_background_hex: z.string().optional(),
});

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {pending ? "Saving..." : children}
    </Button>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [initialState, setInitialState] = useState<AppSettingsSchemaType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingYearEnd, setIsProcessingYearEnd] = useState(false);

  const form = useForm<z.infer<typeof appSettingsSchema>>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      school_name: '',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            const transformedData = {
                ...data,
                color_primary_hex: data.color_primary ? hslStringToHex(data.color_primary) : '#263340',
                color_accent_hex: data.color_accent ? hslStringToHex(data.color_accent) : '#A3BE8C',
                color_background_hex: data.color_background ? hslStringToHex(data.color_background) : '#FFFFFF',
            };
            form.reset(transformedData);
            setInitialState(transformedData);
        }
      } catch (err: any) {
        setError(`Failed to load settings: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [form]);
  
  const handleEndOfYearProcess = async () => {
      const academicYear = form.getValues('current_academic_year');
      if (!academicYear) {
          toast({ title: "Error", description: "Current academic year is not set.", variant: "destructive" });
          return;
      }
      setIsProcessingYearEnd(true);
      const result = await endOfYearProcessAction(academicYear);
      if (result.success) {
          toast({ title: "Success", description: result.message });
          // Optionally, auto-increment the year in the form
          const [start, end] = academicYear.split('-').map(Number);
          const nextYear = `${start + 1}-${end + 1}`;
          form.setValue('current_academic_year', nextYear);
          // Manually trigger a save for the new academic year
          await form.handleSubmit(onSubmit)();
      } else {
          toast({ title: "End of Year Process Failed", description: result.message, variant: "destructive" });
      }
      setIsProcessingYearEnd(false);
  };


  const onSubmit = async (data: z.infer<typeof appSettingsSchema>) => {
    // Convert hex back to HSL strings for DB
    const payload = {
      ...data,
      color_primary: data.color_primary_hex ? hexToHslString(data.color_primary_hex) : undefined,
      color_accent: data.color_accent_hex ? hexToHslString(data.color_accent_hex) : undefined,
      color_background: data.color_background_hex ? hexToHslString(data.color_background_hex) : undefined,
    };
    
    // Remove hex values from payload to avoid DB column errors
    delete (payload as any).color_primary_hex;
    delete (payload as any).color_accent_hex;
    delete (payload as any).color_background_hex;

    const result = await updateAppSettingsAction(payload);
    if (result.success) {
      toast({ title: "Success", description: "Settings saved successfully." });
      // Reload the page to apply color changes
      window.location.reload();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="general"><Building className="mr-2 h-4 w-4"/>General</TabsTrigger>
            <TabsTrigger value="homepage"><Globe className="mr-2 h-4 w-4"/>Homepage</TabsTrigger>
            <TabsTrigger value="keys"><KeyRound className="mr-2 h-4 w-4"/>API Keys</TabsTrigger>
            <TabsTrigger value="theme"><Palette className="mr-2 h-4 w-4"/>Theme</TabsTrigger>
            <TabsTrigger value="academic"><BookCopy className="mr-2 h-4 w-4"/>Academic</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>General School Settings</CardTitle><CardDescription>Basic information about your school.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="school_name" render={({ field }) => (
                    <FormItem><FormLabel>School Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="school_address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="school_phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="school_email" render={({ field }) => (
                        <FormItem><FormLabel>Public Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homepage">
            <Card>
              <CardHeader><CardTitle>Homepage Content</CardTitle><CardDescription>Customize the text on your public homepage.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="homepage_title" render={({ field }) => (
                    <FormItem><FormLabel>Main Title</FormLabel><FormControl><Input {...field} placeholder="Welcome to Our School" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="homepage_subtitle" render={({ field }) => (
                    <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} placeholder="A place for learning, growth, and discovery." /></FormControl><FormMessage /></FormItem>
                )}/>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="keys">
            <Card>
              <CardHeader><CardTitle>API Keys & Integrations</CardTitle><CardDescription>Manage keys for third-party services. These are stored securely.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="paystack_public_key" render={({ field }) => (
                    <FormItem><FormLabel>Paystack Public Key</FormLabel><FormControl><Input {...field} placeholder="pk_test_..." /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="paystack_secret_key" render={({ field }) => (
                    <FormItem><FormLabel>Paystack Secret Key</FormLabel><FormControl><Input type="password" {...field} placeholder="sk_test_..." /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="resend_api_key" render={({ field }) => (
                    <FormItem><FormLabel>Resend API Key</FormLabel><FormControl><Input type="password" {...field} placeholder="re_..." /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="google_api_key" render={({ field }) => (
                    <FormItem><FormLabel>Google AI API Key</FormLabel><FormControl><Input type="password" {...field} placeholder="AIzaSy..." /></FormControl><FormMessage /></FormItem>
                )}/>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
                <CardHeader><CardTitle>Theme & Color Customization</CardTitle><CardDescription>Change the application's color scheme. Changes will apply after saving and reloading the page.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="color_primary_hex" render={({ field }) => (
                        <FormItem><FormLabel>Primary Color</FormLabel><FormControl><Input type="color" {...field} className="h-12"/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="color_accent_hex" render={({ field }) => (
                        <FormItem><FormLabel>Accent Color</FormLabel><FormControl><Input type="color" {...field} className="h-12"/></FormControl><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="color_background_hex" render={({ field }) => (
                        <FormItem><FormLabel>Background Color</FormLabel><FormControl><Input type="color" {...field} className="h-12"/></FormControl><FormMessage/></FormItem>
                    )}/>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card>
              <CardHeader><CardTitle>Academic Year Management</CardTitle><CardDescription>Set the current academic year for the entire application.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="current_academic_year" render={({ field }) => (
                    <FormItem><FormLabel>Current Academic Year</FormLabel><FormControl><Input {...field} placeholder="e.g., 2023-2024" /></FormControl><FormMessage /></FormItem>
                )}/>
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>End of Year Process</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-destructive/90 text-sm">
                            This action is irreversible. It will:
                            <ul className="list-disc list-inside pl-4 mt-2">
                                <li>Calculate outstanding fees for all students for the current academic year and log them as arrears for the next year.</li>
                                <li>Promote all students to their next grade level (e.g., Basic 1 to Basic 2).</li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" disabled={isProcessingYearEnd}>
                                 {isProcessingYearEnd && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                 Initiate End of Year Process
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are about to run the end-of-year process for <strong>{form.getValues('current_academic_year')}</strong>. This will calculate arrears and promote students. This cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleEndOfYearProcess} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, proceed</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                 </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
            <SubmitButton>Save All Settings</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
