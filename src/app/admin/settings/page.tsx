
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, AlertTriangle, BookOpen, Contact, Home, ClipboardList, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSupabase } from '@/lib/supabaseClient';
import type { User, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { GRADE_LEVELS } from '@/lib/constants';
import { revalidateWebsitePages } from '@/lib/actions/revalidate.actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AppSettings {
  id?: number;
  current_academic_year: string;
  school_name: string;
  school_slogan: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  school_hero_image_url: string;
  about_history_image_url: string;
  about_leader1_image_url: string;
  about_leader2_image_url: string;
  about_leader3_image_url: string;
  enable_email_notifications: boolean;
  email_footer_signature: string;
  about_history_mission: string;
  about_vision: string;
  about_core_values: string;
  admissions_step1_desc: string;
  admissions_step2_desc: string;
  admissions_step3_desc: string;
  admissions_step4_desc: string;
  admissions_tuition_info: string;
  program_creche_desc: string;
  program_kindergarten_desc: string;
  program_primary_desc: string;
  program_jhs_desc: string;
  program_extracurricular_desc: string;
  program_science_tech_desc: string;
  updated_at?: string;
}

const defaultAppSettings: AppSettings = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "St. Joseph's Montessori",
  school_slogan: "A tradition of excellence, a future of innovation.",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@stjosephmontessori.edu.gh",
  school_logo_url: "",
  school_hero_image_url: "",
  about_history_image_url: "",
  about_leader1_image_url: "",
  about_leader2_image_url: "",
  about_leader3_image_url: "",
  enable_email_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  about_history_mission: "Founded on the principles of academic rigor and holistic development, St. Joseph's Montessori has been a cornerstone of the community for decades. Our journey began with a simple yet powerful vision: to create a learning environment where every child feels valued, challenged, and inspired to reach their full potential. Our mission is to provide a comprehensive education that nurtures intellectual curiosity, fosters critical thinking, and instills strong moral character. We are committed to preparing our students not just for the next stage of their education, but for a lifetime of success and meaningful contribution to society.",
  about_vision: "To be a leading educational institution recognized for empowering students with the knowledge, skills, and values to thrive in a dynamic world.",
  about_core_values: "Integrity & Respect\nExcellence in Teaching & Learning\nCommunity & Collaboration\nInnovation & Adaptability",
  admissions_step1_desc: "Complete and submit the online application form or download the PDF version.",
  admissions_step2_desc: "Provide required documents such as past academic records and birth certificate.",
  admissions_step3_desc: "Prospective students may be required to take an age-appropriate assessment.",
  admissions_step4_desc: "Successful candidates will receive an official admission offer from the school.",
  admissions_tuition_info: "We strive to provide excellent education at an affordable cost. Our fee structure is transparent and covers all core academic expenses. For a detailed breakdown of fees for your child's specific grade level, please contact our admissions office.",
  program_creche_desc: "Our early childhood program focuses on creating a safe, stimulating, and caring environment. We use a play-based approach to develop social skills, emotional growth, and a love for learning in our youngest students.",
  program_kindergarten_desc: "The kindergarten curriculum builds on foundational skills with a focus on literacy, numeracy, and critical thinking. We encourage curiosity and creativity through hands-on activities and projects.",
  program_primary_desc: "Our primary school program offers a balanced and comprehensive curriculum covering core subjects like Mathematics, English, Science, and Social Studies, alongside creative arts and physical education.",
  program_jhs_desc: "The JHS program prepares students for their future academic careers with a rigorous curriculum designed to meet national standards. We focus on academic excellence, character development, and leadership skills.",
  program_extracurricular_desc: "We believe in holistic development. We offer a wide range of activities such as sports, debate, coding club, and music, allowing students to explore their passions beyond the classroom.",
  program_science_tech_desc: "With modern science and ICT labs, we emphasize practical, hands-on learning to prepare students for a technology-driven world. Students engage in experiments, coding, and digital literacy programs.",
};

const SUPABASE_STORAGE_BUCKET = 'school-assets';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const isMounted = useRef(true);

  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedHeroFile, setSelectedHeroFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [selectedAboutHistoryFile, setSelectedAboutHistoryFile] = useState<File | null>(null);
  const [aboutHistoryPreviewUrl, setAboutHistoryPreviewUrl] = useState<string | null>(null);

  const [selectedLeader1File, setSelectedLeader1File] = useState<File | null>(null);
  const [leader1PreviewUrl, setLeader1PreviewUrl] = useState<string | null>(null);
  const [selectedLeader2File, setSelectedLeader2File] = useState<File | null>(null);
  const [leader2PreviewUrl, setLeader2PreviewUrl] = useState<string | null>(null);
  const [selectedLeader3File, setSelectedLeader3File] = useState<File | null>(null);
  const [leader3PreviewUrl, setLeader3PreviewUrl] = useState<string | null>(null);


  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [isPromotionConfirmOpen, setIsPromotionConfirmOpen] = useState(false);
  const [pendingNewAcademicYear, setPendingNewAcademicYear] = useState<string | null>(null);
  const [oldAcademicYearForPromotion, setOldAcademicYearForPromotion] = useState<string | null>(null);
  const [isPromotionDialogActionBusy, setIsPromotionDialogActionBusy] = useState(false);


  useEffect(() => {
    isMounted.current = true;
    try {
      supabaseRef.current = getSupabase();
    } catch (initError: any) {
      if (isMounted.current) {
        setLoadingError("Failed to connect to the database. Settings cannot be loaded or saved.");
        setIsLoadingSettings(false);
      }
      return;
    }

    const fetchCurrentUserAndSettings = async () => {
      if (!isMounted.current || !supabaseRef.current) return;
      setIsLoadingSettings(true);
      setLoadingError(null);

      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (isMounted.current) {
        setCurrentUser(session?.user || null);
      }

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
        if (data) {
          if (isMounted.current) {
            const mergedSettings = { ...defaultAppSettings, ...data } as AppSettings;
            setAppSettings(mergedSettings);
            if (mergedSettings.school_logo_url) setLogoPreviewUrl(mergedSettings.school_logo_url);
            if (mergedSettings.school_hero_image_url) setHeroPreviewUrl(mergedSettings.school_hero_image_url);
            if (mergedSettings.about_history_image_url) setAboutHistoryPreviewUrl(mergedSettings.about_history_image_url);
            if (mergedSettings.about_leader1_image_url) setLeader1PreviewUrl(mergedSettings.about_leader1_image_url);
            if (mergedSettings.about_leader2_image_url) setLeader2PreviewUrl(mergedSettings.about_leader2_image_url);
            if (mergedSettings.about_leader3_image_url) setLeader3PreviewUrl(mergedSettings.about_leader3_image_url);
          }
        } else {
          if (isMounted.current) setAppSettings(defaultAppSettings);
          const { error: upsertError } = await supabaseRef.current.from('app_settings').upsert({ ...defaultAppSettings, id: 1 }, { onConflict: 'id' });
          if (upsertError) {
             console.error("AdminSettingsPage: Error upserting default settings:", upsertError);
             if (isMounted.current) setLoadingError(`Failed to initialize settings: ${upsertError.message}`);
          } else if (isMounted.current) {
            toast({ title: "Settings Initialized", description: "Default settings have been established."});
          }
        }
      } catch (error: any) {
        console.error("AdminSettingsPage: Error loading settings:", error);
        if (isMounted.current) {
            setLoadingError(`Could not load settings. Error: ${error.message}`);
            setAppSettings(defaultAppSettings);
        }
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };

    fetchCurrentUserAndSettings();

    return () => {
      isMounted.current = false;
      const urlsToRevoke = [logoPreviewUrl, heroPreviewUrl, aboutHistoryPreviewUrl, leader1PreviewUrl, leader2PreviewUrl, leader3PreviewUrl];
      urlsToRevoke.forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [toast]);

  const handleSettingChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'logo' | 'hero' | 'about_history' | 'leader1' | 'leader2' | 'leader3', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const previewSetterMap = {
        logo: setLogoPreviewUrl,
        hero: setHeroPreviewUrl,
        about_history: setAboutHistoryPreviewUrl,
        leader1: setLeader1PreviewUrl,
        leader2: setLeader2PreviewUrl,
        leader3: setLeader3PreviewUrl,
    };
    const fileSetterMap = {
        logo: setSelectedLogoFile,
        hero: setSelectedHeroFile,
        about_history: setSelectedAboutHistoryFile,
        leader1: setSelectedLeader1File,
        leader2: setSelectedLeader2File,
        leader3: setSelectedLeader3File,
    };
    const currentUrl = type === 'logo' ? logoPreviewUrl : type === 'hero' ? heroPreviewUrl : type === 'about_history' ? aboutHistoryPreviewUrl : type === 'leader1' ? leader1PreviewUrl : type === 'leader2' ? leader2PreviewUrl : leader3PreviewUrl;

    if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
    }
    
    if (file) {
      const newPreviewUrl = URL.createObjectURL(file);
      previewSetterMap[type](newPreviewUrl);
      fileSetterMap[type](file);
    } else {
      const dbUrl = appSettings[type === 'logo' ? 'school_logo_url' : type === 'hero' ? 'school_hero_image_url' : type === 'about_history' ? 'about_history_image_url' : `about_${type}_image_url` as keyof AppSettings];
      previewSetterMap[type](dbUrl || null);
      fileSetterMap[type](null);
    }
  };

  const uploadFileToSupabase = async (file: File, pathPrefix: string): Promise<string | null> => {
    if (!supabaseRef.current) {
        toast({ title: "Client Error", description: "Database client not initialized.", variant: "destructive" });
        return null;
    }
    const fileName = `${pathPrefix}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${pathPrefix}/${fileName}`;

    const { error: uploadError } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(`Error uploading ${pathPrefix} to storage:`, JSON.stringify(uploadError, null, 2));
      let displayErrorMessage = `An unknown error occurred during ${pathPrefix} upload.`;
      if(uploadError.message) displayErrorMessage = uploadError.message;
      toast({ title: "Upload Failed", description: `Could not upload ${pathPrefix}: ${displayErrorMessage}`, variant: "destructive", duration: 12000 });
      return null;
    }

    const { data: publicUrlData } = supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || null;
  };

  const getPathFromSupabaseUrl = (url: string): string | null => {
    if (!url || !supabaseRef.current?.storage.url) return null;
    try {
        const supabaseStorageBase = `${supabaseRef.current.storage.url}/object/public/${SUPABASE_STORAGE_BUCKET}/`;
        if (url.startsWith(supabaseStorageBase)) {
            return url.substring(supabaseStorageBase.length);
        }
    } catch(e) { console.warn("Could not determine storage base URL for path extraction.", e); }
    return null;
  };

  const promoteAllStudents = async (oldAcademicYear: string, newAcademicYear: string): Promise<{ success: boolean, promotedCount: number, errorCount: number, arrearsCreatedCount: number }> => {
    if (!supabaseRef.current || !currentUser) {
      toast({ title: "Error", description: "Database client or user session not available for promotion.", variant: "destructive" });
      return { success: false, promotedCount: 0, errorCount: 0, arrearsCreatedCount: 0 };
    }
    
    let successCount = 0, errorCount = 0, arrearsCount = 0;
    let studentsToProcess: Array<{id: string, student_id_display: string, grade_level: string, full_name: string }> = [];

    try {
      const { data: fetchedStudents, error: studentsError } = await supabaseRef.current.from('students').select('id, student_id_display, grade_level, full_name'); 
      if (studentsError) throw new Error(`Failed to fetch students: ${studentsError.message}`);
      studentsToProcess = fetchedStudents || [];

      if (studentsToProcess.length === 0) return { success: true, promotedCount: 0, errorCount: 0, arrearsCreatedCount: 0 };
      
      let oldAcademicYearStartDate = "", oldAcademicYearEndDate = "";
      if (oldAcademicYear && /^\d{4}-\d{4}$/.test(oldAcademicYear)) {
          const startYear = oldAcademicYear.substring(0, 4), endYear = oldAcademicYear.substring(5, 9);
          oldAcademicYearStartDate = `${startYear}-08-01`; oldAcademicYearEndDate = `${endYear}-07-31`;
      }
      const studentUpdatePromises = [], studentDetailsForProcessing: Array<{id: string, student_id_display: string, name: string, oldGrade: string, newGrade: string | null }> = [];
      for (const student of studentsToProcess) {
        const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
        let nextGrade: string | null = null; 
        if (student.grade_level === GRADE_LEVELS[GRADE_LEVELS.length - 1] || currentGradeIndex === -1) {
          studentDetailsForProcessing.push({ id: student.id, student_id_display: student.student_id_display, name: student.full_name, oldGrade: student.grade_level, newGrade: student.grade_level });
          studentUpdatePromises.push(supabaseRef.current.from('students').update({ total_paid_override: 0, updated_at: new Date().toISOString() }).eq('id', student.id).select('id, grade_level, total_paid_override'));
          continue; 
        }
        if (currentGradeIndex < GRADE_LEVELS.length - 1) {
          nextGrade = GRADE_LEVELS[currentGradeIndex + 1];
          studentDetailsForProcessing.push({ id: student.id, student_id_display: student.student_id_display, name: student.full_name, oldGrade: student.grade_level, newGrade: nextGrade });
          studentUpdatePromises.push(supabaseRef.current.from('students').update({ grade_level: nextGrade, total_paid_override: 0, updated_at: new Date().toISOString() }).eq('id', student.id).select('id, grade_level, total_paid_override'));
        }
      }
      
      if (studentUpdatePromises.length > 0) {
        const promotionResults = await Promise.allSettled(studentUpdatePromises);
        for (let index = 0; index < promotionResults.length; index++) {
          const result = promotionResults[index], studentInfo = studentDetailsForProcessing[index];
          if (!studentInfo) { errorCount++; continue; }
          if (result.status === 'fulfilled') {
            const { data: updatedStudentData, error: updateError } = result.value as { data: any[] | null, error: PostgrestError | null };
            if (updateError || !updatedStudentData || updatedStudentData.length === 0) { errorCount++; } 
            else if ((studentInfo.newGrade && updatedStudentData[0].grade_level === studentInfo.newGrade) || (!studentInfo.newGrade && updatedStudentData[0].grade_level === studentInfo.oldGrade)) { 
              if (studentInfo.newGrade && updatedStudentData[0].grade_level === studentInfo.newGrade) successCount++;
              let paymentsQuery = supabaseRef.current.from('fee_payments').select('amount_paid').eq('student_id_display', studentInfo.student_id_display);
              if (oldAcademicYearStartDate && oldAcademicYearEndDate) paymentsQuery = paymentsQuery.gte('payment_date', oldAcademicYearStartDate).lte('payment_date', oldAcademicYearEndDate);
              const { data: payments, error: paymentsErr } = await paymentsQuery;
              if (paymentsErr) console.error(`FeeCarryOver: Error fetching payments for ${studentInfo.name}: ${paymentsErr.message}`);
              else {
                const totalPaidByStudentInOldYear = (payments || []).reduce((sum, p) => sum + p.amount_paid, 0);
                const { data: oldFees, error: oldFeesErr } = await supabaseRef.current.from('school_fee_items').select('amount').eq('grade_level', studentInfo.oldGrade).eq('academic_year', oldAcademicYear); 
                if (oldFeesErr) console.error(`FeeCarryOver: Error fetching old fees for ${studentInfo.name}: ${oldFeesErr.message}`);
                else {
                  const totalDueInOldYear = (oldFees || []).reduce((sum, item) => sum + item.amount, 0);
                  const outstandingBalance = totalDueInOldYear - totalPaidByStudentInOldYear;
                  if (outstandingBalance > 0) {
                    const arrearPayload = { student_id_display: studentInfo.student_id_display, student_name: studentInfo.name, grade_level_at_arrear: studentInfo.oldGrade, academic_year_from: oldAcademicYear, academic_year_to: newAcademicYear, amount: outstandingBalance, status: 'outstanding', created_by_user_id: currentUser?.id };
                    const { error: arrearsInsertErr } = await supabaseRef.current.from('student_arrears').insert(arrearPayload);
                    if (arrearsInsertErr) console.error(`FeeCarryOver: Error inserting into student_arrears for ${studentInfo.name}: ${arrearsInsertErr.message}`);
                    else arrearsCount++;
                  }
                }
              }
            } else errorCount++;
          } else errorCount++;
        }
      }
      return { success: errorCount === 0, promotedCount: successCount, errorCount: errorCount, arrearsCreatedCount: arrearsCount };
    } catch (error: any) {
      console.error("promoteAllStudents: Critical error:", error);
      toast({ title: "Promotion Failed", description: `An error occurred: ${error.message}`, variant: "destructive" });
      return { success: false, promotedCount: 0, errorCount: studentsToProcess?.length || 1, arrearsCreatedCount: 0 }; 
    }
  };

  const handleConfirmPromotionAndSaveYear = async () => {
    if (!pendingNewAcademicYear || !oldAcademicYearForPromotion || !supabaseRef.current) return;
    setIsPromotionDialogActionBusy(true);
    let promotionResult = { success: false, promotedCount: 0, errorCount: 0, arrearsCreatedCount: 0 };
    try { promotionResult = await promoteAllStudents(oldAcademicYearForPromotion, pendingNewAcademicYear); } catch (e) { console.error("Error from promoteAllStudents:", e); }
    const settingsToSave = { ...appSettings, current_academic_year: pendingNewAcademicYear, id: 1, updated_at: new Date().toISOString() };
    try {
      const { data: savedData, error } = await supabaseRef.current.from('app_settings').upsert(settingsToSave, { onConflict: 'id' }).select().single();
      if (error) throw error; 
      if (isMounted.current && savedData) {
        const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
        setAppSettings(mergedSettings);
        let finalToastMessage = `Academic year successfully set to ${pendingNewAcademicYear}.`;
        if (promotionResult.promotedCount > 0 && promotionResult.errorCount === 0) finalToastMessage += ` ${promotionResult.promotedCount} students promoted, ${promotionResult.arrearsCreatedCount} arrears created.`;
        else if (promotionResult.promotedCount > 0 && promotionResult.errorCount > 0) finalToastMessage += ` ${promotionResult.promotedCount} students promoted, ${promotionResult.arrearsCreatedCount} arrears created. ${promotionResult.errorCount} ops failed.`;
        else finalToastMessage += ` Student promotion processing completed. ${promotionResult.arrearsCreatedCount} arrears created.`;
        toast({ title: "Academic Year & Promotion Update", description: finalToastMessage, duration: 15000 });
        await revalidateWebsitePages();
      }
    } catch (error: any) {
      toast({ title: "Academic Year Save Failed", description: `Could not save Academic Year settings. Details: ${error.message}`, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        setPendingNewAcademicYear(null);
        setOldAcademicYearForPromotion(null);
        setIsPromotionDialogActionBusy(false);
        setIsPromotionConfirmOpen(false); 
      }
    }
  };

  const handleSaveSettings = async (section: string, fieldsToSave: (keyof AppSettings)[]) => {
    if (!currentUser || !supabaseRef.current) {
        toast({ title: "Authentication Error", description: "You must be logged in as an admin.", variant: "destructive"});
        return;
    }
    setIsSaving(prev => ({...prev, [section]: true}));

    if (section === "Academic Year") {
      let currentDbYear: string;
      try {
        const { data: dbData, error: dbError } = await supabaseRef.current.from('app_settings').select('current_academic_year').eq('id', 1).single();
        if (dbError && dbError.code !== 'PGRST116') throw dbError; 
        currentDbYear = dbData?.current_academic_year || defaultAppSettings.current_academic_year;
      } catch (e: any) {
        toast({ title: "Error", description: `Could not fetch current academic year: ${e.message}`, variant: "destructive" });
        setIsSaving(prev => ({...prev, [section]: false})); return;
      }
      const newAcademicYearFromInput = appSettings.current_academic_year;
      if (newAcademicYearFromInput !== currentDbYear) {
        if(isMounted.current) {
            setOldAcademicYearForPromotion(currentDbYear);
            setPendingNewAcademicYear(newAcademicYearFromInput);
            setIsPromotionConfirmOpen(true);
            setIsSaving(prev => ({...prev, [section]: false})); 
        }
        return; 
      } else {
        toast({ title: "No Change", description: "Academic year is already set to this value." });
        setIsSaving(prev => ({...prev, [section]: false})); return;
      }
    }

    let payload: Partial<AppSettings> = {};
    for (const field of fieldsToSave) {
        payload[field] = appSettings[field];
    }

    const fileUploads: Promise<void>[] = [];
    const handleFileUpload = async (file: File | null, field: keyof AppSettings, prefix: string) => {
        if (file) {
            const oldPath = getPathFromSupabaseUrl(appSettings[field] as string);
            const newUrl = await uploadFileToSupabase(file, prefix);
            if (newUrl) {
                payload[field] = newUrl;
                if (oldPath) await supabaseRef.current?.storage.from(SUPABASE_STORAGE_BUCKET).remove([oldPath]);
            } else {
                throw new Error(`Upload failed for ${field}`);
            }
        }
    };
    fileUploads.push(handleFileUpload(selectedLogoFile, 'school_logo_url', 'logos'));
    fileUploads.push(handleFileUpload(selectedHeroFile, 'school_hero_image_url', 'heroes'));
    fileUploads.push(handleFileUpload(selectedAboutHistoryFile, 'about_history_image_url', 'about-us'));
    fileUploads.push(handleFileUpload(selectedLeader1File, 'about_leader1_image_url', 'leaders'));
    fileUploads.push(handleFileUpload(selectedLeader2File, 'about_leader2_image_url', 'leaders'));
    fileUploads.push(handleFileUpload(selectedLeader3File, 'about_leader3_image_url', 'leaders'));

    try {
        await Promise.all(fileUploads);
    } catch (uploadError: any) {
        setIsSaving(prev => ({...prev, [section]: false}));
        return;
    }
    
    const finalPayloadToSave = { ...payload, id: 1, updated_at: new Date().toISOString() };
    try {
        const { data: savedData, error } = await supabaseRef.current.from('app_settings').upsert(finalPayloadToSave, { onConflict: 'id' }).select().single();
        if (error) throw error;
        if (isMounted.current && savedData) {
            const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
            setAppSettings(mergedSettings);
            // Reset file states
            setSelectedLogoFile(null); setSelectedHeroFile(null); setSelectedAboutHistoryFile(null);
            setSelectedLeader1File(null); setSelectedLeader2File(null); setSelectedLeader3File(null);
            if (mergedSettings.school_logo_url) setLogoPreviewUrl(mergedSettings.school_logo_url);
            if (mergedSettings.school_hero_image_url) setHeroPreviewUrl(mergedSettings.school_hero_image_url);
            if (mergedSettings.about_history_image_url) setAboutHistoryPreviewUrl(mergedSettings.about_history_image_url);
            if (mergedSettings.about_leader1_image_url) setLeader1PreviewUrl(mergedSettings.about_leader1_image_url);
            if (mergedSettings.about_leader2_image_url) setLeader2PreviewUrl(mergedSettings.about_leader2_image_url);
            if (mergedSettings.about_leader3_image_url) setLeader3PreviewUrl(mergedSettings.about_leader3_image_url);
        }
        toast({ title: `${section} Saved`, description: `${section} settings have been updated.` });
        await revalidateWebsitePages();
        toast({ title: "Website Updated", description: "Your changes are now live on the public website." });
    } catch (error: any) {
        toast({ title: "Save Failed", description: `Could not save ${section} settings. Details: ${error.message}`, variant: "destructive" });
    } finally {
        if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false}));
    }
  };
  
  const handleRemoveImage = async (type: 'logo' | 'hero' | 'about_history' | 'leader1' | 'leader2' | 'leader3') => {
    if (!currentUser || !supabaseRef.current) return;
    const fieldMapping = {
        logo: 'school_logo_url', hero: 'school_hero_image_url', about_history: 'about_history_image_url',
        leader1: 'about_leader1_image_url', leader2: 'about_leader2_image_url', leader3: 'about_leader3_image_url'
    };
    const urlField = fieldMapping[type];
    const sectionName = type.startsWith('leader') ? "About Page" : (type === 'logo' || type === 'hero') ? "Homepage & Branding" : "About Page";
    const previewSetterMap = {
        logo: setLogoPreviewUrl, hero: setHeroPreviewUrl, about_history: setAboutHistoryPreviewUrl,
        leader1: setLeader1PreviewUrl, leader2: setLeader2PreviewUrl, leader3: setLeader3PreviewUrl,
    };
    const fileSetterMap = {
        logo: setSelectedLogoFile, hero: setSelectedHeroFile, about_history: setSelectedAboutHistoryFile,
        leader1: setSelectedLeader1File, leader2: setSelectedLeader2File, leader3: setSelectedLeader3File,
    };

    setIsSaving(prev => ({...prev, [sectionName]: true}));
    const currentUrl = appSettings[urlField as keyof AppSettings] as string;
    const filePath = getPathFromSupabaseUrl(currentUrl);
    try {
        const { error: dbError } = await supabaseRef.current.from('app_settings').update({ [urlField]: "" }).eq('id', 1);
        if (dbError) throw dbError;
        if (isMounted.current) {
            setAppSettings(prev => ({...prev, [urlField]: ""}));
            const currentPreviewUrl = type === 'logo' ? logoPreviewUrl : type === 'hero' ? heroPreviewUrl : type === 'about_history' ? aboutHistoryPreviewUrl : type === 'leader1' ? leader1PreviewUrl : type === 'leader2' ? leader2PreviewUrl : leader3PreviewUrl;
            if (currentPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(currentPreviewUrl);
            previewSetterMap[type](null);
            fileSetterMap[type](null);
        }
        if (filePath) {
            const { error: storageError } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).remove([filePath]);
            if (storageError) toast({ title: "Storage Warning", description: `Image URL cleared, but failed to delete file from storage: ${storageError.message}`, variant: "default" });
            else toast({ title: "Image Removed", description: `Image removed successfully.` });
        } else toast({ title: "Image URL Cleared", description: `Image URL was cleared.` });
        await revalidateWebsitePages();
    } catch (error: any) {
        toast({ title: "Removal Failed", description: `Could not remove image. ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(prev => ({...prev, [sectionName]: false}));
    }
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      toast({ title: "LocalStorage Cleared", description: "Browser data cleared. Please refresh or log in again.", duration: 7000 });
      setIsClearDataDialogOpen(false);
      window.location.reload(); 
    }
  };

  if (isLoadingSettings) { 
     return <div className="flex justify-center items-center py-10"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading system settings...</p></div>;
  }
  if (loadingError) {
    return <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle/>Error</CardTitle></CardHeader><CardContent><p>{loadingError}</p></CardContent></Card>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center"><Settings className="mr-3 h-8 w-8" /> System & Website Settings</h2>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="about">About Page</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year & Student Promotion</CardTitle>
                    <CardDescription>Configure the current academic year. Changing this will trigger the student promotion process and carry over any outstanding fees.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="current_academic_year">Current Academic Year</Label><Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" /></div>
                    <p className="text-xs text-muted-foreground">When you save a new academic year, you will be asked to confirm student promotion.</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveSettings("Academic Year", ['current_academic_year'])} disabled={!currentUser || isSaving["Academic Year"] || isPromotionDialogActionBusy}>
                    {(isSaving["Academic Year"] || isPromotionDialogActionBusy) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaving["Academic Year"] ? "Saving Year..." : (isPromotionDialogActionBusy ? "Processing..." : "Save Academic Year")}
                    </Button>
                </CardFooter>
            </Card>
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage system-wide email notifications.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
                    <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Notification Settings", ['enable_email_notifications', 'email_footer_signature'])} disabled={!currentUser || isSaving["Notification Settings"]}>{isSaving["Notification Settings"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Notification Settings</Button></CardFooter>
            </Card>
             <Card className="shadow-lg border-destructive bg-destructive/5">
                <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-3 h-7 w-7" /> Dangerous Actions</CardTitle><CardDescription className="text-destructive/90">Irreversible actions for maintenance.</CardDescription></CardHeader>
                <CardContent>
                    <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
                    <AlertDialogTrigger asChild><Button variant="destructive" className="w-full" disabled={!currentUser || Object.values(isSaving).some(s => s)}><Trash2 className="mr-2 h-4 w-4" /> Clear All LocalStorage Data</Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete ALL application data stored in THIS browser's local storage. This will NOT delete any data from your remote database.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive hover:bg-destructive/90">Yes, delete all localStorage data</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                    <p className="text-xs text-muted-foreground mt-3">Use this for clearing old browser data not managed by the database.</p>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="homepage" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Home /> Homepage & Branding</CardTitle><CardDescription>Manage content displayed on the public homepage.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleSettingChange('school_name', e.target.value)} /></div>
                    <div><Label htmlFor="school_slogan">Homepage Slogan</Label><Textarea id="school_slogan" value={appSettings.school_slogan || ""} onChange={(e) => handleSettingChange('school_slogan', e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="school_logo_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> School Logo</Label>
                        {(logoPreviewUrl || appSettings.school_logo_url) && <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]"><img src={logoPreviewUrl || appSettings.school_logo_url} alt="Logo Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/><Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving["Homepage & Branding"]}><Trash2 className="h-4 w-4"/></Button></div>}
                        <Input id="school_logo_file" type="file" accept="image/*" onChange={(e) => handleFileChange('logo', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="school_hero_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Homepage Hero Image</Label>
                        {(heroPreviewUrl || appSettings.school_hero_image_url) && <div className="my-2 p-2 border rounded-md inline-block relative max-w-[320px]"><img src={heroPreviewUrl || appSettings.school_hero_image_url} alt="Hero Preview" className="object-contain max-h-40 max-w-[300px]" data-ai-hint="school campus event"/><Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving["Homepage & Branding"]}><Trash2 className="h-4 w-4"/></Button></div>}
                        <Input id="school_hero_file" type="file" accept="image/*" onChange={(e) => handleFileChange('hero', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Homepage & Branding", ['school_name', 'school_slogan', 'school_logo_url', 'school_hero_image_url'])} disabled={!currentUser || isSaving["Homepage & Branding"]}>{isSaving["Homepage & Branding"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Homepage Settings</Button></CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-6 space-y-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><BookOpen/> About Page Content</CardTitle><CardDescription>Manage the content for the "About Us" page.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label htmlFor="about_history_mission">History & Mission</Label><Textarea id="about_history_mission" value={appSettings.about_history_mission} onChange={(e) => handleSettingChange('about_history_mission', e.target.value)} rows={6} /></div>
                    <div><Label htmlFor="about_vision">Vision Statement</Label><Textarea id="about_vision" value={appSettings.about_vision} onChange={(e) => handleSettingChange('about_vision', e.target.value)} rows={3} /></div>
                    <div><Label htmlFor="about_core_values">Core Values (One per line)</Label><Textarea id="about_core_values" value={appSettings.about_core_values} onChange={(e) => handleSettingChange('about_core_values', e.target.value)} rows={5} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="about_history_image_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> History/Mission Image</Label>
                        {(aboutHistoryPreviewUrl || appSettings.about_history_image_url) && <div className="my-2 p-2 border rounded-md inline-block relative max-w-[320px]"><img src={aboutHistoryPreviewUrl || appSettings.about_history_image_url} alt="About History Preview" className="object-contain max-h-40 max-w-[300px]" data-ai-hint="school building classic"/><Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('about_history')} disabled={isSaving["About Page"]}><Trash2 className="h-4 w-4"/></Button></div>}
                        <Input id="about_history_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange('about_history', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveSettings("About Page Text", ['about_history_mission', 'about_vision', 'about_core_values', 'about_history_image_url'])} disabled={!currentUser || isSaving["About Page Text"]}>
                        {isSaving["About Page Text"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save About Page Content
                    </Button>
                </CardFooter>
            </Card>
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Users/> Leadership Team Images</CardTitle><CardDescription>Upload photos for the leadership team members shown on the About page.</CardDescription></CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-6">
                    {([1, 2, 3] as const).map(i => {
                        const leaderKey = `leader${i}` as const;
                        const previewUrl = {leader1: leader1PreviewUrl, leader2: leader2PreviewUrl, leader3: leader3PreviewUrl}[leaderKey];
                        const dbUrl = appSettings[`about_leader${i}_image_url` as keyof AppSettings];
                        
                        return (
                            <div className="space-y-2" key={i}>
                                <Label htmlFor={`leader${i}_image_file`}>Leader {i} Image</Label>
                                {(previewUrl || dbUrl) && (
                                    <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]">
                                        <img src={previewUrl || dbUrl} alt={`Leader ${i} Preview`} className="object-contain max-h-32 max-w-[150px]" data-ai-hint="professional headshot"/>
                                        <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage(leaderKey)} disabled={isSaving["About Page Images"]}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                <Input id={`leader${i}_image_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(leaderKey, e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                        );
                    })}
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => handleSaveSettings("About Page Images", ['about_leader1_image_url', 'about_leader2_image_url', 'about_leader3_image_url'])} disabled={!currentUser || isSaving["About Page Images"]}>
                        {isSaving["About Page Images"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Leadership Images
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>
        
        <TabsContent value="admissions" className="mt-6">
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><ClipboardList /> Admissions Page Content</CardTitle><CardDescription>Manage the content for the Admissions page.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label htmlFor="admissions_step1_desc">Step 1 Description ("Submit Application")</Label><Textarea id="admissions_step1_desc" value={appSettings.admissions_step1_desc} onChange={(e) => handleSettingChange('admissions_step1_desc', e.target.value)} rows={2} /></div>
                    <div><Label htmlFor="admissions_step2_desc">Step 2 Description ("Document Submission")</Label><Textarea id="admissions_step2_desc" value={appSettings.admissions_step2_desc} onChange={(e) => handleSettingChange('admissions_step2_desc', e.target.value)} rows={2} /></div>
                    <div><Label htmlFor="admissions_step3_desc">Step 3 Description ("Entrance Assessment")</Label><Textarea id="admissions_step3_desc" value={appSettings.admissions_step3_desc} onChange={(e) => handleSettingChange('admissions_step3_desc', e.target.value)} rows={2} /></div>
                    <div><Label htmlFor="admissions_step4_desc">Step 4 Description ("Admission Offer")</Label><Textarea id="admissions_step4_desc" value={appSettings.admissions_step4_desc} onChange={(e) => handleSettingChange('admissions_step4_desc', e.target.value)} rows={2} /></div>
                    <div><Label htmlFor="admissions_tuition_info">Tuition & Fees Information</Label><Textarea id="admissions_tuition_info" value={appSettings.admissions_tuition_info} onChange={(e) => handleSettingChange('admissions_tuition_info', e.target.value)} rows={4} /></div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Admissions Page", ['admissions_step1_desc', 'admissions_step2_desc', 'admissions_step3_desc', 'admissions_step4_desc', 'admissions_tuition_info'])} disabled={!currentUser || isSaving["Admissions Page"]}>{isSaving["Admissions Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Admissions Content</Button></CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="programs" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><BookOpen /> Programs Page Content</CardTitle><CardDescription>Manage the descriptions for each academic program.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                     <div><Label htmlFor="program_creche_desc">Creche & Nursery Description</Label><Textarea id="program_creche_desc" value={appSettings.program_creche_desc} onChange={(e) => handleSettingChange('program_creche_desc', e.target.value)} rows={3} /></div>
                     <div><Label htmlFor="program_kindergarten_desc">Kindergarten Description</Label><Textarea id="program_kindergarten_desc" value={appSettings.program_kindergarten_desc} onChange={(e) => handleSettingChange('program_kindergarten_desc', e.target.value)} rows={3} /></div>
                     <div><Label htmlFor="program_primary_desc">Primary School Description</Label><Textarea id="program_primary_desc" value={appSettings.program_primary_desc} onChange={(e) => handleSettingChange('program_primary_desc', e.target.value)} rows={3} /></div>
                     <div><Label htmlFor="program_jhs_desc">Junior High School Description</Label><Textarea id="program_jhs_desc" value={appSettings.program_jhs_desc} onChange={(e) => handleSettingChange('program_jhs_desc', e.target.value)} rows={3} /></div>
                     <div><Label htmlFor="program_extracurricular_desc">Extracurricular Activities Description</Label><Textarea id="program_extracurricular_desc" value={appSettings.program_extracurricular_desc} onChange={(e) => handleSettingChange('program_extracurricular_desc', e.target.value)} rows={3} /></div>
                     <div><Label htmlFor="program_science_tech_desc">Science & Technology Description</Label><Textarea id="program_science_tech_desc" value={appSettings.program_science_tech_desc} onChange={(e) => handleSettingChange('program_science_tech_desc', e.target.value)} rows={3} /></div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Programs Page", ['program_creche_desc', 'program_kindergarten_desc', 'program_primary_desc', 'program_jhs_desc', 'program_extracurricular_desc', 'program_science_tech_desc'])} disabled={!currentUser || isSaving["Programs Page"]}>{isSaving["Programs Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Programs Content</Button></CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Contact /> Contact Information</CardTitle><CardDescription>Update school contact details for the website footer and contact page.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
                        <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
                    </div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Contact Info", ['school_address', 'school_phone', 'school_email'])} disabled={!currentUser || isSaving["Contact Info"]}>{isSaving["Contact Info"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Contact Info</Button></CardFooter>
            </Card>
        </TabsContent>
        
      </Tabs>
      
      <AlertDialog open={isPromotionConfirmOpen} onOpenChange={setIsPromotionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Student Promotion</AlertDialogTitle>
            <AlertDialogDescription>You are about to change the academic year from <strong>{oldAcademicYearForPromotion || "the previous year"}</strong> to <strong>{pendingNewAcademicYear || "the new year"}</strong>.<br/>This action will attempt to promote all eligible students to their next grade level and carry over outstanding fees.<br/><br/><strong className="text-destructive">This is a significant action. Are you sure you want to proceed?</strong></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsPromotionConfirmOpen(false); setPendingNewAcademicYear(null); setOldAcademicYearForPromotion(null); setIsSaving(prev => ({...prev, ["Academic Year"]: false })); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction id="confirm-promote-action-button" onClick={async () => { setIsPromotionDialogActionBusy(true); try { await handleConfirmPromotionAndSaveYear(); } finally { if(isMounted.current) { setIsPromotionDialogActionBusy(false); setIsPromotionConfirmOpen(false); } } }} disabled={isPromotionDialogActionBusy} className="bg-primary hover:bg-primary/90">
              {isPromotionDialogActionBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm & Promote Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

  