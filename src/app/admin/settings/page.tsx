
"use client";

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Loader2, Settings, Building, Palette, KeyRound, Globe, BookCopy, Save, AlertTriangle, UploadCloud, Trash2, PlusCircle } from 'lucide-react';
import { updateAppSettingsAction, endOfYearProcessAction, type AppSettingsSchemaType, appSettingsSchema } from '@/lib/actions/settings.actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { hslStringToHex, hexToHslString } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Re-defining here to avoid server/client boundary issues with zod object exports
const whyUsPointSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  icon: z.string().min(1, "Icon name is required."),
});

const teamMemberSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, "Name is required."),
  role: z.string().min(1, "Role is required."),
  imageUrl: z.string().optional(),
});

const admissionStepSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()),
    title: z.string().min(1, "Title is required."),
    description: z.string().min(1, "Description is required."),
    icon: z.string().min(1, "Icon name is required."),
});

const extendedAppSettingsSchema = appSettingsSchema.extend({
  homepage_why_us_points: z.array(whyUsPointSchema).optional(),
  team_members: z.array(teamMemberSchema).optional(),
  admissions_steps: z.array(admissionStepSchema).optional(),
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
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof extendedAppSettingsSchema>>({
    resolver: zodResolver(extendedAppSettingsSchema),
    defaultValues: {
      current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      school_name: '',
      homepage_why_us_points: [],
      team_members: [],
      admissions_steps: [],
    },
  });

  const { fields: whyUsFields, append: appendWhyUs, remove: removeWhyUs } = useFieldArray({ control: form.control, name: "homepage_why_us_points" });
  const { fields: teamMemberFields, append: appendTeamMember, remove: removeTeamMember } = useFieldArray({ control: form.control, name: "team_members" });
  const { fields: admissionStepFields, append: appendAdmissionStep, remove: removeAdmissionStep } = useFieldArray({ control: form.control, name: "admissions_steps" });

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
                homepage_why_us_points: data.homepage_why_us_points ? JSON.parse(data.homepage_why_us_points) : [],
                team_members: data.team_members ? JSON.parse(data.team_members) : [],
                admissions_steps: data.admissions_steps ? JSON.parse(data.admissions_steps) : [],
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
          const [start, end] = academicYear.split('-').map(Number);
          const nextYear = `${start + 1}-${end + 1}`;
          form.setValue('current_academic_year', nextYear);
          await formRef.current?.requestSubmit();
      } else {
          toast({ title: "End of Year Process Failed", description: result.message, variant: "destructive" });
      }
      setIsProcessingYearEnd(false);
  };

  const processFormSubmission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await form.handleSubmit(async (data) => {
        const formData = new FormData(event.currentTarget);
        // Append JSON-stringified array fields
        formData.append('homepage_why_us_points', JSON.stringify(data.homepage_why_us_points || []));
        formData.append('team_members', JSON.stringify(data.team_members || []));
        formData.append('admissions_steps', JSON.stringify(data.admissions_steps || []));

        // Append hex colors to be converted to HSL in server action
        if (data.color_primary_hex) formData.append('color_primary_hex', data.color_primary_hex);
        if (data.color_accent_hex) formData.append('color_accent_hex', data.color_accent_hex);
        if (data.color_background_hex) formData.append('color_background_hex', data.color_background_hex);

        const result = await updateAppSettingsAction(formData);
        if (result.success) {
            toast({ title: "Success", description: "Settings saved successfully. Page will reload to apply changes." });
            setTimeout(() => window.location.reload(), 1500);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    })(event);
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
      <form ref={formRef} onSubmit={processFormSubmission}>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="general"><Building className="mr-2 h-4 w-4"/>General</TabsTrigger>
            <TabsTrigger value="website"><Globe className="mr-2 h-4 w-4"/>Website</TabsTrigger>
            <TabsTrigger value="keys"><KeyRound className="mr-2 h-4 w-4"/>API Keys</TabsTrigger>
            <TabsTrigger value="theme"><Palette className="mr-2 h-4 w-4"/>Theme</TabsTrigger>
            <TabsTrigger value="academic"><BookCopy className="mr-2 h-4 w-4"/>Academic</TabsTrigger>
          </TabsList>

          <Card>
            <TabsContent value="general" className="m-0">
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
                 <FormField control={form.control} name="school_logo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Logo</FormLabel>
                    <FormControl><Input type="file" name="school_logo_file" accept="image/*" /></FormControl>
                    <FormMessage />
                    {field.value && <img src={field.value} alt="logo preview" className="h-16 w-auto mt-2" />}
                  </FormItem>
                )} />
              </CardContent>
            </TabsContent>
            
            <TabsContent value="website" className="m-0">
                <CardHeader><CardTitle>Website Content Management</CardTitle><CardDescription>Customize the content on your public-facing pages.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    {/* Homepage Section */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Homepage</h3>
                        <FormField control={form.control} name="homepage_title" render={({ field }) => (<FormItem><FormLabel>Main Title</FormLabel><FormControl><Input {...field} placeholder="Welcome to Our School" /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="homepage_subtitle" render={({ field }) => (<FormItem className="mt-2"><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} placeholder="A place for learning, growth, and discovery." /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {[1,2,3,4,5].map(i => (
                            <FormField key={i} control={form.control} name={`hero_image_url_${i}` as any} render={({ field }) => (<FormItem><FormLabel>Hero Image {i}</FormLabel><FormControl><Input type="file" name={`hero_image_file_${i}`} accept="image/*" /></FormControl>{field.value && <img src={field.value} alt={`hero ${i}`} className="h-10 w-auto mt-1" />}</FormItem>)} />
                          ))}
                        </div>
                    </div>
                    {/* About Page Section */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">About Page</h3>
                        <FormField control={form.control} name="about_mission" render={({ field }) => (<FormItem><FormLabel>Mission Statement</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="about_vision" render={({ field }) => (<FormItem className="mt-2"><FormLabel>Vision Statement</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="about_image_url" render={({ field }) => (<FormItem className="mt-2"><FormLabel>About Us Image</FormLabel><FormControl><Input type="file" name="about_image_file" accept="image/*" /></FormControl>{field.value && <img src={field.value} alt="About us preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                        
                        <div className="mt-4">
                            <h4 className="font-semibold">Team Members</h4>
                            {teamMemberFields.map((field, index) => (
                                <Card key={field.id} className="p-2 my-2 relative"><Trash2 className="absolute top-2 right-2 h-4 w-4 text-destructive cursor-pointer" onClick={() => removeTeamMember(index)} />
                                <div className="grid grid-cols-2 gap-2">
                                    <FormField control={form.control} name={`team_members.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name={`team_members.${index}.role`} render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                </div>
                                <FormField control={form.control} name={`team_members.${index}.imageUrl`} render={({ field: imgField }) => (<FormItem className="mt-2"><FormLabel>Image</FormLabel><FormControl><Input type="file" name={`team_member_file_${index}`} accept="image/*" /></FormControl>{imgField.value && <img src={imgField.value} alt="team member" className="h-10 w-auto mt-1" />}</FormItem>)} />
                                </Card>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendTeamMember({ name: '', role: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Team Member</Button>
                        </div>
                    </div>
                     {/* Admissions Page Section */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Admissions Page</h3>
                        <FormField control={form.control} name="admissions_intro" render={({ field }) => (<FormItem><FormLabel>Intro Text</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="admissions_pdf_url" render={({ field }) => (<FormItem className="mt-2"><FormLabel>Admission Form PDF</FormLabel><FormControl><Input type="file" name="admissions_pdf_file" accept=".pdf" /></FormControl>{field.value && <a href={field.value} target="_blank" className="text-blue-500 text-xs">View current</a>}</FormItem>)} />
                    </div>
                    {/* Programs Page Section */}
                    <div className="p-4 border rounded-lg">
                         <h3 className="text-lg font-semibold mb-2">Programs Page</h3>
                         <FormField control={form.control} name="programs_intro" render={({ field }) => (<FormItem><FormLabel>Intro Text</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                         <div className="grid grid-cols-2 gap-2 mt-2">
                          <FormField control={form.control} name="program_creche_image_url" render={({ field }) => (<FormItem><FormLabel>Creche Image</FormLabel><FormControl><Input type="file" name="program_creche_image_file" accept="image/*"/></FormControl>{field.value && <img src={field.value} alt="preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                          <FormField control={form.control} name="program_kindergarten_image_url" render={({ field }) => (<FormItem><FormLabel>Kindergarten Image</FormLabel><FormControl><Input type="file" name="program_kindergarten_image_file" accept="image/*"/></FormControl>{field.value && <img src={field.value} alt="preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                          <FormField control={form.control} name="program_primary_image_url" render={({ field }) => (<FormItem><FormLabel>Primary Image</FormLabel><FormControl><Input type="file" name="program_primary_image_file" accept="image/*"/></FormControl>{field.value && <img src={field.value} alt="preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                          <FormField control={form.control} name="program_jhs_image_url" render={({ field }) => (<FormItem><FormLabel>JHS Image</FormLabel><FormControl><Input type="file" name="program_jhs_image_file" accept="image/*"/></FormControl>{field.value && <img src={field.value} alt="preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                         </div>
                    </div>
                     {/* Donate Page Section */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Donate Page</h3>
                        <FormField control={form.control} name="donate_image_url" render={({ field }) => (<FormItem><FormLabel>Donate Page Image</FormLabel><FormControl><Input type="file" name="donate_image_file" accept="image/*"/></FormControl>{field.value && <img src={field.value} alt="preview" className="h-10 w-auto mt-1" />}</FormItem>)} />
                    </div>
                </CardContent>
            </TabsContent>
            
            <TabsContent value="keys" className="m-0">
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
            </TabsContent>

            <TabsContent value="theme" className="m-0">
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
            </TabsContent>

            <TabsContent value="academic" className="m-0">
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
            </TabsContent>
          </Card>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
            <SubmitButton>Save All Settings</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
