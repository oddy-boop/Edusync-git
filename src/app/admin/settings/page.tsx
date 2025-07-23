
"use client";

import { Separator } from "@/components/ui/separator";
import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, Bell, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, School, Home, Users, BookOpen, KeyRound, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from '@/lib/supabaseClient';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { revalidateWebsitePages } from '@/lib/actions/revalidate.actions';
import { PROGRAMS_LIST } from '@/lib/constants';

interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

interface ProgramDetail {
  description: string;
  imageUrl: string;
}

interface AppSettings {
  id?: number;
  current_academic_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  facebook_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  enable_email_notifications: boolean;
  email_footer_signature: string;
  updated_at?: string;
  paystack_public_key?: string | null;
  paystack_secret_key?: string | null;
  resend_api_key?: string | null;
  google_api_key?: string | null;
  homepage_title?: string;
  homepage_subtitle?: string;
  homepage_slideshow?: HomepageSlide[];
  team_members?: TeamMember[];
  program_details?: Record<string, ProgramDetail>;
}

const defaultAppSettings: Omit<AppSettings, 'id' | 'updated_at'> = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "EduSync Platform",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@edusync.com",
  school_logo_url: "",
  facebook_url: null,
  twitter_url: null,
  instagram_url: null,
  linkedin_url: null,
  enable_email_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nEduSync Platform",
  paystack_public_key: null,
  paystack_secret_key: null,
  resend_api_key: null,
  google_api_key: null,
  homepage_title: "EduSync Platform",
  homepage_subtitle: "Nurturing Minds, Building Futures.",
  homepage_slideshow: [],
  about_mission: "To empower educational institutions with intuitive technology.",
  about_vision: "To be the leading school management platform.",
  about_image_url: "",
  team_members: [],
  admissions_intro: "We are excited you are considering joining our community.",
  programs_intro: "We offer a rich and diverse curriculum.",
  program_details: {},
};


const SUPABASE_STORAGE_BUCKET = 'school-assets';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({});

  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    isMounted.current = true;
    supabaseRef.current = getSupabase();

    const fetchCurrentUserAndSettings = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoadingSettings(true);
      setLoadingError(null);

      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (isMounted.current) setCurrentUser(session?.user || null);

      if (!session?.user) {
        if (isMounted.current) {
            setLoadingError("You must be logged in as an admin to manage settings.");
            setIsLoadingSettings(false);
        }
        return;
      }

      try {
        const { data, error } = await supabaseRef.current.from('app_settings').select('*').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        const settings = { ...defaultAppSettings, ...(data || {}) };
        if (isMounted.current) {
          setAppSettings(settings as AppSettings);
          setImagePreviews({
              logo: settings.school_logo_url || null,
              about: settings.about_image_url || null,
          });
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error loading settings:", error);
        if (isMounted.current) setLoadingError(`Could not load settings. Error: ${error.message}`);
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };

    fetchCurrentUserAndSettings();

    return () => {
      isMounted.current = false;
      Object.values(imagePreviews).forEach(url => {
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleSettingChange = (field: keyof Omit<AppSettings, 'id'>, value: any) => {
    setAppSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };
  
  const handleNestedChange = (path: string, value: any) => {
      setAppSettings(prev => {
          if (!prev) return null;
          const keys = path.split('.');
          const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
          let current = newState;
          for (let i = 0; i < keys.length - 1; i++) {
              current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          return newState;
      });
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
    const file = event.target.files?.[0];
    if (imagePreviews[key] && imagePreviews[key]?.startsWith('blob:')) URL.revokeObjectURL(imagePreviews[key]!);
    
    setImageFiles(prev => ({...prev, [key]: file || null}));
    setImagePreviews(prev => ({...prev, [key]: file ? URL.createObjectURL(file) : null}));
  };
  
  const uploadImage = async (file: File, context: string): Promise<string | null> => {
    if (!supabaseRef.current) return null;
    const fileName = `${context}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${fileName}`; // No school ID folder for simplicity
    const { error } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload Failed", description: `Could not upload image: ${error.message}`, variant: "destructive" });
      return null;
    }
    const { data } = supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const handleSaveSettings = async () => {
    if (!currentUser || !supabaseRef.current || !appSettings) return;
    setIsSaving(true);
    let settingsToSave = { ...appSettings };

    for (const key in imageFiles) {
        const file = imageFiles[key];
        if (file) {
            const newUrl = await uploadImage(file, key.split('.')[0]); // Use first part of key as context
            if (newUrl) {
                const path = key.split('.');
                if (path[0] === 'logo') {
                    settingsToSave.school_logo_url = newUrl;
                } else if (path[0] === 'about') {
                    settingsToSave.about_image_url = newUrl;
                } else if (path[0] === 'slideshow' && settingsToSave.homepage_slideshow) {
                    const slideIndex = parseInt(path[1], 10);
                    if (!isNaN(slideIndex) && settingsToSave.homepage_slideshow[slideIndex]) {
                        settingsToSave.homepage_slideshow[slideIndex].imageUrl = newUrl;
                    }
                } else if (path[0] === 'team' && settingsToSave.team_members) {
                    const memberId = path[1];
                    const memberIndex = settingsToSave.team_members.findIndex(m => m.id === memberId);
                    if (memberIndex > -1) {
                        settingsToSave.team_members[memberIndex].imageUrl = newUrl;
                    }
                } else if (path[0] === 'program' && settingsToSave.program_details) {
                    const programTitle = path[1];
                    if (!settingsToSave.program_details[programTitle]) {
                        settingsToSave.program_details[programTitle] = { description: '', imageUrl: '' };
                    }
                    settingsToSave.program_details[programTitle].imageUrl = newUrl;
                }
            } else {
                setIsSaving(false);
                return;
            }
        }
    }
    
    const { id, updated_at, ...updatePayload } = settingsToSave;

    try {
      const { data, error } = await supabaseRef.current.from('app_settings').update(updatePayload).eq('id', 1).select().single();
      if (error) throw error;
      toast({ title: "Settings Saved", description: "Your school settings have been updated successfully." });
      
      await revalidateWebsitePages();
      
      if (isMounted.current && data) setAppSettings(data as AppSettings);
    } catch (error: any) {
      toast({ title: "Error Saving Settings", description: error.message, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
        setImageFiles({});
      }
    }
  };


  if (isLoadingSettings) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading system settings...</p></div>;
  }
  if (loadingError) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{loadingError}</p></CardContent></Card>;
  }
  if (!appSettings) {
      return <div className="flex justify-center items-center py-10"><AlertCircle className="mr-2 h-8 w-8 text-amber-500" /><p>Settings not available. This might be a new school setup.</p></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System & App Settings</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="about">About Page</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="api">API &amp; Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl text-primary/90"><School /> School Information</CardTitle>
                            <CardDescription>Manage the core details of your school.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleSettingChange('school_name', e.target.value)} /></div>
                            <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
                            <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
                            <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
                            <div className="space-y-2">
                            <Label htmlFor="logo_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> School Logo</Label>
                            {imagePreviews.logo && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.logo} alt="Logo Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/></div>}
                            <Input id="logo_file" type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, 'logo')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-lg">
                        <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle><CardDescription>Configure the current academic year.</CardDescription></CardHeader>
                        <CardContent>
                            <div><Label htmlFor="current_academic_year">Current Academic Year</Label><Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" /></div>
                        </CardContent>
                    </Card>
                </div>
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl text-primary/90"><LinkIcon /> Social Media Links</CardTitle>
                        <CardDescription>Enter the full URLs for your social media profiles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div><Label htmlFor="facebook_url">Facebook URL</Label><Input id="facebook_url" value={appSettings.facebook_url || ''} onChange={(e) => handleSettingChange('facebook_url', e.target.value)} placeholder="https://facebook.com/yourschool" /></div>
                        <div><Label htmlFor="twitter_url">Twitter (X) URL</Label><Input id="twitter_url" value={appSettings.twitter_url || ''} onChange={(e) => handleSettingChange('twitter_url', e.target.value)} placeholder="https://twitter.com/yourschool" /></div>
                        <div><Label htmlFor="instagram_url">Instagram URL</Label><Input id="instagram_url" value={appSettings.instagram_url || ''} onChange={(e) => handleSettingChange('instagram_url', e.target.value)} placeholder="https://instagram.com/yourschool" /></div>
                        <div><Label htmlFor="linkedin_url">LinkedIn URL</Label><Input id="linkedin_url" value={appSettings.linkedin_url || ''} onChange={(e) => handleSettingChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/company/yourschool" /></div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="homepage" className="mt-6">
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Home /> Homepage Content</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <Separator/>
                    <h3 className="text-lg font-semibold">Hero Slideshow</h3>
                    {appSettings.homepage_slideshow?.map((slide, index) => (
                        <div key={slide.id} className="p-3 border rounded-lg space-y-3 relative">
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('homepage_slideshow', appSettings.homepage_slideshow?.filter(s => s.id !== slide.id))}><Trash2 className="h-4 w-4"/></Button>
                            <div><Label>Slide {index+1} Title</Label><Input value={slide.title} onChange={(e) => handleNestedChange(`homepage_slideshow.${index}.title`, e.target.value)}/></div>
                            <div><Label>Slide {index+1} Subtitle</Label><Input value={slide.subtitle} onChange={(e) => handleNestedChange(`homepage_slideshow.${index}.subtitle`, e.target.value)}/></div>
                            <div>
                                <Label>Slide {index+1} Image</Label>
                                {(imagePreviews[`slideshow.${index}`] || slide.imageUrl) && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews[`slideshow.${index}`] || slide.imageUrl} alt="Slide Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school students"/></div>}
                                <Input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, `slideshow.${index}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" onClick={() => handleSettingChange('homepage_slideshow', [...(appSettings.homepage_slideshow || []), {id: `slide_${Date.now()}`, title: 'New Slide Title', subtitle: 'New slide subtitle.', imageUrl: ''}])}>Add Slide</Button>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="about" className="mt-6">
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Users /> About Us Page</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label htmlFor="about_mission">Our Mission</Label><Textarea id="about_mission" value={appSettings.about_mission || ""} onChange={(e) => handleSettingChange('about_mission', e.target.value)} /></div>
                    <div><Label htmlFor="about_vision">Our Vision</Label><Textarea id="about_vision" value={appSettings.about_vision || ""} onChange={(e) => handleSettingChange('about_vision', e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="about_image_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> About Us Image</Label>
                        {imagePreviews.about && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.about} alt="About Us Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="collaboration team"/></div>}
                        <Input id="about_image_file" type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, 'about')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                    <Separator/>
                    <h3 className="text-lg font-semibold">Meet the Team</h3>
                    {appSettings.team_members?.map((member, index) => (
                        <div key={member.id} className="p-3 border rounded-lg space-y-3 relative">
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('team_members', appSettings.team_members?.filter(t => t.id !== member.id))}><Trash2 className="h-4 w-4"/></Button>
                            <div><Label>Member Name</Label><Input value={member.name} onChange={(e) => handleNestedChange(`team_members.${index}.name`, e.target.value)}/></div>
                            <div><Label>Member Role</Label><Input value={member.role} onChange={(e) => handleNestedChange(`team_members.${index}.role`, e.target.value)}/></div>
                            <div>
                                <Label>Member Photo</Label>
                                {(imagePreviews[`team.${member.id}`] || member.imageUrl) && <div className="my-2 p-2 border rounded-md inline-block max-w-[100px]"><img src={imagePreviews[`team.${member.id}`] || member.imageUrl} alt="Team member" className="object-contain rounded-full h-16 w-16" data-ai-hint="person portrait"/></div>}
                                <Input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, `team.${member.id}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" onClick={() => handleSettingChange('team_members', [...(appSettings.team_members || []), {id: `member_${Date.now()}`, name: 'New Member', role: 'Role', imageUrl: ''}])}>Add Team Member</Button>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="programs" className="mt-6">
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><BookOpen /> Programs Page</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                     <div><Label htmlFor="programs_intro">Introduction Text</Label><Textarea id="programs_intro" value={appSettings.programs_intro || ""} onChange={(e) => handleSettingChange('programs_intro', e.target.value)} /></div>
                     <Separator/>
                     {PROGRAMS_LIST.map((program, index) => (
                         <div key={program.title} className="p-3 border rounded-lg space-y-3">
                             <h4 className="font-semibold">{program.title}</h4>
                             <div>
                                <Label>Description</Label>
                                <Textarea value={appSettings.program_details?.[program.title]?.description || program.description} onChange={(e) => handleNestedChange(`program_details.${program.title}.description`, e.target.value)} />
                             </div>
                             <div>
                                <Label>Image</Label>
                                {(imagePreviews[`program.${program.title}`] || appSettings.program_details?.[program.title]?.imageUrl) && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews[`program.${program.title}`] || appSettings.program_details?.[program.title]?.imageUrl} alt={`${program.title} preview`} className="object-contain max-h-20 max-w-[150px]" data-ai-hint={program.aiHint}/></div>}
                                <Input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, `program.${program.title}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                             </div>
                         </div>
                     ))}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="api" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><KeyRound /> API Keys</CardTitle><CardDescription>Manage third-party service API keys.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div><Label htmlFor="paystack_public_key">Paystack Public Key</Label><Input id="paystack_public_key" value={appSettings.paystack_public_key || ""} onChange={(e) => handleSettingChange('paystack_public_key', e.target.value)} placeholder="pk_test_..."/></div>
                        <div><Label htmlFor="paystack_secret_key">Paystack Secret Key</Label><Input id="paystack_secret_key" type="password" value={appSettings.paystack_secret_key || ""} onChange={(e) => handleSettingChange('paystack_secret_key', e.target.value)} placeholder="sk_test_..."/></div>
                        <div><Label htmlFor="resend_api_key">Resend API Key</Label><Input id="resend_api_key" type="password" value={appSettings.resend_api_key || ""} onChange={(e) => handleSettingChange('resend_api_key', e.target.value)} placeholder="re_..."/></div>
                        <div><Label htmlFor="google_api_key">Google AI API Key</Label><Input id="google_api_key" type="password" value={appSettings.google_api_key || ""} onChange={(e) => handleSettingChange('google_api_key', e.target.value)} placeholder="AIzaSy..."/></div>
                    </CardContent>
                </Card>
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage system-wide email notifications.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
                        <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} disabled={!currentUser || isSaving} size="lg">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />}
              Save All Settings
          </Button>
      </div>
    </div>
  );
}
