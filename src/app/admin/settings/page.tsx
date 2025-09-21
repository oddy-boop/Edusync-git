
"use client";

import { Separator } from "@/components/ui/separator";
import { useState, useEffect, type ChangeEvent, useRef, useMemo, memo, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, Bell, Save, Loader2, AlertCircle, ImageIcon as ImageIconLucide, Trash2, School, Home, Users, BookOpen, KeyRound, Link as LinkIcon, HandHeart, Sparkles, FileText, Palette, Megaphone, PlusCircle, MessageSquare, Mail, Phone, Hash, MapPin, RotateCcw, Shield } from "lucide-react";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { revalidateWebsitePages } from '@/lib/actions/revalidate.actions';
import { endOfYearProcessAction } from '@/lib/actions/settings.actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import MapWrapper from "@/components/shared/MapWrapper";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { getSchoolSettings, saveSchoolSettings, uploadSchoolAsset, getNewsPosts, saveNewsPost, deleteNewsPost } from "@/lib/actions/settings.actions";


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

interface NewsPost {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    published_at: string;
    author_name: string | null;
}

interface AppSettings {
  id?: number;
  name?: string; // name is now school_name in many places
  school_name: string;
  address?: string; // address is now school_address
  school_address: string;
  phone?: string; // phone is now school_phone
  school_phone: string;
  email?: string;
  school_email: string;
  logo_url?: string;
  school_logo_url: string;
  current_academic_year: string;
  school_latitude?: number | null;
  school_longitude?: number | null;
  check_in_radius_meters?: number | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  email_footer_signature: string;
  google_api_key?: string | null;
  resend_api_key?: string | null;
  from_email?: string | null;
  twilio_account_sid?: string | null;
  twilio_auth_token?: string | null;
  twilio_phone_number?: string | null;
  twilio_messaging_service_sid?: string | null; 
  updated_at?: string;
  homepage_title?: string | null;
  homepage_subtitle?: string | null;
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
  school_latitude: 5.6037, // Default to Accra
  school_longitude: -0.1870,
  check_in_radius_meters: 100,
  facebook_url: null,
  twitter_url: null,
  instagram_url: null,
  linkedin_url: null,
  enable_email_notifications: true,
  enable_sms_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nEduSync",
  google_api_key: null,
  resend_api_key: null,
  from_email: null,
  twilio_account_sid: null,
  twilio_auth_token: null,
  twilio_phone_number: null,
  twilio_messaging_service_sid: null, // New
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

// Memoized Tab Content Components to prevent re-renders
const GeneralTabContent = memo(function GeneralTabContent({ appSettings, handleSettingChange, imagePreviews, handleFileChange, handleSetLocation, isFetchingLocation }: any) {
    return (
        <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><School /> School Information</CardTitle><CardDescription>Manage the core details of your school.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings?.school_name ?? ''} onChange={(e) => {
                    console.log('🔍 School name changed:', e.target.value);
                    handleSettingChange('school_name', e.target.value);
                }} /></div>
                <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings?.school_address ?? ''} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
                <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings?.school_phone ?? ''} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
                <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings?.school_email ?? ''} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="logo_file" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> School Logo</Label>
                {imagePreviews.logo && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews.logo} alt="Logo Preview" width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/></div>}
                <Input id="logo_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>
                <Separator />
                <h3 className="text-lg font-semibold flex items-center"><MapPin className="mr-2 h-5 w-5"/>Geo-fencing for Attendance</h3>
                    <div className="space-y-4 p-3 border rounded-md">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="check_in_radius_meters">Check-in Radius (meters)</Label>
                            <Input
                                id="check_in_radius_meters"
                                type="number"
                                value={appSettings?.check_in_radius_meters ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    handleSettingChange('check_in_radius_meters', value === '' ? null : parseInt(value, 10));
                                }}
                                placeholder="e.g., 100"
                            />
                            <p className="text-xs text-muted-foreground mt-1">100 meters is about 328 feet.</p>
                            <Button onClick={handleSetLocation} disabled={isFetchingLocation} variant="outline" className="w-full">
                                {isFetchingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4" />}
                                Use My Current Location
                            </Button>
                        </div>
                            <div className="h-[300px] w-full rounded-lg overflow-hidden">
                            <MapWrapper 
                                settings={appSettings} 
                                onLocationSet={(lat, lng) => {
                                    handleSettingChange('school_latitude', lat);
                                    handleSettingChange('school_longitude', lng);
                                }}
                            />
                        </div>
                    </div>
                        <p className="text-xs text-muted-foreground">Click on the map to set the school's central location for attendance geo-fencing, or use the button to get your current position. Adjust the radius and click "Save All Settings".</p>
                </div>
            </CardContent>
        </Card>
    );
});

const WebsiteTabContent = memo(function WebsiteTabContent({ appSettings, handleSettingChange, handleNestedChange, imagePreviews, handleFileChange, iconNames }: any) {
    const whyUsPoints = Array.isArray(appSettings.homepage_why_us_points) ? appSettings.homepage_why_us_points : [];
    const teamMembers = Array.isArray(appSettings.team_members) ? appSettings.team_members : [];
    const admissionSteps = Array.isArray(appSettings.admissions_steps) ? appSettings.admissions_steps : [];
    const programImageFields: { key: keyof AppSettings, label: string }[] = [
        { key: 'program_creche_image_url', label: 'Creche & Nursery Program Image'},
        { key: 'program_kindergarten_image_url', label: 'Kindergarten Program Image'},
        { key: 'program_primary_image_url', label: 'Primary School Program Image'},
        { key: 'program_jhs_image_url', label: 'Junior High School Program Image'},
    ];
    
    return (
        <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Home /> Public Website Content</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <Tabs defaultValue="homepage" className="w-full"><TabsList><TabsTrigger value="homepage">Homepage</TabsTrigger><TabsTrigger value="about">About</TabsTrigger><TabsTrigger value="admissions">Admissions</TabsTrigger><TabsTrigger value="programs">Programs</TabsTrigger><TabsTrigger value="donate">Donate</TabsTrigger></TabsList>
                    <TabsContent value="homepage" className="pt-4">
                        <div><Label htmlFor="homepage_title">Homepage Main Title</Label><Input id="homepage_title" value={appSettings?.homepage_title ?? ''} onChange={(e) => handleSettingChange('homepage_title', e.target.value)}/></div>
                        <div className="mt-4"><Label htmlFor="homepage_subtitle">Homepage Subtitle</Label><Input id="homepage_subtitle" value={appSettings?.homepage_subtitle ?? ''} onChange={(e) => handleSettingChange('homepage_subtitle', e.target.value)}/></div>
                        <Separator className="my-4"/>
                        <h3 className="text-lg font-semibold">Hero Slideshow Images</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5].map(i => (<div key={i} className="space-y-2 border p-3 rounded-md"><Label htmlFor={`hero_image_file_${i}`} className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> Hero Image {i}</Label>{imagePreviews[`hero_${i}`] && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews[`hero_${i}`]!} alt={`Hero ${i} Preview`} width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school students"/></div>}<Input id={`hero_image_file_${i}`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, `hero_${i}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>))}</div>
                        <Separator className="my-4"/>
                        <h3 className="text-lg font-semibold">Welcome Section</h3><div><Label htmlFor="homepage_welcome_title">Welcome Title</Label><Input id="homepage_welcome_title" value={appSettings?.homepage_welcome_title ?? ''} onChange={(e) => handleSettingChange('homepage_welcome_title', e.target.value)}/></div><div className="mt-4"><Label htmlFor="homepage_welcome_message">Welcome Message</Label><Textarea id="homepage_welcome_message" value={appSettings?.homepage_welcome_message ?? ''} onChange={(e) => handleSettingChange('homepage_welcome_message', e.target.value)}/></div>
                        <div className="space-y-2 border p-3 rounded-md mt-4"><Label htmlFor="welcome_image_file" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> Welcome Image</Label>{imagePreviews.welcome && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews.welcome} alt="Welcome image preview" width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="person portrait"/></div>}<Input id="welcome_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'welcome')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>
                        <Separator className="my-4"/>
                        <h3 className="text-lg font-semibold">"Why Choose Us?" Section</h3><div><Label htmlFor="homepage_why_us_title">Section Title</Label><Input id="homepage_why_us_title" value={appSettings?.homepage_why_us_title ?? ''} onChange={(e) => handleSettingChange('homepage_why_us_title', e.target.value)}/></div>
                        {whyUsPoints.map((point: any, index: number) => (<div key={point.id} className="p-3 border rounded-lg space-y-3 relative mt-2"><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('homepage_why_us_points', whyUsPoints?.filter((p:any) => p.id !== point.id))}><Trash2 className="h-4 w-4"/></Button><div><Label>Feature Title</Label><Input value={point.title} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.title`, e.target.value)}/></div><div><Label>Feature Description</Label><Input value={point.description} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.description`, e.target.value)}/></div><div><Label>Feature Icon (from Lucide)</Label><select value={point.icon} onChange={(e) => handleNestedChange(`homepage_why_us_points.${index}.icon`, e.target.value)} className="w-full p-2 border rounded-md bg-background">{iconNames.map((iconName: string) => <option key={iconName} value={iconName}>{iconName}</option>)}</select></div></div>))}<Button variant="outline" className="mt-2" onClick={() => handleSettingChange('homepage_why_us_points', [...whyUsPoints, {id: `point_${Date.now()}`, title: 'New Feature', description: 'Description', icon: 'CheckCircle'}])}>Add "Why Us?" Point</Button>
                    </TabsContent>
                    <TabsContent value="about" className="pt-4 space-y-4">
                        <h3 className="text-lg font-semibold">About Page Content</h3><div><Label htmlFor="about_mission">Mission Statement</Label><Textarea id="about_mission" value={appSettings?.about_mission ?? ''} onChange={(e) => handleSettingChange('about_mission', e.target.value)}/></div><div><Label htmlFor="about_vision">Vision Statement</Label><Textarea id="about_vision" value={appSettings?.about_vision ?? ''} onChange={(e) => handleSettingChange('about_vision', e.target.value)}/></div>
                        <div className="space-y-2 border p-3 rounded-md"><Label htmlFor="about_image_file" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> About Page Main Image</Label>{imagePreviews.about && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews.about} alt="About image preview" width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="collaboration team"/></div>}<Input id="about_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'about')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>
                        <Separator className="my-4"/>
                        <h3 className="text-lg font-semibold">Team Members</h3>{teamMembers.map((member: any, index: number) => (<div key={member.id} className="p-3 border rounded-lg space-y-3 relative mt-2"><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('team_members', teamMembers.filter((m: any) => m.id !== member.id))}><Trash2 className="h-4 w-4"/></Button><div><Label>Member Name</Label><Input value={member.name} onChange={(e) => handleNestedChange(`team_members.${index}.name`, e.target.value)}/></div><div><Label>Member Role</Label><Input value={member.role} onChange={(e) => handleNestedChange(`team_members.${index}.role`, e.target.value)}/></div><div className="space-y-2"><Label htmlFor={`team_image_${member.id}`} className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> Member Photo</Label>{imagePreviews[`team.${member.id}`] && <div className="my-2 p-2 border rounded-md inline-block max-w-[150px]"><Image src={imagePreviews[`team.${member.id}`]!} alt={`${member.name} preview`} width={100} height={100} className="object-contain max-h-20 max-w-[100px]" data-ai-hint="person portrait"/></div>}<Input id={`team_image_${member.id}`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, `team.${member.id}`)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div></div>))}<Button variant="outline" className="mt-2" onClick={() => handleSettingChange('team_members', [...teamMembers, {id: `member_${Date.now()}`, name: 'New Member', role: 'Role', imageUrl: ''}])}>Add Team Member</Button>
                    </TabsContent>
                    <TabsContent value="admissions" className="pt-4 space-y-4">
                        <h3 className="text-lg font-semibold">Admissions Page Content</h3><div><Label htmlFor="admissions_intro">Introductory Text</Label><Textarea id="admissions_intro" value={appSettings?.admissions_intro ?? ''} onChange={(e) => handleSettingChange('admissions_intro', e.target.value)}/></div>
                        <div className="space-y-2 border p-3 rounded-md"><Label htmlFor="admissions_pdf_file" className="flex items-center"><FileText className="mr-2 h-4 w-4" /> Admission Form PDF (Optional)</Label>{appSettings.admissions_pdf_url && <p className="text-xs text-muted-foreground">Current file: <a href={appSettings.admissions_pdf_url} className="text-accent underline" target="_blank" rel="noopener noreferrer">{appSettings.admissions_pdf_url.split('/').pop()}</a></p>}<Input id="admissions_pdf_file" type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'admissions_pdf')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>
                        <Separator className="my-4"/>
                        <h3 className="text-lg font-semibold">Admission Steps</h3>{admissionSteps.map((step: any, index: number) => (<div key={step.id} className="p-3 border rounded-lg space-y-3 relative mt-2"><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => handleSettingChange('admissions_steps', admissionSteps.filter((s: any) => s.id !== step.id))}><Trash2 className="h-4 w-4"/></Button><div><Label>Step Title</Label><Input value={step.title} onChange={(e) => handleNestedChange(`admissions_steps.${index}.title`, e.target.value)}/></div><div><Label>Step Description</Label><Input value={step.description} onChange={(e) => handleNestedChange(`admissions_steps.${index}.description`, e.target.value)}/></div><div><Label>Step Icon (from Lucide)</Label><select value={step.icon} onChange={(e) => handleNestedChange(`admissions_steps.${index}.icon`, e.target.value)} className="w-full p-2 border rounded-md bg-background">{iconNames.map((iconName: string) => <option key={iconName} value={iconName}>{iconName}</option>)}</select></div></div>))}<Button variant="outline" className="mt-2" onClick={() => handleSettingChange('admissions_steps', [...admissionSteps, {id: `step_${Date.now()}`, title: 'New Step', description: 'Description', icon: 'CheckSquare'}])}>Add Admission Step</Button>
                    </TabsContent>
                    <TabsContent value="programs" className="pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">Programs Page Content</h3>
                            <div>
                                <Label htmlFor="programs_intro">Introductory Text</Label>
                                <Textarea id="programs_intro" value={appSettings?.programs_intro ?? ''} onChange={(e) => handleSettingChange('programs_intro', e.target.value)}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{programImageFields.map(({key, label}) => (<div key={key} className="space-y-2 border p-3 rounded-md"><Label htmlFor={`${key}_file`} className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4"/> {label}</Label>{imagePreviews[key.replace('_image_url', '')] && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews[key.replace('_image_url', '')]!} alt={`${label} preview`} width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school students"/></div>}<Input id={`${key}_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(e, key.replace('_image_url', ''))} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>))}</div>
                    </TabsContent>
                    <TabsContent value="donate" className="pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">Donate Page Content</h3><div className="space-y-2 border p-3 rounded-md"><Label htmlFor="donate_image_file" className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4" /> Main Image for Donate Page</Label>{imagePreviews.donate && <div className="my-2 p-2 border rounded-md inline-block max-w-[200px]"><Image src={imagePreviews.donate} alt="Donate image preview" width={150} height={150} className="object-contain max-h-20 max-w-[150px]" data-ai-hint="community charity"/></div>}<Input id="donate_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'donate')} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
});

const ThemeTabContent = memo(function ThemeTabContent({ appSettings, handleSettingChange, handleResetColors }: any) {
    return (
        <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Palette /> Color Scheme</CardTitle><CardDescription>Customize the application's main colors. Changes will apply site-wide after saving.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label htmlFor="color_primary">Primary Color</Label><Input id="color_primary" type="color" className="h-10 p-1" value={hslStringToHex(appSettings.color_primary || '0 0% 0%')} onChange={(e) => handleSettingChange('color_primary', hexToHslString(e.target.value))}/></div>
                    <div><Label htmlFor="color_accent">Accent Color</Label><Input id="color_accent" type="color" className="h-10 p-1" value={hslStringToHex(appSettings.color_accent || '0 0% 0%')} onChange={(e) => handleSettingChange('color_accent', hexToHslString(e.target.value))}/></div>
                    <div><Label htmlFor="color_background">Background Color</Label><Input id="color_background" type="color" className="h-10 p-1" value={hslStringToHex(appSettings.color_background || '0 0% 100%')} onChange={(e) => handleSettingChange('color_background', hexToHslString(e.target.value))}/></div>
                </div>
                <div className="pt-2">
                    <Button variant="outline" onClick={handleResetColors}><RotateCcw className="mr-2 h-4 w-4"/> Reset to Default Colors</Button>
                </div>
            </CardContent>
        </Card>
    );
});

const ApiTabContent = memo(function ApiTabContent({ appSettings, handleSettingChange }: any) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary/90"><KeyRound /> API Keys</CardTitle>
                <CardDescription>Manage API keys for third-party services. Keys set here will be used by the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="google_api_key" className="flex items-center"><Sparkles className="mr-2 h-4 w-4 text-blue-500" /> Google AI API Key</Label>
                    <Input id="google_api_key" type="password" value={appSettings?.google_api_key ?? ''} onChange={(e) => handleSettingChange('google_api_key', e.target.value)} placeholder="Enter your Google AI API Key"/>
                    <p className="text-xs text-muted-foreground">Used for the AI Lesson Planner feature.</p>
                </div>
                    <Separator/>
                    <div className="space-y-2">
                    <Label htmlFor="resend_api_key" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-red-500" /> Resend API Key</Label>
                    <Input id="resend_api_key" type="password" value={appSettings?.resend_api_key ?? ''} onChange={(e) => {
                        console.log('🔍 Resend API key changed:', e.target.value ? '[REDACTED]' : 'empty');
                        console.log('🔍 Current appSettings.resend_api_key:', appSettings?.resend_api_key ? '[REDACTED]' : 'empty/null');
                        handleSettingChange('resend_api_key', e.target.value);
                    }} placeholder="Enter your Resend API Key"/>
                    <p className="text-xs text-muted-foreground">Used for sending announcement emails.</p>
                </div>
                    <div className="space-y-2">
                    <Label htmlFor="from_email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-blue-500" /> From Email Address</Label>
                    <Input id="from_email" type="email" value={appSettings?.from_email ?? ''} onChange={(e) => handleSettingChange('from_email', e.target.value)} placeholder="Enter your verified from email address"/>
                    <p className="text-xs text-muted-foreground">This email address must be verified with Resend and match your domain.</p>
                </div>
                    <Separator/>
                    <div className="space-y-4">
                    <h4 className="font-medium flex items-center"><MessageSquare className="mr-2 h-4 w-4 text-green-500"/> Twilio SMS Settings</h4>
                    <div className="space-y-2">
                        <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
                        <Input id="twilio_account_sid" type="password" value={appSettings?.twilio_account_sid ?? ''} onChange={(e) => handleSettingChange('twilio_account_sid', e.target.value)} placeholder="Enter your Twilio Account SID"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="twilio_auth_token">Twilio Auth Token</Label>
                        <Input id="twilio_auth_token" type="password" value={appSettings?.twilio_auth_token ?? ''} onChange={(e) => handleSettingChange('twilio_auth_token', e.target.value)} placeholder="Enter your Twilio Auth Token"/>
                    </div>
                        <div className="space-y-2">
                        <Label htmlFor="twilio_messaging_service_sid" className="flex items-center"><Hash className="mr-2 h-4 w-4"/>Twilio Messaging Service SID (Recommended)</Label>
                        <Input id="twilio_messaging_service_sid" value={appSettings?.twilio_messaging_service_sid ?? ''} onChange={(e) => handleSettingChange('twilio_messaging_service_sid', e.target.value)} placeholder="Enter your Messaging Service SID (MG...)"/>
                        <p className="text-xs text-muted-foreground">This is the recommended method for reliable delivery across all networks.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="twilio_phone_number" className="flex items-center"><Phone className="mr-2 h-4 w-4"/>Fallback Twilio Phone Number / Alphanumeric ID</Label>
                        <Input id="twilio_phone_number" value={appSettings?.twilio_phone_number ?? ''} onChange={(e) => handleSettingChange('twilio_phone_number', e.target.value)} placeholder="Enter your Twilio number or Sender ID"/>
                        <p className="text-xs text-muted-foreground">This is used only if a Messaging Service SID is not provided.</p>
                    </div>
                    <div className="mt-4">
                        <Button id="validate_credentials_btn" variant="outline" onClick={async () => {
                            try {
                                const res = await fetch('/api/admin/validate-credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: appSettings?.id ?? null }) });
                                const json = await res.json();
                                if (!json.success) throw new Error(json.error || 'Validation failed');
                                const { result } = json;
                                // show toast with concise message
                                alert(`Twilio: ${result.twilio.ok ? 'OK' : 'FAIL'} - ${result.twilio.message || ''}\nResend: ${result.resend.ok ? 'OK' : 'FAIL'} - ${result.resend.message || ''}`);
                            } catch (e: any) {
                                alert('Credential validation failed: ' + (e?.message || String(e)));
                            }
                        }}>
                            Validate Credentials
                        </Button>
                    </div>
                    </div>
                    <Separator/>
                    <div className="space-y-4">
                    <h4 className="font-medium flex items-center"><HandHeart className="mr-2 h-4 w-4 text-purple-500"/> Payment Gateway Settings</h4>
                    <p className="text-sm text-muted-foreground">Configure your payment gateway credentials for student fee collection. These settings apply to your school specifically.</p>
                    
                    <div className="space-y-4">
                        <h5 className="text-sm font-medium text-gray-700">Paystack Configuration</h5>
                        <div className="space-y-2">
                            <Label htmlFor="paystack_public_key">Paystack Public Key</Label>
                            <Input 
                                id="paystack_public_key" 
                                value={appSettings?.paystack_public_key ?? ''} 
                                onChange={(e) => handleSettingChange('paystack_public_key', e.target.value)} 
                                placeholder="pk_test_..."
                            />
                            <p className="text-xs text-muted-foreground">Your Paystack public key for processing local payments.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paystack_secret_key">Paystack Secret Key</Label>
                            <Input 
                                id="paystack_secret_key" 
                                type="password" 
                                value={appSettings?.paystack_secret_key ?? ''} 
                                onChange={(e) => handleSettingChange('paystack_secret_key', e.target.value)} 
                                placeholder="sk_test_..."
                            />
                            <p className="text-xs text-muted-foreground">Your Paystack secret key (kept secure).</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paystack_subaccount_code">Paystack Subaccount Code (Optional)</Label>
                            <Input 
                                id="paystack_subaccount_code" 
                                value={appSettings?.paystack_subaccount_code ?? ''} 
                                onChange={(e) => handleSettingChange('paystack_subaccount_code', e.target.value)} 
                                placeholder="ACCT_..."
                            />
                            <p className="text-xs text-muted-foreground">Optional subaccount code for payment routing.</p>
                        </div>
                    </div>



                    <div className="space-y-4">
                        <h5 className="text-sm font-medium text-gray-700">Payment Gateway Settings</h5>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                                <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                    <p className="font-medium text-green-800">Paystack Payment Gateway</p>
                                    <p className="text-green-700 mt-1">
                                        All payments are processed securely through Paystack, supporting both local African currencies and international USD payments.
                                    </p>
                                    <p className="text-green-700 mt-1">
                                        Students from anywhere in the world can make payments in their preferred currency.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="auto_split_enabled"
                                checked={appSettings?.auto_split_enabled ?? true}
                                onCheckedChange={(checked) => handleSettingChange('auto_split_enabled', checked)}
                            />
                            <Label htmlFor="auto_split_enabled" className="text-sm">Enable automatic platform fee collection</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">When enabled, platform fees (2%) are automatically deducted from payments.</p>
                    </div>
                    </div>
                    <Separator/>
                    <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Environment Variable Fallback</AlertTitle>
                    <AlertDescription>
                        If any key is left blank here, the system will attempt to use the corresponding variable from your project's `.env` file.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
});

const NotificationsTabContent = memo(function NotificationsTabContent({ appSettings, handleSettingChange }: any) {
    return (
        <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Control system-wide email and SMS notifications for announcements, payment confirmations, admission approvals, assignment alerts, result approvals, and other school activities.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} />
                    <div className="flex-1">
                        <Label htmlFor="enable_email_notifications" className="font-normal cursor-pointer flex items-center gap-2"><Mail className="h-4 w-4"/> Enable Email Notifications</Label>
                        <p className="text-xs text-muted-foreground mt-1">Controls email notifications for announcements and other communications</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox id="enable_sms_notifications" checked={appSettings.enable_sms_notifications} onCheckedChange={(checked) => handleSettingChange('enable_sms_notifications', !!checked)} />
                    <div className="flex-1">
                        <Label htmlFor="enable_sms_notifications" className="font-normal cursor-pointer flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Enable SMS Notifications</Label>
                        <p className="text-xs text-muted-foreground mt-1">Controls SMS notifications for payments, admissions, assignments, results, announcements, and arrears</p>
                    </div>
                </div>
                <Separator/>
                <div>
                    <Label htmlFor="email_footer_signature">Default Email Footer</Label>
                    <Textarea id="email_footer_signature" value={appSettings?.email_footer_signature ?? ''} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} />
                </div>
            </CardContent>
        </Card>
    );
});

const AcademicTabContent = memo(function AcademicTabContent({ appSettings, handleSettingChange }: any) {
    return (
        <Card className="shadow-lg"><CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year</CardTitle><CardDescription>Configure the current academic year.</CardDescription></CardHeader>
            <CardContent>
                <div><Label htmlFor="current_academic_year">Current Academic Year</Label><Input id="current_academic_year" value={appSettings?.current_academic_year ?? ''} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" /></div>
                <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                    <h4 className="text-destructive font-semibold">End-of-Year Process</h4>
                    <div className="text-destructive/90 text-sm">
                        This action is irreversible. It will:
                        <ul className="list-disc list-inside pl-4 mt-2"><li>Calculate outstanding fees for all students for the current academic year and log them as arrears for the next year.</li><li>Promote all students to their next grade level (e.g., Basic 1 to Basic 2).</li></ul>
                    </div>
                    <p className="text-destructive/90 text-sm mt-2">This process is triggered automatically when you change the academic year and click "Save All Settings".</p>
                </div>
            </CardContent>
        </Card>
    );
});

const NewsTabContent = memo(function NewsTabContent({
    newsPosts,
    isNewsLoading,
    handleOpenNewsForm,
    handleDeleteNewsPost,
    isDeletingNews
}: any) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle className="flex items-center text-xl text-primary/90"><Megaphone/> Public News Management</CardTitle>
                        <CardDescription>Create, edit, and delete news posts for the public website.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenNewsForm()} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/>Create News Post</Button>
                </div>
            </CardHeader>
            <CardContent>
                {isNewsLoading ? (<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>)
                : newsPosts.length === 0 ? (<p className="text-muted-foreground text-center py-4">No news posts found.</p>)
                : (<div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">{newsPosts.map((post: NewsPost) => (
                    <Card key={post.id} className="flex flex-col sm:flex-row items-start gap-4 p-3">
                        {post.image_url && <Image src={post.image_url} alt={post.title} width={128} height={128} className="w-full sm:w-32 h-32 object-cover rounded-md"/>}
                        <div className="flex-grow"><h4 className="font-semibold">{post.title}</h4><p className="text-xs text-muted-foreground">By {post.author_name || 'Admin'} on {format(new Date(post.published_at), "PPP")}</p><p className="text-sm mt-1 line-clamp-2">{post.content}</p></div>
                        <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0"><Button variant="outline" size="sm" onClick={() => handleOpenNewsForm(post)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => handleDeleteNewsPost(post.id)} disabled={isDeletingNews}>Delete</Button></div>
                    </Card>
                ))}</div>)}
            </CardContent>
        </Card>
    );
});


export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [originalAcademicYear, setOriginalAcademicYear] = useState<string>("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({});
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [isNewsFormOpen, setIsNewsFormOpen] = useState(false);
  const [isDeletingNews, setIsDeletingNews] = useState(false);
  const [currentNewsPost, setCurrentNewsPost] = useState<Partial<NewsPost> | null>(null);
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);

    const [iconNames, setIconNames] = useState<string[] | null>(null);
    const [isDirty, setIsDirty] = useState(false);

  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }

  useEffect(() => {
    isMounted.current = true;
    
    const fetchAllData = async () => {
        if (!isMounted.current) return;
        setIsLoadingSettings(true);
        setIsNewsLoading(true);
        setLoadingError(null);

        if (!currentUser) {
            if (isMounted.current) {
                setLoadingError("You must be logged in as an admin to manage settings.");
                setIsLoadingSettings(false);
                setIsNewsLoading(false);
            }
            return;
        }

        try {
            const settingsResult = await getSchoolSettings();
            if (settingsResult.error) {
                throw new Error(settingsResult.error);
            }
            const settingsData = settingsResult.data;
            
            // Debug logging
            console.log('🔍 Settings fetch result:', {
                settingsData,
                hasData: !!settingsData,
                isDirty,
                currentUser: currentUser?.id
            });

            const newsData = await getNewsPosts();

            const settings = { ...defaultAppSettings, ...(settingsData || {}) };
            
            // Debug merged settings
            console.log('🔍 Merged settings:', {
                merged: settings,
                defaultKeys: Object.keys(defaultAppSettings),
                dataKeys: settingsData ? Object.keys(settingsData) : []
            });
            
            if (isMounted.current) {
                // If admin has local unsaved edits, do not overwrite appSettings on background fetch
                if (!isDirty) {
                    setAppSettings(settings as AppSettings);
                    setIsDirty(false); // Reset dirty flag after successful load
                    console.log('✅ Settings applied to form');
                } else {
                    console.info('⚠️ Admin settings fetch skipped because local edits are present (isDirty=true).');
                }
                setOriginalAcademicYear(settings.current_academic_year);
                setNewsPosts(newsData || []);
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
            console.error("AdminSettingsPage: Error loading data:", error);
            if (isMounted.current) setLoadingError(`Could not load settings or news. Error: ${error.message}`);
        } finally {
            if (isMounted.current) {
                setIsLoadingSettings(false);
                setIsNewsLoading(false);
            }
        }
    };

    fetchAllData();

    return () => {
      isMounted.current = false;
      Object.values(imagePreviews).forEach(url => {
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url!);
      });
      if (newsImagePreview && newsImagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(newsImagePreview);
      }
    };
  }, []); // Removed currentUser dependency to prevent reloads on auth changes

  // Separate effect to handle initial load only when user is first available
  useEffect(() => {
    if (currentUser && isMounted.current && !appSettings) {
      // Only fetch if we don't already have settings loaded
      // This prevents constant reloading while preserving initial load
    }
  }, [currentUser, appSettings]);

  const handleTabChange = async (value: string) => {
    if (value === 'website' && iconNames === null) {
      const icons = await import('lucide-react');
      setIconNames(Object.keys(icons).filter(k => typeof (icons as any)[k] === 'object'));
    }
  };

  const handleSettingChange = (field: keyof Omit<AppSettings, 'id'>, value: any) => {
    setAppSettings((prev) => (prev ? { ...prev, [field]: value } : null));
    setIsDirty(true);
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
                    current[key] = nextKeyIsIndex ? [] : {}; 
                }
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        return newState;
    });
    setIsDirty(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, key: string) => {
    const file = event.target.files?.[0];
    if (imagePreviews[key] && imagePreviews[key]?.startsWith('blob:')) URL.revokeObjectURL(imagePreviews[key]!);
    setImageFiles(prev => ({...prev, [key]: file || null}));
    setImagePreviews(prev => ({...prev, [key]: file ? URL.createObjectURL(file) : null}));
        // Persist a small preview + metadata to localStorage so a partially-selected image isn't lost
        try {
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const payload = { name: file.name, type: file.type, dataUrl: reader.result };
                        const userId = currentUser?.id ?? 'anon';
                        localStorage.setItem(`school-image-draft:${userId}:${key}`, JSON.stringify(payload));
                    } catch (e) { /* ignore */ }
                };
                reader.readAsDataURL(file);
            } else {
                const userId = currentUser?.id ?? 'anon';
                localStorage.removeItem(`school-image-draft:${userId}:${key}`);
            }
        } catch (e) {
            // ignore persistence errors
        }
  };

    // Restore any saved image drafts for the current admin user when settings load
    useEffect(() => {
        if (!currentUser || !appSettings) return;
        const userId = currentUser.id;
        const keysToCheck = ['logo', 'welcome', 'about', 'donate'];
        for (let i = 1; i <= 5; i++) keysToCheck.push(`hero_${i}`);
        // include program images and other known keys
        ['program_creche', 'program_kindergarten', 'program_primary', 'program_jhs'].forEach(k => keysToCheck.push(k));

        // team members are dynamic; restore drafts for existing member ids
        if (Array.isArray(appSettings.team_members)) {
            appSettings.team_members.forEach((m: any) => {
                keysToCheck.push(`team.${m.id}`);
            });
        }

        keysToCheck.forEach((key) => {
            try {
                const raw = localStorage.getItem(`school-image-draft:${userId}:${key}`);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (!parsed?.dataUrl) return;
                // set preview if not already set
                setImagePreviews(prev => ({ ...prev, [key]: parsed.dataUrl }));
                // rebuild File object from dataUrl so the save flow can upload it
                try {
                    const matches = String(parsed.dataUrl).match(/^data:(.+);base64,(.*)$/);
                    if (matches) {
                        const mime = matches[1];
                        const b64 = matches[2];
                        const byteChars = atob(b64);
                        const byteNumbers = new Array(byteChars.length);
                        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                        const byteArray = new Uint8Array(byteNumbers);
                        const reconstructed = new File([byteArray], parsed.name || `${key}.png`, { type: mime });
                        setImageFiles(prev => ({ ...prev, [key]: reconstructed }));
                    }
                } catch (e) {
                    // ignore reconstruct errors
                }
            } catch (e) { /* ignore */ }
        });
    }, [currentUser, appSettings]);
  
  const uploadFile = async (file: File, context: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);
    
    const result = await uploadSchoolAsset(formData);
    if(result.success) {
        return result.url ?? null;
    } else {
        toast({ title: "Upload Failed", description: result.message, variant: "destructive" });
        return null;
    }
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation Not Supported", description: "Your browser does not support location services.", variant: "destructive" });
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (isMounted.current) {
          handleSettingChange('school_latitude', latitude);
          handleSettingChange('school_longitude', longitude);
          toast({ title: "Location Captured!", description: `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}. Click 'Save All Settings' to apply.` });
          setIsFetchingLocation(false);
        }
      },
      (error) => {
                let message = "Could not get your location. ";
                // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
                switch (error.code) {
                    case 1: message += "You denied the request for Geolocation."; break;
                    case 2: message += "Location information is unavailable."; break;
                    case 3: message += "The request to get user location timed out."; break;
                    default: message += "An unknown error occurred."; break;
                }
        toast({ title: "Location Error", description: message, variant: "destructive" });
        if (isMounted.current) {
          setIsFetchingLocation(false);
        }
      },
      { enableHighAccuracy: true, timeout: 100000, maximumAge: 0 }
    );
  };
  
  const proceedWithSave = async () => {
    if (!currentUser || !appSettings) return;
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
    const result = await saveSchoolSettings(updatedSettingsToSave, appSettings.id);
      if(!result.success) throw new Error(result.message);
      
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
      
      if (isMounted.current && result.data) {
          const newSettings = result.data as AppSettings;
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

    const resetLocalChanges = async () => {
        if (!currentUser) return;
        setIsLoadingSettings(true);
        try {
            const settingsResult = await getSchoolSettings();
            if (settingsResult.error) throw new Error(settingsResult.error);
            const settingsData = settingsResult.data;
            const settings = { ...defaultAppSettings, ...(settingsData || {}) };
            if (isMounted.current) {
                setAppSettings(settings as AppSettings);
                setIsDirty(false);
                toast({ title: 'Local changes discarded', description: 'Settings reloaded from server.' });
            }
        } catch (e:any) {
            toast({ title: 'Could not reset changes', description: e?.message || String(e), variant: 'destructive' });
        } finally {
            if (isMounted.current) setIsLoadingSettings(false);
        }
    };

  const handleResetColors = () => {
    if (!appSettings) return;
    setAppSettings({
      ...appSettings,
      color_primary: defaultAppSettings.color_primary,
      color_accent: defaultAppSettings.color_accent,
      color_background: defaultAppSettings.color_background,
    });
    toast({ title: "Colors Reset", description: "Default color theme restored. Click 'Save All Settings' to apply." });
  };

  // --- News Management Functions ---
  const handleOpenNewsForm = (post?: NewsPost) => {
    if (post) {
        setCurrentNewsPost(post);
        setNewsImagePreview(post.image_url);
    } else {
        setCurrentNewsPost({ title: '', content: '' });
        setNewsImagePreview(null);
    }
    setNewsImageFile(null);
    setIsNewsFormOpen(true);
  };

  const handleNewsImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (newsImagePreview && newsImagePreview.startsWith('blob:')) URL.revokeObjectURL(newsImagePreview);
    setNewsImageFile(file || null);
    setNewsImagePreview(file ? URL.createObjectURL(file) : (currentNewsPost?.image_url || null));
  };
  
  const handleSaveNewsPost = async () => {
    if (!currentUser || !currentNewsPost || !appSettings?.id) return;
    setIsSaving(true);
    let imageUrl = currentNewsPost.image_url || null;

    if (newsImageFile) {
        imageUrl = await uploadFile(newsImageFile, 'news-images');
        if (!imageUrl) {
            setIsSaving(false);
            return;
        }
    }

    const payload = {
        id: currentNewsPost.id,
        school_id: appSettings.id,
        title: currentNewsPost.title,
        content: currentNewsPost.content,
        image_url: imageUrl,
    };

    try {
        const savedPost = await saveNewsPost(payload);
        if (isMounted.current && savedPost) {
            setNewsPosts(prev => {
                const existing = prev.find(p => p.id === savedPost!.id);
                if (existing) return prev.map(p => p.id === savedPost!.id ? savedPost! : p).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
                return [savedPost!, ...prev].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
            });
        }
        toast({ title: "Success", description: "News post saved." });
        setIsNewsFormOpen(false);
    } catch (error: any) {
        toast({ title: "Error Saving News", description: error.message, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsSaving(false);
    }
  };
  
  const handleDeleteNewsPost = async (postId: string) => {
    setIsDeletingNews(true);
    try {
        const result = await deleteNewsPost(postId);
        if (!result.success) throw new Error(result.message);
        toast({ title: "Success", description: "News post deleted." });
        setNewsPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error: any) {
        toast({ title: "Error Deleting News", description: error.message, variant: "destructive" });
    } finally {
        setIsDeletingNews(false);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System & App Settings</h2>
      </div>
     
               
      <Tabs defaultValue="general" className="w-full" onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>
        </div>
        <TabsContent value="general" className="mt-6">
            <GeneralTabContent 
                appSettings={appSettings} 
                handleSettingChange={handleSettingChange} 
                imagePreviews={imagePreviews} 
                handleFileChange={handleFileChange} 
                handleSetLocation={handleSetLocation} 
                isFetchingLocation={isFetchingLocation} 
            />
        </TabsContent>
        <TabsContent value="website" className="mt-6">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            {iconNames ? (
              <WebsiteTabContent 
                  appSettings={appSettings} 
                  handleSettingChange={handleSettingChange} 
                  handleNestedChange={handleNestedChange} 
                  imagePreviews={imagePreviews} 
                  handleFileChange={handleFileChange} 
                  iconNames={iconNames} 
              />
            ) : (
               <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
            )}
          </Suspense>
        </TabsContent>
        <TabsContent value="theme" className="mt-6">
            <ThemeTabContent 
                appSettings={appSettings} 
                handleSettingChange={handleSettingChange} 
                handleResetColors={handleResetColors} 
            />
        </TabsContent>
        <TabsContent value="api" className="mt-6">
            <ApiTabContent 
                appSettings={appSettings} 
                handleSettingChange={handleSettingChange} 
            />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
            <NotificationsTabContent 
                appSettings={appSettings} 
                handleSettingChange={handleSettingChange} 
            />
        </TabsContent>
        <TabsContent value="academic" className="mt-6">
            <AcademicTabContent 
                appSettings={appSettings} 
                handleSettingChange={handleSettingChange} 
            />
        </TabsContent>
        <TabsContent value="news" className="mt-6">
            <NewsTabContent 
                newsPosts={newsPosts} 
                isNewsLoading={isNewsLoading} 
                handleOpenNewsForm={handleOpenNewsForm} 
                handleDeleteNewsPost={handleDeleteNewsPost} 
                isDeletingNews={isDeletingNews} 
            />
        </TabsContent>
      </Tabs>
      
            <div className="flex justify-end pt-4 space-x-2">
                    {isDirty ? (
                        <Button variant="ghost" onClick={resetLocalChanges} disabled={!currentUser || isLoadingSettings}>Discard Changes</Button>
                    ) : null}
                    <Button onClick={handleSaveClick} disabled={!currentUser || isSaving} size="lg">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save All Settings</Button>
            </div>

       <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Academic Year Change</AlertDialogTitle>
                <div className="space-y-2 py-2"><AlertDialogDescription>You are about to change the academic year from{' '}<strong>{originalAcademicYear}</strong> to{' '}<strong>{appSettings.current_academic_year}</strong>. This action is significant and will trigger the following automated processes:</AlertDialogDescription>
                    <div className="text-sm text-muted-foreground pl-4 space-y-1">
                      <ul className="list-disc list-inside">
                        <li>All student balances for {originalAcademicYear} will be calculated, and any outstanding amounts will be logged as arrears.</li>
                        <li>All students will be promoted to their next grade level.</li>
                      </ul>
                    </div>
                    <AlertDialogDescription>This action cannot be easily undone. Are you sure you want to proceed?</AlertDialogDescription>
                </div></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => {setIsConfirmDialogOpen(false); proceedWithSave();}} className="bg-destructive hover:bg-destructive/90">Yes, Proceed</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNewsFormOpen} onOpenChange={setIsNewsFormOpen}>
        <DialogContent className="sm:max-w-[625px] flex flex-col max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{currentNewsPost?.id ? 'Edit' : 'Create'} News Post</DialogTitle>
                <DialogDescription>Fill in the details for your public news article.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 flex-grow overflow-y-auto pr-3">
                <div><Label htmlFor="news-title">Title</Label><Input id="news-title" value={currentNewsPost?.title || ''} onChange={(e) => setCurrentNewsPost(prev => ({...prev, title: e.target.value}))}/></div>
                <div><Label htmlFor="news-content">Content</Label><Textarea id="news-content" value={currentNewsPost?.content || ''} onChange={(e) => setCurrentNewsPost(prev => ({...prev, content: e.target.value}))} rows={8}/></div>
                <div>
                    <Label htmlFor="news-image">Image (Optional)</Label>
                    {newsImagePreview && <div className="mt-2"><Image src={newsImagePreview} alt="News preview" width={200} height={100} className="rounded-md object-cover"/></div>}
                    <Input id="news-image" type="file" accept="image/*" onChange={handleNewsImageChange}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewsFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveNewsPost} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Save Post
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
