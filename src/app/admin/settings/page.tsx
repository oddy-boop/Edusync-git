
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
import { Separator } from "@/components/ui/separator";

interface HeroSlide {
  id: string;
  url: string;
  slogan: string;
}

interface AppSettings {
  id?: number;
  school_id?: string;
  current_academic_year: string;
  school_name: string;
  school_slogan: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo_url: string;
  homepage_hero_slides: HeroSlide[];
  about_history_image_url: string;
  about_leader1_image_url: string;
  about_leader2_image_url: string;
  about_leader3_image_url: string;
  admissions_form_url?: string;
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
  about_leader1_name: string;
  about_leader1_title: string;
  about_leader2_name: string;
  about_leader2_title: string;
  about_leader3_name: string;
  about_leader3_title: string;
  facility1_name: string;
  facility1_image_url: string;
  facility2_name: string;
  facility2_image_url: string;
  facility3_name: string;
  facility3_image_url: string;
  program_creche_image_url: string;
  program_kindergarten_image_url: string;
  program_primary_image_url: string;
  program_jhs_image_url: string;
  program_extracurricular_image_url: string;
  program_science_tech_image_url: string;
  updated_at?: string;
}

const defaultAppSettings: AppSettings = {
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  school_name: "EduSync Platform",
  school_slogan: "A tradition of excellence, a future of innovation.",
  school_address: "123 Education Road, Accra, Ghana",
  school_phone: "+233 12 345 6789",
  school_email: "info@edusync.com",
  school_logo_url: "",
  homepage_hero_slides: [],
  about_history_image_url: "",
  about_leader1_image_url: "",
  about_leader2_image_url: "",
  about_leader3_image_url: "",
  enable_email_notifications: true,
  email_footer_signature: "Kind Regards,\nThe Administration,\nEduSync",
  about_history_mission: "Founded on the principles of academic rigor and holistic development, our platform empowers schools to create a learning environment where every child feels valued, challenged, and inspired to reach their full potential. Our mission is to provide a comprehensive education that nurtures intellectual curiosity, fosters critical thinking, and instills strong moral character. We are committed to preparing students not just for the next stage of their education, but for a lifetime of success and meaningful contribution to society.",
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
  about_leader1_name: "",
  about_leader1_title: "",
  about_leader2_name: "",
  about_leader2_title: "",
  about_leader3_name: "",
  about_leader3_title: "",
  facility1_name: "Modern Classrooms",
  facility1_image_url: "",
  facility2_name: "Science & ICT Labs",
  facility2_image_url: "",
  facility3_name: "Library & Resource Center",
  facility3_image_url: "",
  admissions_form_url: "",
  program_creche_image_url: "",
  program_kindergarten_image_url: "",
  program_primary_image_url: "",
  program_jhs_image_url: "",
  program_extracurricular_image_url: "",
  program_science_tech_image_url: "",
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

  type FileState = Record<string, File | null>;
  type PreviewState = Record<string, string | null>;

  const [fileSelections, setFileSelections] = useState<FileState>({});
  const [previewUrls, setPreviewUrls] = useState<PreviewState>({});

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [isPromotionConfirmOpen, setIsPromotionConfirmOpen] = useState(false);
  const [pendingNewAcademicYear, setPendingNewAcademicYear] = useState<string | null>(null);
  const [oldAcademicYearForPromotion, setOldAcademicYearForPromotion] = useState<string | null>(null);
  const [isPromotionDialogActionBusy, setIsPromotionDialogActionBusy] = useState(false);

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [newSlideSlogan, setNewSlideSlogan] = useState("");
  const [newSlideFile, setNewSlideFile] = useState<File | null>(null);
  const [stagedSlideFiles, setStagedSlideFiles] = useState<Record<string, File>>({}); // Maps temp ID to File

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
        const { data: roleData, error: roleError } = await supabaseRef.current
            .from('user_roles')
            .select('role, school_id')
            .eq('user_id', session.user.id)
            .single();

        if (roleError && roleError.code !== 'PGRST116') {
            throw new Error(`Could not determine your user role: ${roleError.message}`);
        }

        let schoolIdToManage: string | null = null;

        if (roleData?.role === 'super_admin') {
            // Super admin manages the settings of the first created school
            const { data: firstSchool, error: firstSchoolError } = await supabaseRef.current
                .from('schools')
                .select('id')
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
            if (firstSchoolError) throw new Error("Could not find the default school for Super Admin.");
            schoolIdToManage = firstSchool.id;
        } else if (roleData?.role === 'admin' && roleData.school_id) {
            // Regular admin manages their own school's settings
            schoolIdToManage = roleData.school_id;
        } else {
            throw new Error("You do not have the required role or school affiliation to manage settings.");
        }

        if (!schoolIdToManage) {
            throw new Error("Could not identify which school's settings to manage.");
        }

        const { data, error } = await supabaseRef.current.from('app_settings').select('*').eq('school_id', schoolIdToManage).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (isMounted.current) {
            const mergedSettings = { ...defaultAppSettings, ...data } as AppSettings;
            setAppSettings(mergedSettings);
            setSlides(mergedSettings.homepage_hero_slides || []);

            const initialPreviews: PreviewState = {};
            Object.keys(mergedSettings).forEach(key => {
                if (key.endsWith('_image_url') && mergedSettings[key as keyof AppSettings]) {
                    const previewKey = key.replace('_image_url', '').replace('_url', '').replace('school_', '');
                    initialPreviews[previewKey] = mergedSettings[key as keyof AppSettings] as string;
                }
            });
            setPreviewUrls(initialPreviews);
          }
        } else {
          // If no settings exist for this school, create the default entry
          if (isMounted.current) setAppSettings({ ...defaultAppSettings, school_id: schoolIdToManage });
          const { error: upsertError } = await supabaseRef.current.from('app_settings').upsert({ ...defaultAppSettings, school_id: schoolIdToManage }, { onConflict: 'school_id' });
          if (upsertError) {
             console.error("AdminSettingsPage: Error upserting default settings:", upsertError);
             if (isMounted.current) setLoadingError(`Failed to initialize settings: ${upsertError.message}`);
          } else if (isMounted.current) {
            toast({ title: "Settings Initialized", description: "Default settings have been established for your school."});
            const { data: newData } = await supabaseRef.current.from('app_settings').select('*').eq('school_id', schoolIdToManage).single();
            if (newData && isMounted.current) {
                setAppSettings({ ...defaultAppSettings, ...newData });
            }
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
      Object.values(previewUrls).forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
       Object.values(slides).forEach(slide => {
        if (slide.url && slide.url.startsWith('blob:')) URL.revokeObjectURL(slide.url);
      });
    };
  }, []);

  const handleSettingChange = (field: keyof AppSettings, value: string | boolean) => {
    setAppSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    const currentPreview = previewUrls[key];
    if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
    }
    
    if (file) {
      setFileSelections(prev => ({...prev, [key]: file}));
      setPreviewUrls(prev => ({...prev, [key]: URL.createObjectURL(file)}));
    } else {
      setFileSelections(prev => ({...prev, [key]: null}));
      let dbUrlField: keyof AppSettings;
      if (key === 'logo') {
        dbUrlField = 'school_logo_url';
      } else if (key === 'admissions_form') {
        dbUrlField = `admissions_form_url` as keyof AppSettings;
      } else {
        dbUrlField = `${key}_image_url` as keyof AppSettings;
      }
      setPreviewUrls(prev => ({...prev, [key]: appSettings[dbUrlField] as string || null}));
    }
  };

  const uploadFileToSupabase = async (file: File, pathPrefix: string): Promise<string | null> => {
    if (!supabaseRef.current) {
        toast({ title: "Client Error", description: "Database client not initialized.", variant: "destructive" });
        return null;
    }
    const schoolIdPath = appSettings.school_id || 'unknown-school';
    const fileName = `${pathPrefix}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${schoolIdPath}/${pathPrefix}/${fileName}`;

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
                    const arrearPayload = { student_id_display: studentInfo.student_id_display, student_name: studentInfo.name, grade_level_at_arrear: studentInfo.oldGrade, academic_year_from: oldAcademicYear, academic_year_to: newAcademicYear, amount: outstandingBalance, status: 'outstanding', created_by_user_id: currentUser?.id, school_id: appSettings.school_id };
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
    const settingsToSave = { ...appSettings, current_academic_year: pendingNewAcademicYear, updated_at: new Date().toISOString() };
    try {
      const { data: savedData, error } = await supabaseRef.current.from('app_settings').upsert(settingsToSave, { onConflict: 'school_id' }).select().single();
      if (error) throw error; 
      if (isMounted.current && savedData) {
        const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
        setAppSettings(mergedSettings);
        let finalToastMessage = `Academic year successfully set to ${pendingNewAcademicYear}.`;
        if (promotionResult.promotedCount > 0 && promotionResult.errorCount === 0) finalToastMessage += ` ${promotionResult.promotedCount} students promoted, ${promotionResult.arrearsCreatedCount} arrears created.`;
        else if (promotionResult.promotedCount > 0 && promotionResult.errorCount > 0) finalToastMessage += ` ${promotionResult.promotedCount} students promoted, ${promotionResult.arrearsCreatedCount} arrears created. ${promotionResult.errorCount} ops failed.`;
        else finalToastMessage += ` Student promotion processing completed. ${promotionResult.arrearsCreatedCount} arrears created.`;
        toast({ title: "Academic Year & Promotion Update", description: finalToastMessage, duration: 15000 });
        
        revalidateWebsitePages().then(revalResult => {
            if(revalResult.success) {
                toast({ title: "Website Updated", description: "Your changes are now live on the public website." });
            } else {
                toast({ title: "Revalidation Failed", description: "Could not update live website cache. Changes might take longer to appear.", variant: "destructive" });
            }
        });
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

const handleSaveSettings = async (section: string) => {
    if (!currentUser || !supabaseRef.current || !appSettings.school_id) {
        toast({ title: "Error", description: "User or school context is missing. Cannot save.", variant: "destructive"});
        return;
    }
    setIsSaving(prev => ({...prev, [section]: true}));

    if (section === "Academic Year") {
      let currentDbYear: string;
      try {
        const { data: dbData, error: dbError } = await supabaseRef.current.from('app_settings').select('current_academic_year').eq('school_id', appSettings.school_id).single();
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

    const payloadUpdates: Partial<AppSettings> = {};
    const fileUploadPromises: Promise<{ type: 'single' | 'slide'; key: string; url: string; tempId?: string } | void>[] = [];

    Object.keys(fileSelections).forEach(key => {
        const file = fileSelections[key];
        if (file) {
            const pathPrefix = key.startsWith('program') ? 'programs' : key.startsWith('facility') ? 'facilities' : key.startsWith('about_leader') ? 'leaders' : key === 'admissions_form' ? 'admissions' : key;
            fileUploadPromises.push(
                uploadFileToSupabase(file, pathPrefix).then(newUrl => {
                    if (newUrl) return { type: 'single', key, url: newUrl };
                    throw new Error(`Upload failed for ${key}`);
                })
            );
        }
    });

    Object.entries(stagedSlideFiles).forEach(([tempId, file]) => {
        fileUploadPromises.push(
            uploadFileToSupabase(file, 'hero').then(newUrl => {
                if (newUrl) return { type: 'slide', key: tempId, url: newUrl, tempId };
                throw new Error(`Upload failed for slide ${file.name}`);
            })
        );
    });

    try {
        const uploadResults = await Promise.all(fileUploadPromises);
        const slideUrlMap = new Map<string, string>();

        uploadResults.forEach(result => {
            if (!result) return;
            if (result.type === 'single') {
                let urlField: keyof AppSettings;
                if (result.key === 'logo') {
                    urlField = 'school_logo_url';
                } else if (result.key === 'admissions_form') {
                    urlField = 'admissions_form_url' as keyof AppSettings;
                } else {
                    urlField = `${result.key}_image_url` as keyof AppSettings;
                }
                (payloadUpdates as any)[urlField] = result.url;
            } else if (result.type === 'slide' && result.tempId) {
                slideUrlMap.set(result.tempId, result.url);
            }
        });

        const finalSlides = slides.map(slide => {
            if (slideUrlMap.has(slide.id)) {
                return { ...slide, url: slideUrlMap.get(slide.id)!, id: crypto.randomUUID() };
            }
            return slide;
        }).filter(slide => !slide.url.startsWith('blob:'));
        
        payloadUpdates.homepage_hero_slides = finalSlides;
        
        const finalPayload = { ...appSettings, ...payloadUpdates, updated_at: new Date().toISOString() };
        
        const { data: savedData, error } = await supabaseRef.current.from('app_settings').upsert(finalPayload, { onConflict: 'school_id' }).select().single();
        
        if (error) {
          console.error(`Error saving settings for section "${section}":`, error);
          throw error;
        }
        
        toast({ title: `${section} Saved`, description: `${section} settings have been updated.` });
        setIsSaving(prev => ({...prev, [section]: false}));
        
        revalidateWebsitePages().then(result => {
            if (result.success) {
                toast({ title: "Website Updated", description: "Your changes are now live on the public website." });
            } else {
                toast({ title: "Revalidation Failed", description: "Could not update live website cache. Changes might take longer to appear.", variant: "destructive" });
            }
        });

        if (isMounted.current && savedData) {
            const mergedSettings = { ...defaultAppSettings, ...savedData } as AppSettings;
            setAppSettings(mergedSettings);
            setSlides(mergedSettings.homepage_hero_slides || []);
            setFileSelections({});
            setStagedSlideFiles({});
            Object.values(previewUrls).forEach(url => { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
        }
    } catch (error: any) {
        console.error(`Error in handleSaveSettings for section "${section}":`, error);
        const errorMessage = error.message || "An unknown error occurred during save.";
        toast({ title: "Save Failed", description: `Could not save ${section} settings. Details: ${errorMessage}`, variant: "destructive", duration: 9000 });
        if (isMounted.current) setIsSaving(prev => ({...prev, [section]: false}));
    }
  };
  
const handleRemoveImage = async (fieldKey: keyof AppSettings, isSlide: boolean = false, slideId?: string) => {
    if (!currentUser || !supabaseRef.current || !appSettings.school_id) return;

    if (isSlide) {
        const slideToRemove = slides.find(s => s.id === slideId);
        if (!slideToRemove) return;

        if (stagedSlideFiles[slideToRemove.id] || slideToRemove.url.startsWith('blob:')) {
            const newStagedFiles = { ...stagedSlideFiles };
            delete newStagedFiles[slideToRemove.id];
            setStagedSlideFiles(newStagedFiles);
            setSlides(prev => prev.filter(s => s.id !== slideId));
            if (slideToRemove.url.startsWith('blob:')) URL.revokeObjectURL(slideToRemove.url);
            toast({ title: "Slide Removed", description: "Staged slide has been removed. Click 'Save' to finalize." });
            return;
        }
    }

    const currentUrl = appSettings[fieldKey] as string;
    let updatePayload: Partial<AppSettings>;
    let localUpdateKey: string;

    if (isSlide) {
        const slideToRemove = slides.find(s => s.id === slideId);
        if (!slideToRemove) return;
        localUpdateKey = `slide-${slideId}`;
        const newSlides = slides.filter(s => s.id !== slideId);
        updatePayload = { homepage_hero_slides: newSlides };
        if (isMounted.current) setSlides(newSlides);
    } else {
        localUpdateKey = fieldKey.replace('_image_url', '').replace('_url', '').replace('school_', '');
        updatePayload = { [fieldKey]: "" as any, updated_at: new Date().toISOString() };
        if (isMounted.current) {
            setAppSettings(prev => ({...prev, [fieldKey]: "" as any}));
            setPreviewUrls(prev => ({...prev, [localUpdateKey]: null}));
            setFileSelections(prev => ({...prev, [localUpdateKey]: null}));
        }
    }

    const filePath = getPathFromSupabaseUrl(currentUrl);

    try {
        const { error: dbError } = await supabaseRef.current.from('app_settings').update(updatePayload).eq('school_id', appSettings.school_id);
        if (dbError) throw dbError;

        if (filePath) {
            const { error: storageError } = await supabaseRef.current.storage.from(SUPABASE_STORAGE_BUCKET).remove([filePath]);
            if (storageError) {
                console.warn(`Database record updated, but failed to delete file from storage: ${storageError.message}. Path: ${filePath}`);
                toast({ title: "Storage Warning", description: "Database updated, but associated file could not be removed from storage.", variant: "default" });
            }
        }
        
        toast({ title: "Image Removed", description: `Image for ${localUpdateKey} removed successfully.` });
        revalidateWebsitePages();

    } catch (error: any) {
        toast({ title: "Removal Failed", description: `Could not remove image: ${error.message}`, variant: "destructive" });
        if (isMounted.current && !isSlide) {
            setAppSettings(prev => ({...prev, [fieldKey]: currentUrl as any}));
            setPreviewUrls(prev => ({...prev, [localUpdateKey]: currentUrl || null}));
        }
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

  const handleAddSlide = () => {
      if (!newSlideFile || !newSlideSlogan) {
          toast({ title: "Missing Information", description: "Please provide both a slogan and an image file for the new slide.", variant: "destructive" });
          return;
      }
      if (!supabaseRef.current) return;

      const tempId = crypto.randomUUID();
      const newSlide: HeroSlide = {
          id: tempId,
          url: URL.createObjectURL(newSlideFile),
          slogan: newSlideSlogan,
      };

      setSlides(prev => [...prev, newSlide]);
      setStagedSlideFiles(prev => ({ ...prev, [tempId]: newSlideFile }));
      
      setNewSlideSlogan("");
      setNewSlideFile(null);
      const fileInput = document.getElementById('new-slide-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
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
                    <Button onClick={() => handleSaveSettings("Academic Year")} disabled={!currentUser || isSaving["Academic Year"] || isPromotionDialogActionBusy}>
                    {(isSaving["Academic Year"] || isPromotionDialogActionBusy) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    {isSaving["Academic Year"] ? "Validating..." : (isPromotionDialogActionBusy ? "Processing..." : "Save Academic Year")}
                    </Button>
                </CardFooter>
            </Card>
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Bell/> Notification Settings</CardTitle><CardDescription>Manage system-wide email notifications.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3"><Checkbox id="enable_email_notifications" checked={appSettings.enable_email_notifications} onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', !!checked)} /><Label htmlFor="enable_email_notifications">Enable Email Notifications</Label></div>
                    <div><Label htmlFor="email_footer_signature">Default Email Footer</Label><Textarea id="email_footer_signature" value={appSettings.email_footer_signature} onChange={(e) => handleSettingChange('email_footer_signature', e.target.value)} rows={3} /></div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Notification Settings")} disabled={!currentUser || isSaving["Notification Settings"]}>{isSaving["Notification Settings"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Notification Settings</Button></CardFooter>
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
                    <div><Label htmlFor="school_slogan">Default Slogan (used if no slides)</Label><Textarea id="school_slogan" value={appSettings.school_slogan || ""} onChange={(e) => handleSettingChange('school_slogan', e.target.value)} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="logo_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> School Logo</Label>
                        {(previewUrls['logo']) && <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]"><img src={previewUrls['logo']} alt="Logo Preview" className="object-contain max-h-20 max-w-[150px]" data-ai-hint="school logo"/><Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('school_logo_url')} disabled={isSaving["Homepage & Branding"]}><Trash2 className="h-4 w-4"/></Button></div>}
                        <Input id="logo_file" type="file" accept="image/*" onChange={(e) => handleFileChange('logo', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                    <Separator/>
                    <div>
                        <Label className="text-lg font-semibold">Homepage Hero Slideshow</Label>
                        <CardDescription>Add, remove, and manage the slides for the homepage hero carousel.</CardDescription>
                        <div className="space-y-4 mt-4">
                            {slides.map((slide) => (
                                <div key={slide.id} className="flex items-center gap-4 p-2 border rounded-md">
                                    <img src={slide.url} alt="Slide preview" className="w-20 h-14 object-cover rounded-md" />
                                    <p className="flex-grow text-sm italic">"{slide.slogan}"</p>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveImage('homepage_hero_slides', true, slide.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                            {slides.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No slides yet. Add one below.</p>}
                        </div>
                        <div className="mt-4 p-4 border-t space-y-3">
                            <Label className="font-semibold">Add New Slide</Label>
                             <Input placeholder="Slogan for the new slide" value={newSlideSlogan} onChange={(e) => setNewSlideSlogan(e.target.value)} />
                             <Input id="new-slide-file-input" type="file" accept="image/*" onChange={(e) => setNewSlideFile(e.target.files?.[0] || null)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                             <Button size="sm" onClick={handleAddSlide}>
                                 Add Slide
                             </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Homepage & Branding")} disabled={!currentUser || isSaving["Homepage & Branding"]}>{isSaving["Homepage & Branding"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Homepage Settings</Button></CardFooter>
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
                        {(previewUrls['about_history']) && <div className="my-2 p-2 border rounded-md inline-block relative max-w-[320px]"><img src={previewUrls['about_history']} alt="About History Preview" className="object-contain max-h-40 max-w-[300px]" data-ai-hint="school building classic"/><Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage('about_history_image_url')} disabled={isSaving["About Page"]}><Trash2 className="h-4 w-4"/></Button></div>}
                        <Input id="about_history_image_file" type="file" accept="image/*" onChange={(e) => handleFileChange('about_history', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveSettings("About Page")} disabled={!currentUser || isSaving["About Page"]}>
                        {isSaving["About Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save About Page Content
                    </Button>
                </CardFooter>
            </Card>
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><Users/> Leadership Team</CardTitle><CardDescription>Update names, titles, and photos for the leadership section.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                            <div className="md:col-span-2 space-y-4">
                                <Label htmlFor={`about_leader${i}_name`}>Leader {i} Full Name</Label>
                                <Input id={`about_leader${i}_name`} value={appSettings[`about_leader${i}_name` as keyof AppSettings] as string} onChange={(e) => handleSettingChange(`about_leader${i}_name` as keyof AppSettings, e.target.value)} />
                                <Label htmlFor={`about_leader${i}_title`}>Leader {i} Title/Role</Label>
                                <Input id={`about_leader${i}_title`} value={appSettings[`about_leader${i}_title` as keyof AppSettings] as string} onChange={(e) => handleSettingChange(`about_leader${i}_title` as keyof AppSettings, e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor={`leader${i}_image_file`}>Leader {i} Image</Label>
                                {(previewUrls[`about_leader${i}`]) && (
                                    <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]">
                                        <img src={previewUrls[`about_leader${i}`]} alt={`Leader ${i} Preview`} className="object-contain max-h-32 max-w-[150px]" data-ai-hint="professional headshot"/>
                                        <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage(`about_leader${i}_image_url` as keyof AppSettings)} disabled={isSaving["About Page"]}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                <Input id={`leader${i}_image_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(`about_leader${i}`, e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                        </div>
                    ))}
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => handleSaveSettings("About Page")} disabled={!currentUser || isSaving["About Page"]}>
                        {isSaving["About Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Leadership Info
                    </Button>
                </CardFooter>
            </Card>
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><School/> Campus Facilities</CardTitle><CardDescription>Update names and images for the facilities section.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                           <div className="md:col-span-2">
                                <Label htmlFor={`facility${i}_name`}>Facility {i} Name</Label>
                                <Input id={`facility${i}_name`} value={appSettings[`facility${i}_name` as keyof AppSettings] as string} onChange={(e) => handleSettingChange(`facility${i}_name` as keyof AppSettings, e.target.value)} />
                           </div>
                           <div className="space-y-2">
                                <Label htmlFor={`facility${i}_image_file`}>Facility {i} Image</Label>
                                {(previewUrls[`facility${i}`]) && (
                                     <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]">
                                        <img src={previewUrls[`facility${i}`]} alt={`Facility ${i} Preview`} className="object-contain max-h-32 max-w-[150px]" data-ai-hint="school facility"/>
                                        <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage(`facility${i}_image_url` as keyof AppSettings)} disabled={isSaving["Campus Facilities"]}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                <Input id={`facility${i}_image_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(`facility${i}`, e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                           </div>
                        </div>
                     ))}
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => handleSaveSettings("Campus Facilities")} disabled={!currentUser || isSaving["Campus Facilities"]}>
                        {isSaving["Campus Facilities"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Facilities Info
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
                    <div className="space-y-2">
                        <Label htmlFor="admissions_form_file" className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Admission Form (PDF)</Label>
                        {previewUrls['admissions_form'] && <p className="text-sm">Current form: <a href={previewUrls['admissions_form']} target="_blank" rel="noopener noreferrer" className="text-accent underline">{(previewUrls['admissions_form'] || '').split('/').pop()}</a></p>}
                        <Input id="admissions_form_file" type="file" accept=".pdf" onChange={(e) => handleFileChange('admissions_form', e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    </div>
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Admissions Page")} disabled={!currentUser || isSaving["Admissions Page"]}>{isSaving["Admissions Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Admissions Content</Button></CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="programs" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-xl text-primary/90"><BookOpen /> Programs Page Content</CardTitle><CardDescription>Manage the descriptions and images for each academic program.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                     {[
                         {key: 'creche', label: 'Creche & Nursery'},
                         {key: 'kindergarten', label: 'Kindergarten'},
                         {key: 'primary', label: 'Primary School'},
                         {key: 'jhs', label: 'Junior High School'},
                         {key: 'extracurricular', label: 'Extracurricular Activities'},
                         {key: 'science_tech', label: 'Science & Technology'},
                     ].map(prog => (
                         <div key={prog.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor={`program_${prog.key}_desc`}>{prog.label} Description</Label>
                                <Textarea id={`program_${prog.key}_desc`} value={appSettings[`program_${prog.key}_desc` as keyof AppSettings] as string} onChange={(e) => handleSettingChange(`program_${prog.key}_desc` as keyof AppSettings, e.target.value)} rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`program_${prog.key}_image_file`}>{prog.label} Image</Label>
                                {(previewUrls[`program_${prog.key}`]) && (
                                    <div className="my-2 p-2 border rounded-md inline-block relative max-w-[200px]">
                                        <img src={previewUrls[`program_${prog.key}`]} alt={`${prog.label} Preview`} className="object-contain max-h-32 max-w-[150px]" data-ai-hint="students classroom"/>
                                        <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-7 w-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1" onClick={() => handleRemoveImage(`program_${prog.key}_image_url` as keyof AppSettings)} disabled={isSaving["Programs Page"]}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                <Input id={`program_${prog.key}_image_file`} type="file" accept="image/*" onChange={(e) => handleFileChange(`program_${prog.key}`, e)} className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            </div>
                         </div>
                     ))}
                </CardContent>
                <CardFooter><Button onClick={() => handleSaveSettings("Programs Page")} disabled={!currentUser || isSaving["Programs Page"]}>{isSaving["Programs Page"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Programs Content</Button></CardFooter>
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
                <CardFooter><Button onClick={() => handleSaveSettings("Contact Info")} disabled={!currentUser || isSaving["Contact Info"]}>{isSaving["Contact Info"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save />} Save Contact Info</Button></CardFooter>
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
