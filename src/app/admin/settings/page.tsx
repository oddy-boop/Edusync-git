
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Settings, CalendarCog, School, Bell, Puzzle, Save, Loader2, AlertCircle, Image as ImageIcon, Trash2, AlertTriangle, Link as LinkIcon, UploadCloud, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image';
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
import type { User, SupabaseClient } from '@supabase/supabase-js';
import { GRADE_LEVELS } from '@/lib/constants';

interface AppSettings {
  id?: number;
  current_academic_year: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  school_hero_image_url: string;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  email_footer_signature: string;
  payment_gateway_api_key: string;
  sms_provider_api_key: string;
  school_slogan?: string;
  updated_at?: string;
}

const defaultAppSettings: AppSettings = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "St. Joseph's Montessori",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@stjosephmontessori.edu.gh",
  school_logo_url: "",
  school_hero_image_url: "",
  enable_email_notifications: true,
  enable_sms_notifications: false,
  email_footer_signature: "Kind Regards,\nThe Administration,\nSt. Joseph's Montessori",
  payment_gateway_api_key: "pk_test_xxxxxxxxxxxxxxxxxxxx",
  sms_provider_api_key: "sms_apikey_xxxxxxxxxxxxxxxx",
  school_slogan: "A modern solution for St. Joseph's Montessori (Ghana) to manage school operations, enhance learning, and empower students, teachers, and administrators.",
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
      console.error("AdminSettingsPage: Failed to initialize Supabase client:", initError.message, "\nFull error object:", JSON.stringify(initError, null, 2));
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
        const { data, error } = await supabaseRef.current
          .from('app_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          if (isMounted.current) {
            const mergedSettings = { ...defaultAppSettings, ...data } as AppSettings;
            setAppSettings(mergedSettings);
            if (mergedSettings.school_logo_url) setLogoPreviewUrl(mergedSettings.school_logo_url);
            if (mergedSettings.school_hero_image_url) setHeroPreviewUrl(mergedSettings.school_hero_image_url);
          }
        } else {
          if (isMounted.current) setAppSettings(defaultAppSettings);
          const { error: insertError } = await supabaseRef.current
            .from('app_settings')
            .insert([{ ...defaultAppSettings, id: 1 }])
            .single();
          if (insertError) {
            let loggableInsertError: any = insertError;
             if (typeof insertError === 'object' && insertError !== null && !Object.keys(insertError).length && !insertError.message) {
                 loggableInsertError = "Received an empty or non-standard error object during default settings insert.";
             } else if (insertError instanceof Error || (typeof insertError === 'object' && insertError !== null && 'message' in insertError)) {
                 loggableInsertError = (insertError as Error).message;
             }
            console.error("AdminSettingsPage: Error inserting default settings into Supabase:", loggableInsertError, "\nFull error object:", JSON.stringify(insertError, null, 2));
            if (isMounted.current) setLoadingError(`Failed to initialize settings: ${loggableInsertError}`);
          } else {
            if (isMounted.current) toast({ title: "Settings Initialized", description: "Default settings have been saved to Supabase."});
          }
        }
      } catch (error: any) {
        let loggableError: any = error;
        if (typeof error === 'object' && error !== null && !Object.keys(error).length && !error.message) {
            loggableError = "Received an empty or non-standard error object from Supabase app_settings fetch.";
        } else if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
            loggableError = (error as Error).message;
        }
        console.error("AdminSettingsPage: Error loading settings from Supabase:", loggableError, "\nFull error object:", JSON.stringify(error, null, 2));
        if (isMounted.current) setLoadingError(`Could not load settings from Supabase. Error: ${loggableError}`);
        if (isMounted.current) setAppSettings(defaultAppSettings);
      } finally {
        if (isMounted.current) setIsLoadingSettings(false);
      }
    };

    fetchCurrentUserAndSettings();

    return () => {
      isMounted.current = false;
      if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
      if (heroPreviewUrl && heroPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [toast]);

  const handleSettingChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'logo' | 'hero', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newPreviewUrl = URL.createObjectURL(file);
      if (type === 'logo') {
        if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
        setSelectedLogoFile(file);
        setLogoPreviewUrl(newPreviewUrl);
      } else {
        if (heroPreviewUrl && heroPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(heroPreviewUrl);
        setSelectedHeroFile(file);
        setHeroPreviewUrl(newPreviewUrl);
      }
    } else {
      if (type === 'logo') {
        if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
        setSelectedLogoFile(null);
        setLogoPreviewUrl(appSettings.school_logo_url || null);
      } else {
        if (heroPreviewUrl && heroPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(heroPreviewUrl);
        setSelectedHeroFile(null);
        setHeroPreviewUrl(appSettings.school_hero_image_url || null);
      }
    }
  };

  const uploadFileToSupabase = async (file: File, pathPrefix: string): Promise<string | null> => {
    if (!supabaseRef.current) {
        toast({ title: "Client Error", description: "Supabase client not initialized.", variant: "destructive" });
        return null;
    }
    const fileName = `${pathPrefix}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${pathPrefix}/${fileName}`;

    const { error: uploadError } = await supabaseRef.current.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(`Error uploading ${pathPrefix} to Supabase Storage:`, JSON.stringify(uploadError, null, 2));
      let displayErrorMessage = (uploadError as any)?.message || `An unknown error occurred during ${pathPrefix} upload.`;

      const errorMessageString = JSON.stringify(uploadError).toLowerCase();
      if (errorMessageString.includes("violates row-level security policy") || (uploadError as any)?.statusCode === "403") {
        displayErrorMessage = `Upload unauthorized (403). This often means a Row Level Security (RLS) policy on the '${SUPABASE_STORAGE_BUCKET}' bucket is preventing uploads. Please check your RLS policies for storage and bucket settings in Supabase. Original error: ${displayErrorMessage}`;
      } else if (errorMessageString.includes("bucket not found")) {
        displayErrorMessage = `The storage bucket '${SUPABASE_STORAGE_BUCKET}' was not found. Please create it in your Supabase project. Original error: ${displayErrorMessage}`;
      }

      toast({ title: "Upload Failed", description: `Could not upload ${pathPrefix}: ${displayErrorMessage}`, variant: "destructive", duration: 12000 });
      return null;
    }

    const { data: publicUrlData } = supabaseRef.current.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  };

  const getPathFromSupabaseUrl = (url: string): string | null => {
    if (!url || !supabaseRef.current?.storage.url) return null;
    try {
        const supabaseStorageBase = `${supabaseRef.current.storage.url}/object/public/${SUPABASE_STORAGE_BUCKET}/`;
        if (url.startsWith(supabaseStorageBase)) {
            return url.substring(supabaseStorageBase.length);
        }
    } catch(e) {
        console.warn("Could not determine Supabase base URL for path extraction.", e);
    }
    return null;
  };

  const promoteAllStudents = async (): Promise<{ success: boolean, promotedCount: number, errorCount: number }> => {
    if (!supabaseRef.current) {
      toast({ title: "Error", description: "Supabase client not available for promotion.", variant: "destructive" });
      return { success: false, promotedCount: 0, errorCount: 0 };
    }
    
    let successCount = 0;
    let errorCount = 0;

    console.log("promoteAllStudents: Starting student promotion process.");
    try {
      const { data: students, error: studentsError } = await supabaseRef.current
        .from('students')
        .select('id, student_id_display, grade_level, full_name');

      if (studentsError) {
        console.error("promoteAllStudents: Error fetching students:", studentsError);
        throw new Error(`Failed to fetch students: ${studentsError.message}`);
      }

      if (!students || students.length === 0) {
        toast({ title: "No Students Found", description: "There are no students to promote.", variant: "info" });
        console.log("promoteAllStudents: No students found to promote.");
        return { success: true, promotedCount: 0, errorCount: 0 };
      }
      console.log(`promoteAllStudents: Found ${students.length} students to process.`);

      const updatesPromises = [];
      const studentDetailsForPromises: Array<{id: string, name: string, oldGrade: string, newGrade: string}> = [];


      for (const student of students) {
        const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
        let nextGrade = student.grade_level; 

        if (student.grade_level === GRADE_LEVELS[GRADE_LEVELS.length - 1]) { 
          console.log(`promoteAllStudents: Student ${student.full_name} (${student.student_id_display}) is already '${GRADE_LEVELS[GRADE_LEVELS.length - 1]}'. Skipping.`);
          continue;
        }
        
        if (currentGradeIndex === -1) {
          console.warn(`promoteAllStudents: Student ${student.full_name} (${student.student_id_display}) has an unknown grade level: '${student.grade_level}'. Skipping.`);
          continue;
        }

        if (currentGradeIndex < GRADE_LEVELS.length - 1) {
          nextGrade = GRADE_LEVELS[currentGradeIndex + 1];
          studentDetailsForPromises.push({id: student.id, name: student.full_name, oldGrade: student.grade_level, newGrade: nextGrade});
          updatesPromises.push(
            supabaseRef.current.from('students')
              .update({ grade_level: nextGrade, updated_at: new Date().toISOString() })
              .eq('id', student.id)
              .select('id, grade_level') 
          );
          console.log(`promoteAllStudents: Preparing to promote ${student.full_name} from ${student.grade_level} to ${nextGrade}`);
        } else {
           console.warn(`promoteAllStudents: Student ${student.full_name} (${student.student_id_display}) is at grade ${student.grade_level} which seems to be the highest non-graduated level or unhandled. Current highest in GRADE_LEVELS is '${GRADE_LEVELS[GRADE_LEVELS.length - 1]}'. Skipping.`);
        }
      }

      if (updatesPromises.length > 0) {
        console.log(`promoteAllStudents: Attempting to update ${updatesPromises.length} students.`);
        const results = await Promise.allSettled(updatesPromises);
        
        results.forEach((result, index) => {
          const studentInfo = studentDetailsForPromises[index];

          if (result.status === 'fulfilled') {
            const { data: updatedData, error: updateError } = result.value;
            if (updateError) {
              console.error(`promoteAllStudents: Supabase client error for student ${studentInfo.name} (${studentInfo.id}) from ${studentInfo.oldGrade} to ${studentInfo.newGrade}:`, updateError);
              errorCount++;
            } else if (!updatedData || updatedData.length === 0) {
              console.warn(`promoteAllStudents: Update for student ${studentInfo.name} (${studentInfo.id}) from ${studentInfo.oldGrade} to ${studentInfo.newGrade} reported no error but affected 0 rows. This likely means an RLS policy is preventing the update or the student record was not found by ID during update. Supabase response:`, result.value);
              errorCount++; 
            } else if (updatedData[0].grade_level === studentInfo.newGrade) {
              console.log(`promoteAllStudents: Successfully updated student ${studentInfo.name} (${studentInfo.id}) from ${studentInfo.oldGrade} to ${updatedData[0].grade_level}.`);
              successCount++;
            } else {
              console.warn(`promoteAllStudents: Update for student ${studentInfo.name} (${studentInfo.id}) from ${studentInfo.oldGrade} to ${studentInfo.newGrade} completed, but DB returned grade ${updatedData[0].grade_level}. This is unexpected. Supabase response:`, result.value);
              errorCount++; // Treat as an error if the grade didn't change as expected
            }
          } else { 
            console.error(`promoteAllStudents: Promise rejected for student ${studentInfo.name} (${studentInfo.id}) (attempted ${studentInfo.oldGrade} -> ${studentInfo.newGrade}):`, result.reason);
            errorCount++;
          }
        });

      } else {
        console.log("promoteAllStudents: No actual update promises were generated (e.g., all students already graduated or no eligible students).");
        return { success: true, promotedCount: 0, errorCount: 0 }; // No errors, but no promotions occurred.
      }

      // Refined Toast Logic
      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Promotion Failed",
          description: `No students were promoted. ${errorCount} attempts failed or were blocked. Please check console logs for details and verify RLS policies on the 'students' table.`,
          variant: "destructive",
          duration: 12000,
        });
      } else if (errorCount > 0 && successCount > 0) {
        toast({
          title: "Promotion Partially Successful",
          description: `${successCount} students promoted. ${errorCount} attempts failed or were blocked. Check console for details and RLS policies.`,
          variant: "default",
          duration: 10000,
        });
      } else if (successCount > 0 && errorCount === 0) {
        toast({ title: "Promotion Successful", description: `${successCount} students have been promoted to their next grade level.` });
      } else if (successCount === 0 && errorCount === 0 && updatesPromises.length > 0) {
        toast({ title: "Promotion Incomplete", description: "Promotion process ran but no students were confirmed as updated. This strongly indicates RLS policies are blocking all updates. Please check console logs and RLS policies.", variant: "warning", duration: 12000 });
      }
      
      console.log(`promoteAllStudents: Process finished. Success: ${successCount}, Errors: ${errorCount}. Total attempts: ${updatesPromises.length}`);
      return { success: errorCount === 0 && (successCount > 0 || updatesPromises.length === 0), promotedCount: successCount, errorCount: errorCount };

    } catch (error: any) {
      console.error("promoteAllStudents: Critical error during student promotion process:", error);
      toast({ title: "Promotion Failed", description: `An error occurred: ${error.message}`, variant: "destructive" });
      return { success: false, promotedCount: 0, errorCount: 1 }; // Indicate at least one error
    }
  };

  const handleConfirmPromotionAndSaveYear = async () => {
    if (!pendingNewAcademicYear || !oldAcademicYearForPromotion || !supabaseRef.current) {
        console.error("handleConfirmPromotionAndSaveYear: Missing critical data (pendingNewAcademicYear, oldAcademicYearForPromotion, or supabaseRef). Aborting.");
        if(isMounted.current) setIsPromotionDialogActionBusy(false); 
        return;
    }

    console.log("handleConfirmPromotionAndSaveYear: Starting confirmed promotion and year save.");
    let promotionResult = { success: false, promotedCount: 0, errorCount: 0 };

    try {
      promotionResult = await promoteAllStudents();
    } catch (promoError: any) {
      console.error("handleConfirmPromotionAndSaveYear: Error from promoteAllStudents:", promoError);
    }

    console.log(`handleConfirmPromotionAndSaveYear: Promotion part finished. Result: ${JSON.stringify(promotionResult)}. Proceeding to save academic year.`);
    
    const settingsToSave = {
      ...appSettings,
      current_academic_year: pendingNewAcademicYear,
      id: 1, 
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: savedData, error } = await supabaseRef.current
        .from('app_settings')
        .upsert(settingsToSave, { onConflict: 'id' }) 
        .select()
        .single();

      if (error) {
        console.error("handleConfirmPromotionAndSaveYear: Error saving academic year settings:", error);
        throw error; 
      }

      if (isMounted.current && savedData) {
        const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
        setAppSettings(mergedSettings);
        
        let finalToastMessage = `Academic year successfully set to ${pendingNewAcademicYear}.`;
        if (promotionResult.promotedCount > 0 && promotionResult.errorCount === 0) {
            finalToastMessage += ` ${promotionResult.promotedCount} students promoted successfully.`;
        } else if (promotionResult.promotedCount > 0 && promotionResult.errorCount > 0) {
            finalToastMessage += ` ${promotionResult.promotedCount} students promoted, ${promotionResult.errorCount} failed/blocked. Check console.`;
        } else if (promotionResult.promotedCount === 0 && promotionResult.errorCount > 0) {
            finalToastMessage += ` No students were promoted due to errors/blocks. Check console and RLS.`;
        } else if (promotionResult.promotedCount === 0 && promotionResult.errorCount === 0) {
            finalToastMessage += ` No students required promotion or none were eligible.`;
        }

        toast({
          title: "Academic Year & Promotion Update",
          description: finalToastMessage,
          duration: 9000,
        });
        console.log("handleConfirmPromotionAndSaveYear: Academic year saved successfully.");
      }
    } catch (error: any) {
      console.error(`handleConfirmPromotionAndSaveYear: Error saving Academic Year settings to Supabase:`, error);
      const errorMessage = error.message || "An unknown error occurred during academic year save.";
      toast({ title: "Academic Year Save Failed", description: `Could not save Academic Year settings. Details: ${errorMessage}`, variant: "destructive" });
    } finally {
      if (isMounted.current) {
        console.log("handleConfirmPromotionAndSaveYear: Resetting pending year and dialog states.");
        setPendingNewAcademicYear(null);
        setOldAcademicYearForPromotion(null);
      }
    }
  };


  const handleSaveSettings = async (section: string) => {
    if (!currentUser || !supabaseRef.current) {
      toast({ title: "Authentication Error", description: "You must be logged in as an admin to save settings.", variant: "destructive"});
      return;
    }
    if (isMounted.current) setIsSaving(prev => ({...prev, [section]: true}));

    let settingsToUpdateInDb = { ...appSettings };

    if (section === "Academic Year") {
      let currentDbYear: string;
      try {
        const { data: dbData, error: dbError } = await supabaseRef.current
          .from('app_settings')
          .select('current_academic_year')
          .eq('id', 1)
          .single();
        if (dbError && dbError.code !== 'PGRST116') throw dbError; 
        currentDbYear = dbData?.current_academic_year || defaultAppSettings.current_academic_year;
      } catch (e: any) {
        toast({ title: "Error", description: `Could not fetch current academic year settings: ${e.message}`, variant: "destructive" });
        if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false}));
        return;
      }

      const newAcademicYearFromInput = settingsToUpdateInDb.current_academic_year;

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
        if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false}));
        return;
      }
    }

    if (section === "School Information") {
      if (selectedLogoFile) {
        const oldLogoPath = getPathFromSupabaseUrl(appSettings.school_logo_url);
        const newLogoUrl = await uploadFileToSupabase(selectedLogoFile, 'logos');
        if (newLogoUrl) {
          settingsToUpdateInDb.school_logo_url = newLogoUrl;
          if (oldLogoPath && oldLogoPath !== getPathFromSupabaseUrl(newLogoUrl)) {
             supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).remove([oldLogoPath]).catch(err => console.warn("Failed to delete old logo:", err));
          }
        } else {
          if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false})); return;
        }
      }
      if (selectedHeroFile) {
        const oldHeroPath = getPathFromSupabaseUrl(appSettings.school_hero_image_url);
        const newHeroUrl = await uploadFileToSupabase(selectedHeroFile, 'heroes');
        if (newHeroUrl) {
          settingsToUpdateInDb.school_hero_image_url = newHeroUrl;
           if (oldHeroPath && oldHeroPath !== getPathFromSupabaseUrl(newHeroUrl)) {
             supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).remove([oldHeroPath]).catch(err => console.warn("Failed to delete old hero image:", err));
          }
        } else {
          if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false})); return;
        }
      }
    }

    const finalPayloadToSave = {
      ...settingsToUpdateInDb,
      id: 1, 
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: savedData, error } = await supabaseRef.current
        .from('app_settings')
        .upsert(finalPayloadToSave, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      if (isMounted.current && savedData) {
        const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
        setAppSettings(mergedSettings);
        if (section === "School Information") {
          setSelectedLogoFile(null); 
          if (mergedSettings.school_logo_url) setLogoPreviewUrl(mergedSettings.school_logo_url);
          setSelectedHeroFile(null);
          if (mergedSettings.school_hero_image_url) setHeroPreviewUrl(mergedSettings.school_hero_image_url);
        }
      }
      toast({
        title: `${section} Settings Saved`,
        description: `${section} settings have been updated in Supabase.`,
      });

    } catch (error: any) {
      console.error(`Error saving ${section} settings to Supabase:`, error);
      const errorMessage = error.message || "An unknown error occurred during save.";
      toast({ title: "Save Failed", description: `Could not save ${section} settings. Details: ${errorMessage}`, variant: "destructive", duration: 9000 });
    } finally {
      if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false}));
    }
  };

  const handleRemoveImage = async (type: 'logo' | 'hero') => {
    if (!currentUser || !supabaseRef.current) {
      toast({ title: "Authentication Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    if (isMounted.current) setIsSaving(prev => ({...prev, ["School Information"]: true}));

    const urlField = type === 'logo' ? 'school_logo_url' : 'school_hero_image_url';
    const currentUrl = appSettings[urlField];
    const filePath = getPathFromSupabaseUrl(currentUrl);

    const updatePayload = { [urlField]: "", id: 1, updated_at: new Date().toISOString() };

    try {
      const { error: dbError } = await supabaseRef.current
        .from('app_settings')
        .update(updatePayload) 
        .eq('id', 1);

      if (dbError) throw dbError;

      if (isMounted.current) {
        setAppSettings(prev => ({...prev, [urlField]: ""}));
        if (type === 'logo') {
          if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
          setLogoPreviewUrl(null);
          setSelectedLogoFile(null);
        } else {
          if (heroPreviewUrl && heroPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(heroPreviewUrl);
          setHeroPreviewUrl(null);
          setSelectedHeroFile(null);
        }
      }

      if (filePath) {
        const { error: storageError } = await supabaseRef.current.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove([filePath]);
        if (storageError) {
          console.warn(`Failed to delete ${type} image from Supabase Storage: ${storageError.message}. URL cleared from DB.`);
          const errorMsg = storageError.message || "Unknown storage error.";
          toast({ title: "Storage Warning", description: `Image URL cleared, but failed to delete from storage: ${errorMsg}`, variant: "default", duration: 7000 });
        } else {
           toast({ title: "Image Removed", description: `${type === 'logo' ? 'School logo' : 'Hero image'} removed successfully.` });
        }
      } else {
         toast({ title: "Image URL Cleared", description: `${type === 'logo' ? 'School logo' : 'Hero image'} URL was cleared.` });
      }

    } catch (error: any) {
      const errorMessage = error.message || "An unknown error occurred.";
      toast({ title: "Removal Failed", description: `Could not remove ${type} image. ${errorMessage}`, variant: "destructive" });
    } finally {
      if (isMounted.current) setIsSaving(prev => ({...prev, ["School Information"]: false}));
    }
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      toast({
        title: "LocalStorage Cleared",
        description: "All application data stored in your browser's local storage has been deleted. This does not affect Supabase data. Please refresh or log in again.",
        duration: 7000,
      });
      setIsClearDataDialogOpen(false);
      window.location.reload(); 
    }
  };

  if (isLoadingSettings && !loadingError) { 
     return (
       <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading system settings from Supabase...</p>
        </div>
     );
  }

  if (loadingError) {
    return (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle /> Error</CardTitle></CardHeader>
          <CardContent><p>{loadingError}</p></CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Settings className="mr-3 h-8 w-8" /> System Settings
        </h2>
      </div>

      {!isLoadingSettings && !loadingError && currentUser && (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><CalendarCog /> Academic Year & Student Promotion</CardTitle>
            <CardDescription>Configure current academic year. Changing this will prompt to promote all eligible students to their next grade level. (Saves to Supabase)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current_academic_year">Current Academic Year</Label>
              <Input id="current_academic_year" value={appSettings.current_academic_year} onChange={(e) => handleSettingChange('current_academic_year', e.target.value)} placeholder="e.g., 2024-2025" />
            </div>
            <p className="text-xs text-muted-foreground">
                When you save a new academic year, you will be asked to confirm if you want to automatically promote students.
                Students in {GRADE_LEVELS[GRADE_LEVELS.length - 2]} will be marked as '{GRADE_LEVELS[GRADE_LEVELS.length - 1]}'.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Academic Year")} disabled={!currentUser || isSaving["Academic Year"] || isPromotionDialogActionBusy}>
              {(isSaving["Academic Year"] || isPromotionDialogActionBusy) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving["Academic Year"] ? "Saving Year..." : (isPromotionDialogActionBusy ? "Processing..." : <><Save className="mr-2 h-4 w-4"/> Save Academic Year</>)}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary/90"><School/> School Information</CardTitle>
            <CardDescription>Update school details. Images are uploaded to Supabase Storage, URLs saved to Database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div><Label htmlFor="school_name">School Name</Label><Input id="school_name" value={appSettings.school_name} onChange={(e) => handleSettingChange('school_name', e.target.value)} /></div>
            <div><Label htmlFor="school_slogan">School Slogan (for Homepage)</Label><Textarea id="school_slogan" value={appSettings.school_slogan || ""} onChange={(e) => handleSettingChange('school_slogan', e.target.value)} /></div>
            <div><Label htmlFor="school_address">School Address</Label><Textarea id="school_address" value={appSettings.school_address} onChange={(e) => handleSettingChange('school_address', e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="school_phone">Contact Phone</Label><Input id="school_phone" type="tel" value={appSettings.school_phone} onChange={(e) => handleSettingChange('school_phone', e.target.value)} /></div>
              <div><Label htmlFor="school_email">Contact Email</Label><Input type="email" id="school_email" value={appSettings.school_email} onChange={(e) => handleSettingChange('school_email', e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_logo_file" className="flex items-center"><UploadCloud className="mr-2 h-4 w-4" /> School Logo</Label>
              {(logoPreviewUrl || appSettings.school_logo_url) && (
                <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]">
                  <NextImage src={logoPreviewUrl || appSettings.school_logo_url} alt="Logo Preview" width={150} height={80} className="object-contain max-h-20" data-ai-hint="school logo"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('logo')} disabled={isSaving["School Information"]}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="school_logo_file" type="file" accept="image/*" onChange={(e) => handleFileChange('logo', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground">Select a new logo file to upload. Max 2MB recommended.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_hero_file" className="flex items-center"><UploadCloud className="mr-2 h-4 w-4" /> Homepage Hero Image</Label>
               {(heroPreviewUrl || appSettings.school_hero_image_url) && (
                <div className="my-2 p-2 border rounded-md inline-block relative max-w-[320px]">
                  <NextImage src={heroPreviewUrl || appSettings.school_hero_image_url} alt="Hero Preview" width={300} height={169} className="object-contain max-h-40" data-ai-hint="school campus event"/>
                  <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('hero')} disabled={isSaving["School Information"]}><Trash2 className="h-4 w-4"/></Button>
                </div>
              )}
              <Input id="school_hero_file" type="file" accept="image/*" onChange={(e) => handleFileChange('hero', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              <p className="text-xs text-muted-foreground">Select a new hero image file for the homepage. Max 5MB recommended.</p>
            </div>

          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("School Information")} disabled={!currentUser || isSaving["School Information"]}>
              {isSaving["School Information"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save School Info
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage notification preferences (Saves to Supabase)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
            <div className="flex items-center space-x-3"><Checkbox id="enable_sms_notifications" checked={appSettings.enable_sms_notifications} onCheckedChange={(checked) => handleSettingChange('enable_sms_notifications', !!checked)} /><Label htmlFor="enable_sms_notifications">Enable SMS (mock)</Label></div>
            <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Notification")} disabled={!currentUser || isSaving["Notification"]}>
              {isSaving["Notification"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Notifications
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Puzzle/> Integrations (Mock)</CardTitle><CardDescription>API Keys are mock (Saves to Supabase)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><Label htmlFor="payment_gateway_api_key">Payment Gateway API Key (Test)</Label><Input type="password" id="payment_gateway_api_key" value={appSettings.payment_gateway_api_key} onChange={(e) => handleSettingChange('payment_gateway_api_key', e.target.value)} /></div>
            <div><Label htmlFor="sms_provider_api_key">SMS Provider API Key (Test)</Label><Input type="password" id="sms_provider_api_key" value={appSettings.sms_provider_api_key} onChange={(e) => handleSettingChange('sms_provider_api_key', e.target.value)} /></div>
            <div><Label htmlFor="systemApiKey">System API Key</Label><div className="flex items-center gap-2"><Input id="systemApiKey" value="•••••••• (Mock)" readOnly /><Button variant="outline" onClick={() => toast({title: "API Key Regenerated (Mock)"})}>Regenerate</Button></div></div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("Integration")} disabled={!currentUser || isSaving["Integration"]}>
             {isSaving["Integration"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Integrations
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border-destructive bg-destructive/5">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-3 h-7 w-7" /> Reset LocalStorage Data
                </CardTitle>
                <CardDescription className="text-destructive/90">
                This action is irreversible and will permanently delete data stored in your browser. It does not affect Supabase data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={!currentUser || Object.values(isSaving).some(s => s)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All LocalStorage Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently delete ALL application data stored in THIS browser's local storage,
                        including NON-Supabase user registrations, fee structures, payments, announcements, assignments, results, timetables etc.
                        This cannot be undone.
                        <br/><br/>
                        <strong>This will NOT delete any data from your Supabase database.</strong>
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all localStorage data
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-3">
                Use this if you want to clear out any old data from browser storage that is not managed by Supabase.
                </p>
            </CardContent>
        </Card>
      </>
      )}
       {!isLoadingSettings && !currentUser && !loadingError && (
           <Card className="border-amber-500 bg-amber-500/10">
             <CardHeader><CardTitle className="text-amber-700 flex items-center"><AlertCircle /> Admin Access Required</CardTitle></CardHeader>
             <CardContent><p className="text-amber-600">You must be logged in as an administrator to view and manage system settings.</p></CardContent>
           </Card>
       )}

      <AlertDialog open={isPromotionConfirmOpen} onOpenChange={setIsPromotionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Student Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change the academic year from{" "}
              <strong>{oldAcademicYearForPromotion || "the previous year"}</strong> to{" "}
              <strong>{pendingNewAcademicYear || "the new year"}</strong>.
              <br />
              This action will attempt to promote all eligible students to their next grade level. Students in {GRADE_LEVELS[GRADE_LEVELS.length - 2]} will be marked as '{GRADE_LEVELS[GRADE_LEVELS.length - 1]}'.
              <br /><br />
              <strong className="text-destructive">This is a significant action and will update multiple student records. Are you sure you want to proceed?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (isMounted.current) {
                setIsPromotionConfirmOpen(false);
                setPendingNewAcademicYear(null);
                setOldAcademicYearForPromotion(null);
                setIsSaving(prev => ({...prev, ["Academic Year"]: false, ["promoteStudents"]: false }));
              }
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="confirm-promote-action-button" 
              onClick={async () => {
                if(isMounted.current) setIsPromotionDialogActionBusy(true);
                try {
                  await handleConfirmPromotionAndSaveYear();
                } finally {
                  if(isMounted.current) {
                    setIsPromotionDialogActionBusy(false);
                    setIsPromotionConfirmOpen(false); 
                  }
                }
              }}
              disabled={isPromotionDialogActionBusy}
              className="bg-primary hover:bg-primary/90"
            >
              {isPromotionDialogActionBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Promote Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    
