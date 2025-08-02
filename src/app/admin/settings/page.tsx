
"use client";

import { Separator } from "@/components/ui/separator";
import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, Bell, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, School, Home, Users, BookOpen, KeyRound, Link as LinkIcon, HandHeart, Sparkles, FileText, Palette, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from '@/lib/supabaseClient';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { revalidateWebsitePages } from '@/lib/actions/revalidate.actions';
import { endOfYearProcessAction } from "@/lib/actions/settings.actions";
import { PROGRAMS_LIST } from '@/lib/constants';
import * as LucideIcons from "lucide-react";
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
import { hslStringToHex, hexToHslString } from '@/lib/utils';


interface WhyUsPoint {
  id: string;
  title: string;
  description: string;
  icon: string;
}
interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}
interface AdmissionStep {
  id: string;
  title: string;
  description: string;
  icon: string;
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
  hero_image_url_1?: string | null;
  hero_image_url_2?: string | null;
  hero_image_url_3?: string | null;
  hero_image_url_4?: string | null;
  hero_image_url_5?: string | null;
  homepage_welcome_title?: string | null;
  homepage_welcome_message?: string | null;
  homepage_welcome_image_url?: string | null;
  homepage_why_us_title?: string | null;
  homepage_why_us_points?: WhyUsPoint[] | string; 
  homepage_news_title?: string | null;
  about_mission?: string;
  about_vision?: string;
  about_image_url?: string;
  admissions_intro?: string;
  admissions_pdf_url?: string | null;
  admissions_steps?: AdmissionStep[] | string;
  programs_intro?: string;
  team_members?: TeamMember[] | string;
  program_creche_image_url?: string | null;
  program_kindergarten_image_url?: string | null;
  program_primary_image_url?: string | null;
  program_jhs_image_url?: string | null;
  donate_image_url?: string;
  color_primary?: string;
  color_accent?: string;
  color_background?: string;
}

const defaultAppSettings: Omit<AppSettings, 'id' | 'updated_at'> = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "EduSync",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@edusync.com",
  school_logo_url: "",
  facebook_url: null,
  twitter_url: null,
  instagram_url: null,
  linkedin_url: null,
  enable_email_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nEduSync",
  paystack_public_key: null,
  paystack_secret_key: null,
  resend_api_key: null,
  google_api_key: null,
  homepage_title: "EduSync",
  homepage_subtitle: "Nurturing Minds, Building Futures.",
  hero_image_url_1: null,
  hero_image_url_2: null,
  hero_image_url_3: null,
  hero_image_url_4: null,
  hero_image_url_5: null,
  homepage_welcome_title: "Welcome to Our School",
  homepage_welcome_message: "A message from the head of school...",
  homepage_welcome_image_url: "",
  homepage_why_us_title: "Why Choose Us?",
  homepage_why_us_points: [],
  homepage_news_title: "Latest News & Updates",
  about_mission: "To empower educational institutions with intuitive technology.",
  about_vision: "To be the leading school management platform.",
  about_image_url: "",
  admissions_intro: "We are excited you are considering joining our community.",
  admissions_pdf_url: null,
  admissions_steps: [],
  programs_intro: "We offer a rich and diverse curriculum.",
  team_members: [],
  program_creche_image_url: null,
  program_kindergarten_image_url: null,
  program_primary_image_url: null,
  program_jhs_image_url: null,
  donate_image_url: "",
  color_primary: "220 25% 20%",
  color_accent: "100 55% 50%",
  color_background: "0 0% 100%",
};


const SUPABASE_STORAGE_BUCKET = 'school-assets';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [originalAcademicYear, setOriginalAcademicYear] = useState<string>("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

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
          setOriginalAcademicYear(settings.current_academic_year);
          const timestamp = settings.updated_at;
          const initialPreviews: Record<string, string | null> = {
            logo: generateCacheBustingUrl(settings.school_logo_url, timestamp),
            welcome: generateCacheBustingUrl(settings.homepage_welcome_image_url, timestamp),
            about: generateCacheBustingUrl(settings.about_image_url, timestamp),
            admissions_pdf: generateCacheBustingUrl(settings.admissions_pdf_url, timestamp),
            donate: generateCacheBustingUrl(settings.donate_image_url, timestamp),
            program_creche: generateCacheBustingUrl(settings.program_creche_image_url, timestamp),
            program_kindergarten: generateCacheBustingUrl(settings.program_kindergarten_image_url, timestamp),
            program_primary: generateCacheBustingUrl(settings.program_primary_image_url, timestamp),
            program_jhs: generateCacheBustingUrl(settings.program_jhs_image_url, timestamp),
          };
          for (let i = 1; i <= 5; i++) {
            initialPreviews[`hero_${i}`] = generateCacheBustingUrl(settings[`hero_image_url_${i}` as keyof AppSettings] as string, timestamp);
          }
           if (Array.isArray(settings.team_members)) {
             settings.team_members.forEach((member: { id: any; imageUrl: string | null | undefined; }) => {
               initialPreviews[`team.${member.id}`] = generateCacheBustingUrl(member.imageUrl, timestamp);
             });
           }
          setImagePreviews(initialPreviews);
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
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url!);
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
        const newState = JSON.parse(JSON.stringify(prev)); 

        let current: any = newState;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const nextKeyIsIndex = !isNaN(parseInt(keys[i + 1]));

            if (current[key] === undefined || current[key] === null) {
                current[key] = nextKeyIsIndex ? [] : {};
            }
            
            if (typeof current[key] === 'string') {
                try {
                    current[key] = JSON.parse(current[key]);
                } catch (e) {
                    console.error("Failed to parse nested JSON string:", current[key]);
                    current[key] = nextKeyIsIndex ? [] : {}; 
                }
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return newState;
    });
};


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
    const file = event.target.files?.[0];
    if (imagePreviews[key] && imagePreviews[key]?.startsWith('blob:')) URL.revokeObjectURL(imagePreviews[key]!);
    
    setImageFiles(prev => ({...prev, [key]: file || null}));
    setImagePreviews(prev => ({...prev, [key]: file ? URL.createObjectURL(file) : null}));
  };
  
  const uploadFile = async (file: File, context: string): Promise<string | null> => {
    if (!supabaseRef.current) return null;
    const fileName = `${context}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${context}/${fileName}`;
    const { error } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload Failed", description: `Could not upload file to ${filePath}: ${error.message}`, variant: "destructive" });
      return null;
    }
    const { data } = supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const proceedWithSave = async () => {
    if (!currentUser || !supabaseRef.current || !appSettings) return;
    setIsSaving(true);
    const updatedSettingsToSave = { ...appSettings, updated_at: new Date().toISOString() };
    const academicYearChanged = originalAcademicYear !== updatedSettingsToSave.current_academic_year;

    for (const key in imageFiles) {
        const file = imageFiles[key];
        if (file) {
            const context = key.split('.')[0]; 
            const newUrl = await uploadFile(file, context);
            if (newUrl) {
                if (key === 'logo') updatedSettingsToSave.school_logo_url = newUrl;
                else if (key === 'admissions_pdf') updatedSettingsToSave.admissions_pdf_url = newUrl;
                else if (key.startsWith('hero')) {
                    const heroIndex = key.split('_')[1];
                    (updatedSettingsToSave as any)[`hero_image_url_${heroIndex}`] = newUrl;
                }
                else if (key === 'welcome') updatedSettingsToSave.homepage_welcome_image_url = newUrl;
                else if (key === 'about') updatedSettingsToSave.about_image_url = newUrl;
                else if (key === 'donate') updatedSettingsToSave.donate_image_url = newUrl;
                else if (key.startsWith('program_')) {
                    const fullKey = `${key}_image_url` as keyof AppSettings;
                    (updatedSettingsToSave as any)[fullKey] = newUrl;
                } else if (context === 'team' && Array.isArray(updatedSettingsToSave.team_members)) {
                    const memberId = key.split('.')[1];
                    const memberIndex = updatedSettingsToSave.team_members.findIndex(m => m.id === memberId);
                    if (memberIndex > -1) {
                        updatedSettingsToSave.team_members[memberIndex].imageUrl = newUrl;
                    }
                }
            } else {
                setIsSaving(false);
                return;
            }
        }
    }

    try {
      const upsertPayload = { ...updatedSettingsToSave, id: 1 };
      const { data, error } = await supabaseRef.current.from('app_settings').upsert(upsertPayload).select().single();

      if (error) throw error;
      
      let successMessage = "Your school settings have been updated successfully.";

      if (academicYearChanged) {
        toast({ title: "Processing End-of-Year...", description: "Academic year changed. Now running promotion and arrears calculation. This may take a moment." });
        const eoyResult = await endOfYearProcessAction(originalAcademicYear);
        if (eoyResult.success) {
          successMessage += ` ${eoyResult.message}`;
        } else {
          successMessage += ` However, the automated End-of-Year process failed: ${eoyResult.message}`;
        }
      }

      toast({ title: "Settings Saved", description: successMessage, duration: 9000 });
      
      await revalidateWebsitePages();
      
      if (isMounted.current && data) {
          const newSettings = data as AppSettings;
          setAppSettings(newSettings);
          setOriginalAcademicYear(newSettings.current_academic_year);
          const timestamp = newSettings.updated_at;
          const newPreviews: Record<string, string | null> = {};
          newPreviews.logo = generateCacheBustingUrl(newSettings.school_logo_url, timestamp);
          newPreviews.welcome = generateCacheBustingUrl(newSettings.homepage_welcome_image_url, timestamp);
          newPreviews.about = generateCacheBustingUrl(newSettings.about_image_url, timestamp);
          newPreviews.admissions_pdf = generateCacheBustingUrl(newSettings.admissions_pdf_url, timestamp);
          newPreviews.donate = generateCacheBustingUrl(newSettings.donate_image_url, timestamp);
          newPreviews.program_creche = generateCacheBustingUrl(newSettings.program_creche_image_url, timestamp);
          newPreviews.program_kindergarten = generateCacheBustingUrl(newSettings.program_kindergarten_image_url, timestamp);
          newPreviews.program_primary = generateCacheBustingUrl(newSettings.program_primary_image_url, timestamp);
          newPreviews.program_jhs = generateCacheBustingUrl(newSettings.program_jhs_image_url, timestamp);

          for (let i = 1; i <= 5; i++) {
              newPreviews[`hero_${i}`] = generateCacheBustingUrl(newSettings[`hero_image_url_${i}` as keyof AppSettings] as string, timestamp);
          }
           if (Array.isArray(newSettings.team_members)) {
              newSettings.team_members.forEach((member) => {
                newPreviews[`team.${member.id}`] = generateCacheBustingUrl(member.imageUrl, timestamp);
              });
           }
          setImagePreviews(newPreviews);
      }
    } catch (error: any) {
      toast({ title: "Error Saving Settings", description: error.message, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
        setImageFiles({});
      }
    }
  };

  const handleSaveClick = () => {
    if (!appSettings) return;
    const academicYearChanged = originalAcademicYear !== appSettings.current_academic_year;
    if (academicYearChanged) {
      setIsConfirmDialogOpen(true);
    } else {
      proceedWithSave();
    }
  };


  if (isLoadingSettings) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading system settings...</p></div>;
  }
  if (loadingError) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{loadingError}</p></CardContent></Card>;
  }
  if (!appSettings) {
      return <Card><CardHeader><CardTitle>No Settings Found</CardTitle></CardHeader><CardContent><p>Initial application settings have not been loaded.</p></CardContent></Card>;
  }

  const timestamp = appSettings.updated_at;
  const programImageFields: { key: keyof AppSettings, label: string }[] = [
    { key: 'program_creche_image_url', label: 'Creche & Nursery Program Image'},
    { key: 'program_kindergarten_image_url', label: 'Kindergarten Program Image'},
    { key: 'program_primary_image_url', label: 'Primary School Program Image'},
    { key: 'program_jhs_image_url', label: 'Junior High School Program Image'},
  ];

  const iconNames = Object.keys(LucideIcons).filter(k => typeof (LucideIcons as any)[k] === 'object');
  
  const safeParseJson = (jsonString: any, fallback: any[] = []) => {
    if (Array.isArray(jsonString)) {
      return jsonString;
    }
    if (typeof jsonString === 'string') {
      try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  };
  
  const whyUsPoints = safeParseJson(appSettings.homepage_why_us_points, []);
  const teamMembers = safeParseJson(appSettings.team_members, []);
  const admissionSteps = safeParseJson(appSettings.admissions_steps, []);


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System & App Settings</h2>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl text-primary/90"><School /> School Information</CardTitle>
                    <CardDescription>Manage the core details of your school.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleSettingChange('school_name', e.target.value)} /></div>
                    <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address || ''} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
                    <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
                    <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
                    <div className="space-y-2">
                    <Label htmlFor="logo_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> School Logo</Label>
                    {imagePreviews.logo && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.logo} alt="Logo Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/></div>}
                    <Input id="logo_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="website" className="mt-6">
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Home /> Public Website Content</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <Tabs defaultValue="homepage" className="w-full">
                        <TabsList>
                            <TabsTrigger value="homepage">Homepage</TabsTrigger>
                            <TabsTrigger value="about">About Page</TabsTrigger>
                            <TabsTrigger value="admissions">Admissions Page</TabsTrigger>
                            <TabsTrigger value="programs">Programs Page</TabsTrigger>
                            <TabsTrigger value="donate">Donate Page</TabsTrigger>
                            <TabsTrigger value="news">News Page</TabsTrigger>
                        </TabsList>
                        <TabsContent value="homepage" className="pt-4">
                            <div><Label htmlFor="homepage_title">Homepage Main Title</Label><Input id="homepage_title" value={appSettings.homepage_title || ''} onChange={(e) => handleSettingChange('homepage_title', e.target.value)}/></div>
                            <div className="mt-4"><Label htmlFor="homepage_subtitle">Homepage Subtitle</Label><Input id="homepage_subtitle" value={appSettings.homepage_subtitle || ''} onChange={(e) => handleSettingChange('homepage_subtitle', e.target.value)}/></div>
                            <Separator className="my-4"/>
                            <h3 className="text-lg font-semibold">Hero Slideshow Images</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="space-y-2 border p-3 rounded-md">
                                        <Label htmlFor={`hero_image_file_${i}`} className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Hero Image {i}</Label>
                                        {imagePreviews[`hero_${i}`] && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews[`hero_${i}`]!} alt={`Hero ${i} Preview`} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school students"/></div>}
                                        <Input id={`hero_image_file_${i}`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, `hero_${i}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                    </div>
                                ))}
                            </div>
                            <Separator className="my-4"/>
                            <h3 className="text-lg font-semibold">Welcome Section</h3>
                            <div><Label htmlFor="homepage_welcome_title">Welcome Title</Label><Input id="homepage_welcome_title" value={appSettings.homepage_welcome_title || ''} onChange={(e) => handleSettingChange('homepage_welcome_title', e.target.value)}/></div>
                            <div className="mt-4"><Label htmlFor="homepage_welcome_message">Welcome Message</Label><Textarea id="homepage_welcome_message" value={appSettings.homepage_welcome_message || ''} onChange={(e) => handleSettingChange('homepage_welcome_message', e.target.value)}/></div>
                            <div className="space-y-2 border p-3 rounded-md mt-4">
                                <Label htmlFor="welcome_image_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Welcome Image</Label>
                                {imagePreviews.welcome && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.welcome} alt="Welcome image preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="person portrait"/></div>}
                                <Input id="welcome_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'welcome')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                            <Separator className="my-4"/>
                            <h3 className="text-lg font-semibold">"Why Choose Us?" Section</h3>
                            <div><Label htmlFor="homepage_why_us_title">Section Title</Label><Input id="homepage_why_us_title" value={appSettings.homepage_why_us_title || ''} onChange={(e) => handleSettingChange('homepage_why_us_title', e.target.value)}/></div>
                            {whyUsPoints.map((point, index) => (
                                <div key={point.id} className="p-3 border rounded-lg space-y-3 relative mt-2">
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('homepage_why_us_points', whyUsPoints?.filter(p => p.id !== point.id))}><Trash2 className="h-4 w-4"/></Button>
                                    <div><Label>Feature Title</Label><Input value={point.title} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.title`, e.target.value)}/></div>
                                    <div><Label>Feature Description</Label><Input value={point.description} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.description`, e.target.value)}/></div>
                                    <div><Label>Feature Icon (from Lucide)</Label>
                                        <select value={point.icon} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.icon`, e.target.value)} className="w-full p-2 border rounded-md bg-background">
                                            {iconNames.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="mt-2" onClick={() => handleSettingChange('homepage_why_us_points', [...whyUsPoints, {id: `point_${Date.now()}`, title: 'New Feature', description: 'Description', icon: 'CheckCircle'}])}>Add "Why Us?" Point</Button>
                        </TabsContent>
                        <TabsContent value="about" className="pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">About Page Content</h3>
                            <div><Label htmlFor="about_mission">Mission Statement</Label><Textarea id="about_mission" value={appSettings.about_mission || ''} onChange={(e) => handleSettingChange('about_mission', e.target.value)}/></div>
                            <div><Label htmlFor="about_vision">Vision Statement</Label><Textarea id="about_vision" value={appSettings.about_vision || ''} onChange={(e) => handleSettingChange('about_vision', e.target.value)}/></div>
                            <div className="space-y-2 border p-3 rounded-md">
                                <Label htmlFor="about_image_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> About Page Main Image</Label>
                                {imagePreviews.about && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.about} alt="About image preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="collaboration team"/></div>}
                                <Input id="about_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'about')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                             <Separator className="my-4"/>
                            <h3 className="text-lg font-semibold">Team Members</h3>
                            {teamMembers.map((member, index) => (
                                <div key={member.id} className="p-3 border rounded-lg space-y-3 relative mt-2">
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('team_members', teamMembers.filter(m => m.id !== member.id))}><Trash2 className="h-4 w-4"/></Button>
                                    <div><Label>Member Name</Label><Input value={member.name} onChange={(e) => handleNestedChange(`team_members.${index}.name`, e.target.value)}/></div>
                                    <div><Label>Member Role</Label><Input value={member.role} onChange={(e) => handleNestedChange(`team_members.${index}.role`, e.target.value)}/></div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`team_image_${member.id}`} className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Member Photo</Label>
                                        {imagePreviews[`team.${member.id}`] && <div className="my-2 p-2 border rounded-md inline-block max-w-[150px]"><img src={imagePreviews[`team.${member.id}`]!} alt={`${member.name} preview`} className="object-contain max-h-20 max-w-[100px]" data-ai-hint="person portrait"/></div>}
                                        <Input id={`team_image_${member.id}`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, `team.${member.id}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="mt-2" onClick={() => handleSettingChange('team_members', [...teamMembers, {id: `member_${Date.now()}`, name: 'New Member', role: 'Role', imageUrl: ''}])}>Add Team Member</Button>
                        </TabsContent>
                         <TabsContent value="admissions" className="pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">Admissions Page Content</h3>
                            <div><Label htmlFor="admissions_intro">Introductory Text</Label><Textarea id="admissions_intro" value={appSettings.admissions_intro || ''} onChange={(e) => handleSettingChange('admissions_intro', e.target.value)}/></div>
                             <div className="space-y-2 border p-3 rounded-md">
                                <Label htmlFor="admissions_pdf_file" className="flex items-center"><FileText className="mr-2 h-4 w-4" /> Admission Form PDF (Optional)</Label>
                                {appSettings.admissions_pdf_url && <p className="text-xs text-muted-foreground">Current file: <a href={appSettings.admissions_pdf_url} className="text-accent underline" target="_blank" rel="noopener noreferrer">{appSettings.admissions_pdf_url.split('/').pop()}</a></p>}
                                <Input id="admissions_pdf_file" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'admissions_pdf')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                            <Separator className="my-4"/>
                             <h3 className="text-lg font-semibold">Admission Steps</h3>
                             {admissionSteps.map((step, index) => (
                                <div key={step.id} className="p-3 border rounded-lg space-y-3 relative mt-2">
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('admissions_steps', admissionSteps.filter(s => s.id !== step.id))}><Trash2 className="h-4 w-4"/></Button>
                                    <div><Label>Step Title</Label><Input value={step.title} onChange={(e) => handleNestedChange(`admissions_steps.${index}.title`, e.target.value)}/></div>
                                    <div><Label>Step Description</Label><Input value={step.description} onChange={(e) => handleNestedChange(`admissions_steps.${index}.description`, e.target.value)}/></div>
                                    <div><Label>Step Icon (from Lucide)</Label>
                                        <select value={step.icon} onChange={(e) => handleNestedChange(`admissions_steps.${index}.icon`, e.target.value)} className="w-full p-2 border rounded-md bg-background">
                                            {iconNames.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="mt-2" onClick={() => handleSettingChange('admissions_steps', [...admissionSteps, {id: `step_${Date.now()}`, title: 'New Step', description: 'Description', icon: 'CheckSquare'}])}>Add Admission Step</Button>
                         </TabsContent>
                         <TabsContent value="programs" className="pt-4 space-y-4">
                             <h3 className="text-lg font-semibold">Programs Page Content</h3>
                             <div><Label htmlFor="programs_intro">Introductory Text</Label><Textarea id="programs_intro" value={appSettings.programs_intro || ''} onChange={(e) => handleSettingChange('programs_intro', e.target.value)}/></div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {programImageFields.map(({key, label}) => (
                                    <div key={key} className="space-y-2 border p-3 rounded-md">
                                        <Label htmlFor={`${key}_file`} className="flex items-center"><ImageIcon className="mr-2 h-4 w-4"/> {label}</Label>
                                        {imagePreviews[key.replace('_image_url', '')] && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews[key.replace('_image_url', '')]!} alt={`${label} preview`} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school students"/></div>}
                                        <Input id={`${key}_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, key.replace('_image_url', ''))} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                    </div>
                                ))}
                            </div>
                         </TabsContent>
                         <TabsContent value="donate" className="pt-4 space-y-4">
                             <h3 className="text-lg font-semibold">Donate Page Content</h3>
                             <div className="space-y-2 border p-3 rounded-md">
                                <Label htmlFor="donate_image_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Main Image for Donate Page</Label>
                                {imagePreviews.donate && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><img src={imagePreviews.donate} alt="Donate image preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="community charity"/></div>}
                                <Input id="donate_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'donate')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                         </TabsContent>
                        <TabsContent value="news" className="pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">News Page Content</h3>
                            <div><Label htmlFor="homepage_news_title">News Section Title on Homepage</Label><Input id="homepage_news_title" value={appSettings.homepage_news_title || ''} onChange={(e) => handleSettingChange('homepage_news_title', e.target.value)}/></div>
                             <div className="flex items-start p-4 bg-secondary/50 rounded-lg">
                                <Megaphone className="h-6 w-6 mr-3 text-primary shrink-0 mt-1"/>
                                <div>
                                    <h4 className="font-semibold text-primary">How News Works</h4>
                                    <p className="text-sm text-muted-foreground">The "Latest News & Updates" section on your homepage automatically displays the three most recent announcements you create in the "Announcements" section of the Admin Dashboard. There's no need to manage news items separately!</p>
                                </div>
                             </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="theme" className="mt-6">
            <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-primary/90"><Palette /> Color Scheme</CardTitle>
              <CardDescription>Customize the application's main colors. Changes will apply site-wide after saving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="color_primary">Primary Color</Label>
                  <Input 
                    id="color_primary" 
                    type="color" 
                    className="h-10 p-1"
                    value={hslStringToHex(appSettings.color_primary || '0 0% 0%')}
                    onChange={(e) => handleSettingChange('color_primary', hexToHslString(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="color_accent">Accent Color</Label>
                  <Input 
                    id="color_accent" 
                    type="color" 
                    className="h-10 p-1"
                    value={hslStringToHex(appSettings.color_accent || '0 0% 0%')}
                    onChange={(e) => handleSettingChange('color_accent', hexToHslString(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="color_background">Background Color</Label>
                  <Input 
                    id="color_background" 
                    type="color" 
                    className="h-10 p-1"
                    value={hslStringToHex(appSettings.color_background || '0 0% 100%')}
                    onChange={(e) => handleSettingChange('color_background', hexToHslString(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="api" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><KeyRound /> API Keys</CardTitle><CardDescription>Manage third-party service API keys.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="paystack_public_key">Paystack Public Key</Label><Input id="paystack_public_key" value={appSettings.paystack_public_key || ""} onChange={(e) => handleSettingChange('paystack_public_key', e.target.value)} placeholder="pk_test_..."/></div>
                    <div><Label htmlFor="paystack_secret_key">Paystack Secret Key</Label><Input id="paystack_secret_key" type="password" value={appSettings.paystack_secret_key || ""} onChange={(e) => handleSettingChange('paystack_secret_key', e.target.value)} placeholder="sk_test_..."/></div>
                    <div><Label htmlFor="resend_api_key">Resend API Key</Label><Input id="resend_api_key" type="password" value={appSettings.resend_api_key || ""} onChange={(e) => handleSettingChange('resend_api_key', e.target.value)} placeholder="re_..."/></div>
                    <div><Label htmlFor="google_api_key">Google AI API Key</Label><Input id="google_api_key" type="password" value={appSettings.google_api_key || ""} onChange={(e) => handleSettingChange('google_api_key', e.target.value)} placeholder="AIzaSy..."/></div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
             <Card className="shadow-lg">
                    <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage system-wide email notifications.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
                        <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature || ''} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
                    </CardContent>
                </Card>
        </TabsContent>
        <TabsContent value="academic" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle><CardDescription>Configure the current academic year.</CardDescription></CardHeader>
                <CardContent>
                    <div><Label htmlFor="current_academic_year">Current Academic Year</Label><Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" /></div>
                    <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                        <h4 className="text-destructive font-semibold">End-of-Year Process</h4>
                        <div className="text-destructive/90 text-sm">
                            This action is irreversible. It will:
                            <ul className="list-disc list-inside pl-4 mt-2">
                                <li>Calculate outstanding fees for all students for the current academic year and log them as arrears for the next year.</li>
                                <li>Promote all students to their next grade level (e.g., Basic 1 to Basic 2).</li>
                            </ul>
                        </div>
                        <p className="text-destructive/90 text-sm mt-2">
                           This process is triggered automatically when you change the academic year and click "Save All Settings".
                        </p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end pt-4">
          <Button onClick={handleSaveClick} disabled={!currentUser || isSaving} size="lg">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />}
              Save All Settings
          </Button>
      </div>

       <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Academic Year Change</AlertDialogTitle>
                <div className="space-y-2 py-2">
                    <AlertDialogDescription>
                        You are about to change the academic year from{' '}
                        <strong>{originalAcademicYear}</strong> to{' '}
                        <strong>{appSettings.current_academic_year}</strong>. This action
                        is significant and will trigger the following automated processes:
                    </AlertDialogDescription>
                    <ul className="list-disc list-inside text-sm text-muted-foreground pl-4 space-y-1">
                        <li>All student balances for {originalAcademicYear} will be calculated, and any outstanding amounts will be logged as arrears.</li>
                        <li>All students will be promoted to their next grade level.</li>
                    </ul>
                    <AlertDialogDescription>
                        This action cannot be easily undone. Are you sure you want to proceed?
                    </AlertDialogDescription>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={() => {
                    setIsConfirmDialogOpen(false);
                    proceedWithSave();
                }}
                className="bg-destructive hover:bg-destructive/90"
                >
                Yes, Proceed
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
