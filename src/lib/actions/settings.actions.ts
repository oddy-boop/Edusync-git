
'use server';

import { createClient } from "@/lib/supabase/server";
import { GRADE_LEVELS } from '@/lib/constants';
import { sendSms } from '@/lib/sms';

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getSchoolSettings(): Promise<{data: any | null, error: string | null}> {
    const supabase = createClient();

    // With the removal of subdomains, we always fetch the first school as the default for public pages.
    // The specific school context for logged-in users is handled by their user_roles.
    let schoolQuery = supabase.from('schools').select('*').order('created_at', { ascending: true });

    const { data, error } = await schoolQuery.limit(1).single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which we handle
        console.error("getSchoolSettings Action Error:", error);
        return { data: null, error: error.message };
    }
    
    if (!data) {
        return { data: null, error: 'No school has been configured yet.\n\nPlease ensure your database is running and at least one school has been configured.' };
    }

    return { data, error: null };
}

export async function saveSchoolSettings(settings: any): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };
    
    try {
        // Ensure complex objects are stringified for JSONB
        const whyUsPoints = typeof settings.homepage_why_us_points === 'string' ? settings.homepage_why_us_points : JSON.stringify(settings.homepage_why_us_points);
        const admissionsSteps = typeof settings.admissions_steps === 'string' ? settings.admissions_steps : JSON.stringify(settings.admissions_steps);
        const teamMembers = typeof settings.team_members === 'string' ? settings.team_members : JSON.stringify(settings.team_members);

        const { data, error } = await supabase
            .from('schools')
            .update({
                name: settings.name, address: settings.address, phone: settings.phone, email: settings.email, logo_url: settings.school_logo_url, current_academic_year: settings.current_academic_year,
                paystack_public_key: settings.paystack_public_key, paystack_secret_key: settings.paystack_secret_key, resend_api_key: settings.resend_api_key, google_api_key: settings.google_api_key,
                twilio_account_sid: settings.twilio_account_sid, twilio_auth_token: settings.twilio_auth_token, twilio_phone_number: settings.twilio_phone_number, twilio_messaging_service_sid: settings.twilio_messaging_service_sid,
                enable_email_notifications: settings.enable_email_notifications, enable_sms_notifications: settings.enable_sms_notifications, email_footer_signature: settings.email_footer_signature,
                school_latitude: settings.school_latitude, school_longitude: settings.school_longitude, check_in_radius_meters: settings.check_in_radius_meters,
                facebook_url: settings.facebook_url, twitter_url: settings.twitter_url, instagram_url: settings.instagram_url, linkedin_url: settings.linkedin_url,
                homepage_title: settings.homepage_title, homepage_subtitle: settings.homepage_subtitle, hero_image_url_1: settings.hero_image_url_1, hero_image_url_2: settings.hero_image_url_2, hero_image_url_3: settings.hero_image_url_3, hero_image_url_4: settings.hero_image_url_4, hero_image_url_5: settings.hero_image_url_5,
                homepage_welcome_title: settings.homepage_welcome_title, homepage_welcome_message: settings.homepage_welcome_message, homepage_welcome_image_url: settings.homepage_welcome_image_url,
                homepage_why_us_title: settings.homepage_why_us_title, homepage_why_us_points: whyUsPoints, homepage_news_title: settings.homepage_news_title,
                about_mission: settings.about_mission, about_vision: settings.about_vision, about_image_url: settings.about_image_url,
                admissions_intro: settings.admissions_intro, admissions_pdf_url: settings.admissions_pdf_url, admissions_steps: admissionsSteps,
                programs_intro: settings.programs_intro, team_members: teamMembers,
                program_creche_image_url: settings.program_creche_image_url, program_kindergarten_image_url: settings.program_kindergarten_image_url, program_primary_image_url: settings.program_primary_image_url, program_jhs_image_url: settings.program_jhs_image_url, donate_image_url: settings.donate_image_url,
                color_primary: settings.color_primary, color_accent: settings.color_accent, color_background: settings.color_background,
                updated_at: new Date().toISOString()
            })
            .eq('id', roleData.school_id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, message: 'Settings saved.', data };
    } catch (error: any) {
        console.error("Error saving settings:", error);
        return { success: false, message: `Failed to save settings: ${error.message}` };
    }
}

export async function uploadSchoolAsset(formData: FormData): Promise<{ success: boolean; message: string; url?: string; }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };

    const file = formData.get('file') as File;
    const context = formData.get('context') as string;
    if (!file || !context) {
        return { success: false, message: "File or context missing." };
    }
    
    const filePath = `${context}/${user.id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('school-assets').upload(filePath, file);

    if (error) {
        return { success: false, message: error.message };
    }
    
    const { data } = supabase.storage.from('school-assets').getPublicUrl(filePath);

    return { success: true, message: "File uploaded.", url: data.publicUrl };
}

export async function getNewsPosts(schoolId?: number): Promise<any[] | null> {
    const supabase = createClient();
    let effectiveSchoolId = schoolId;

    if (!effectiveSchoolId) {
        const { data: school, error: schoolError } = await supabase.from('schools').select('id').order('created_at', { ascending: true }).limit(1).single();
        if (schoolError || !school) {
             console.error("getNewsPosts: Could not find a default school.", schoolError);
             return null;
        }
        effectiveSchoolId = school.id;
    }
    
    try {
        const { data, error } = await supabase.from('news_posts').select('*').eq('school_id', effectiveSchoolId).order('published_at', { ascending: false });
        if(error) throw error;
        return data;
    } catch (e) {
        console.error("Error fetching news posts:", e);
        return null;
    }
}

export async function saveNewsPost(payload: any): Promise<any> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) throw new Error("User not associated with a school");

    try {
        if (payload.id) {
            const { data, error } = await supabase.from('news_posts').update({ title: payload.title, content: payload.content, image_url: payload.image_url, updated_at: new Date().toISOString() }).eq('id', payload.id).eq('school_id', roleData.school_id).select().single();
            if(error) throw error;
            return data;
        } else {
            const { data, error } = await supabase.from('news_posts').insert({ school_id: roleData.school_id, author_id: user.id, author_name: user.user_metadata?.full_name, title: payload.title, content: payload.content, image_url: payload.image_url }).select().single();
            if(error) throw error;
            return data;
        }
    } catch (e: any) {
        throw new Error(`Failed to save news post: ${e.message}`);
    }
}

export async function deleteNewsPost(postId: string): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };

    try {
        const { error } = await supabase.from('news_posts').delete().eq('id', postId).eq('school_id', roleData.school_id);
        if(error) throw error;
        return { success: true, message: "News post deleted." };
    } catch (e: any) {
        return { success: false, message: `Failed to delete post: ${e.message}` };
    }
}


export async function endOfYearProcessAction(previousAcademicYear: string): Promise<ActionResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "User not authenticated." };

  const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
  if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };
  
  const schoolId = roleData.school_id;
  const nextAcademicYear = `${parseInt(previousAcademicYear.split('-')[0]) + 1}-${parseInt(previousAcademicYear.split('-')[1]) + 1}`;
  
  try {
    const { data: students, error: sErr } = await supabase.from('students').select('*').eq('school_id', schoolId);
    if(sErr) throw sErr;
    const { data: feeItems, error: fErr } = await supabase.from('school_fee_items').select('grade_level, amount').eq('academic_year', previousAcademicYear).eq('school_id', schoolId);
    if(fErr) throw fErr;
    const { data: payments, error: pErr } = await supabase.from('fee_payments').select('student_id_display, amount_paid').gte('payment_date', `${previousAcademicYear.split('-')[0]}-08-01`).lte('payment_date', `${previousAcademicYear.split('-')[1]}-07-31`).eq('school_id', schoolId);
    if(pErr) throw pErr;

    const paymentsByStudent = payments.reduce((acc: Record<string, number>, p: { student_id_display: string, amount_paid: number }) => {
      acc[p.student_id_display] = (acc[p.student_id_display] || 0) + p.amount_paid;
      return acc;
    }, {});

    const feesByGrade = feeItems.reduce((acc: Record<string, number>, f: { grade_level: string, amount: number }) => {
      acc[f.grade_level] = (acc[f.grade_level] || 0) + f.amount;
      return acc;
    }, {});

    const arrearsToInsert = students
      .map((student: any) => {
        const totalDue = feesByGrade[student.grade_level] || 0;
        const totalPaid = paymentsByStudent[student.student_id_display] || 0;
        const balance = totalDue - totalPaid;
        if (balance > 0) {
          return {
            school_id: schoolId,
            student_id_display: student.student_id_display,
            student_name: student.full_name,
            grade_level_at_arrear: student.grade_level,
            academic_year_from: previousAcademicYear,
            academic_year_to: nextAcademicYear,
            amount: balance,
            status: 'outstanding',
            created_by_user_id: user.id,
            guardian_contact: student.guardian_contact,
          };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (arrearsToInsert.length > 0) {
      await supabase.from('student_arrears').delete().eq('school_id', schoolId).eq('academic_year_from', previousAcademicYear).eq('academic_year_to', nextAcademicYear);
      const { error: arrearsError } = await supabase.from('student_arrears').insert(arrearsToInsert.map(({guardian_contact, ...rest}) => rest));
      if(arrearsError) throw arrearsError;
      
      const smsRecipients = arrearsToInsert.filter(a => a.guardian_contact).map(a => ({ phoneNumber: a.guardian_contact!, message: `Hello, please note that an outstanding balance of GHS ${a.amount.toFixed(2)} for ${a.student_name} from the ${previousAcademicYear} academic year has been carried forward as arrears.` }));
      for(const recipient of smsRecipients) { await sendSms({ schoolId: schoolId, message: recipient.message, recipients: [{phoneNumber: recipient.phoneNumber}] }); }
    }

    const studentsToPromote = students.filter(s => s.grade_level !== 'Graduated');
    if (studentsToPromote.length > 0) {
      const promotionUpdates = studentsToPromote.map((student: any) => {
        const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
        const nextGrade = (currentGradeIndex > -1 && currentGradeIndex < GRADE_LEVELS.length - 1) ? GRADE_LEVELS[currentGradeIndex + 1] : student.grade_level;
        return { ...student, grade_level: nextGrade };
      }).filter((update, index) => update.grade_level !== studentsToPromote[index].grade_level);

      if (promotionUpdates.length > 0) {
        const updatePromises = promotionUpdates.map(p => supabase.from('students').update({ grade_level: p.grade_level, total_paid_override: null, updated_at: new Date().toISOString() }).eq('id', p.id));
        await Promise.all(updatePromises);
      }
    }
    
    return { success: true, message: `Arrears calculated and students promoted successfully.` };
  } catch (error: any) {
    console.error("End of year process error:", error);
    return { success: false, message: `Process failed: ${error.message}` };
  }
}

    