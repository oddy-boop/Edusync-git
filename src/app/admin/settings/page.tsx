
"use client";

import { useEffect, useRef, useState } from 'react';
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
import { Loader2, Settings, KeyRound, BookCopy, Save, AlertTriangle, UploadCloud } from 'lucide-react';
import { updateAppSettingsAction, endOfYearProcessAction } from '@/lib/actions/settings.actions';
import type { AppSettingsSchemaType } from '@/lib/actions/settings.actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { createClient } from '@/lib/supabase/server';


const appSettingsSchema = z.object({
  current_academic_year: z.string().regex(/^\d{4}-\d{4}$/, "Academic Year must be in YYYY-YYYY format."),
  school_name: z.string().min(3, "School name is required."),
  paystack_public_key: z.string().optional().nullable(),
  paystack_secret_key: z.string().optional().nullable(),
  resend_api_key: z.string().optional().nullable(),
  google_api_key: z.string().optional().nullable(),
  school_logo_url: z.string().optional().nullable(),
});

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
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
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof appSettingsSchema>>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      school_name: '',
      paystack_public_key: '',
      paystack_secret_key: '',
      resend_api_key: '',
      google_api_key: '',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            form.reset(data);
            setInitialState(data);
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
          const [start, end] = academicYear.split('-').map(Number);
          const nextYear = `${start + 1}-${end + 1}`;
          form.setValue('current_academic_year', nextYear);
          // Trigger form submission programmatically
          if (formRef.current) {
             const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
             formRef.current.dispatchEvent(submitEvent);
          }
      } else {
          toast({ title: "End of Year Process Failed", description: result.message, variant: "destructive" });
      }
      setIsProcessingYearEnd(false);
  };
  
  const handleFormSubmit = async (data: z.infer<typeof appSettingsSchema>) => {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);

      const result = await updateAppSettingsAction(formData);
      
      if (result.success) {
          toast({ title: "Success", description: "Settings saved successfully. Page will reload to apply changes." });
          setTimeout(() => window.location.reload(), 1500);
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
      <form ref={formRef} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card className="shadow-lg">
           <CardHeader><CardTitle className="flex items-center"><Settings className="mr-2"/>General Settings</CardTitle><CardDescription>Manage general school information and branding.</CardDescription></CardHeader>
           <CardContent className="space-y-4">
              <FormField control={form.control} name="school_name" render={({ field }) => (
                <FormItem><FormLabel>School Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="school_logo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><UploadCloud className="mr-2 h-4 w-4"/>School Logo</FormLabel>
                    <FormControl><Input type="file" name="school_logo_file" accept="image/*" /></FormControl>
                    <FormMessage />
                    {field.value && <img src={field.value} alt="logo preview" className="h-16 w-auto mt-2" />}
                  </FormItem>
                )} />
           </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><KeyRound className="mr-2"/>API Keys & Integrations</CardTitle><CardDescription>Manage keys for third-party services. These are stored securely.</CardDescription></CardHeader>
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

        <Card className="shadow-lg">
           <CardHeader><CardTitle className="flex items-center"><BookCopy className="mr-2"/>Academic Settings</CardTitle><CardDescription>Manage academic year and end-of-year processes.</CardDescription></CardHeader>
           <CardContent className="space-y-6">
              <FormField control={form.control} name="current_academic_year" render={({ field }) => (
                  <FormItem><FormLabel>Current Academic Year</FormLabel><FormControl><Input {...field} placeholder="e.g., 2023-2024" /></FormControl><FormMessage /></FormItem>
              )}/>
              <Card className="border-destructive bg-destructive/10">
                  <CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>End of Year Process</CardTitle></CardHeader>
                  <CardContent>
                      <div className="text-destructive/90 text-sm space-y-2">
                          <p>This action is irreversible. It will:</p>
                          <ul className="list-disc list-inside pl-4">
                              <li>Calculate outstanding fees for all students for the current academic year and log them as arrears for the next year.</li>
                              <li>Promote all students to their next grade level (e.g., Basic 1 to Basic 2).</li>
                          </ul>
                      </div>
                  </CardContent>
                  <CardFooter>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" type="button" disabled={isProcessingYearEnd}>
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

        <div className="flex justify-end">
            <SubmitButton>Save All Settings</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
