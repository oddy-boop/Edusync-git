
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
  // If a user is authenticated, prefer loading their associated school (via user_roles).
  // This ensures the settings shown in the admin UI match the school updated on save.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: roleData, error: roleDataError } = await supabase.from('user_roles').select('role, school_id').eq('user_id', user.id).maybeSingle();
    if (roleDataError) {
      console.error('getSchoolSettings: error fetching user role:', roleDataError);
      // fall through to public/default behavior
    } else if (roleData?.school_id) {
      const { data, error } = await supabase.from('schools').select('*').eq('id', roleData.school_id).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('getSchoolSettings Action Error:', error);
        return { data: null, error: error.message };
      }
      if (data) return { data, error: null };
      // If we couldn't find the user's school, fall through to the public/default behavior below.
    } else if (roleData?.role === 'super_admin') {
      // Super admin: default to the first school so they can manage a branch quickly.
      const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error('getSchoolSettings Action Error:', error);
        return { data: null, error: error.message };
      }
      if (data) return { data, error: null };
    }
  }

  // With the removal of subdomains, fallback to fetching the first school as the default for public pages.
  // This also handles anonymous visitors.
  let schoolQuery = supabase.from('schools').select('*').order('created_at', { ascending: true });

  const { data, error } = await schoolQuery.limit(1).single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which we handle
    console.error("getSchoolSettings Action Error:", error);
    return { data: null, error: error.message };
  }
    
  if (!data) {
    const defaultSchool = {
      id: 0,
      name: 'EduSync',
      domain: null,
      address: null,
      phone: null,
      email: null,
      current_academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      enable_online_payments: false,
      logo_url: null
    };
    return { data: defaultSchool, error: null };
  }

  return { data, error: null };
}

export async function saveSchoolSettings(settings: any): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Not authenticated" };
  // Use maybeSingle to avoid throwing if no rows are returned (PGRST116)
  const { data: roleData, error: roleDataError } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).maybeSingle();
  if (roleDataError) {
    console.error('Error fetching user role data:', roleDataError);
    return { success: false, message: 'Failed to determine user school association' };
  }
  if (!roleData?.school_id) return { success: false, message: "User not associated with a school" };
    
  try {
    console.debug('saveSchoolSettings: roleData', roleData);

    // Ensure the school exists before attempting update
    const schoolId = Number(roleData.school_id);
    const { data: existingSchool, error: existingSchoolError } = await supabase.from('schools').select('id').eq('id', schoolId).maybeSingle();
    if (existingSchoolError) {
      console.error('Error checking existing school:', existingSchoolError);
      return { success: false, message: 'Failed to verify school existence' };
    }
    if (!existingSchool) {
      console.error(`No school found with id: ${schoolId}`);
      return { success: false, message: `No school found with id: ${schoolId}` };
    }
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
  .eq('id', schoolId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating school settings:', error);
      throw error;
    }

    if (!data) {
      // No school row was updated/found matching the provided id
      console.error('saveSchoolSettings: update returned no data', { schoolId });
      // It's possible the update succeeded but the DB did not return the row (RLS/RETURNING behavior).
      // Attempt a follow-up read to verify the school exists and return it if available.
      try {
        const { data: fetched, error: fetchErr } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
        if (fetchErr) {
          console.error('saveSchoolSettings: follow-up fetch error', fetchErr);
          return { success: false, message: 'No school found to update' };
        }
        if (fetched) {
          return { success: true, message: 'Settings saved (post-update fetch).', data: fetched };
        }
        return { success: false, message: 'No school found to update' };
      } catch (err: any) {
        console.error('saveSchoolSettings: follow-up fetch threw', err);
        return { success: false, message: `No school found to update: ${err?.message ?? String(err)}` };
      }
    }
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
  // Validate and parse the provided academic year string (expected format: YYYY-YYYY)
  const acadRegex = /^(\d{4})-(\d{4})$/;
  let startYear: number | null = null;
  let endYear: number | null = null;
  if (typeof previousAcademicYear === 'string' && acadRegex.test(previousAcademicYear)) {
    const m = previousAcademicYear.match(acadRegex)!;
    startYear = parseInt(m[1], 10);
    endYear = parseInt(m[2], 10);
  } else {
    // Try to read the school's configured academic year as a fallback
    try {
      const { data: schoolRow } = await supabase.from('schools').select('current_academic_year').eq('id', schoolId).maybeSingle();
      const fallback = schoolRow?.current_academic_year;
      if (typeof fallback === 'string' && acadRegex.test(fallback)) {
        const m = fallback.match(acadRegex)!;
        startYear = parseInt(m[1], 10);
        endYear = parseInt(m[2], 10);
      }
    } catch (e) {
      // ignore and handle below
    }
  }

  if (startYear === null || endYear === null || Number.isNaN(startYear) || Number.isNaN(endYear)) {
    return { success: false, message: `Invalid academic year format: "${previousAcademicYear}". Expected format YYYY-YYYY.` };
  }

  const nextAcademicYear = `${startYear + 1}-${endYear + 1}`;
  
  try {
    const { data: students, error: sErr } = await supabase.from('students').select('*').eq('school_id', schoolId);
    if(sErr) throw sErr;
    const { data: feeItems, error: fErr } = await supabase.from('school_fee_items').select('grade_level, amount').eq('academic_year', previousAcademicYear).eq('school_id', schoolId);
    if(fErr) throw fErr;
  const paymentsStartDate = `${startYear}-08-01`;
  const paymentsEndDate = `${endYear}-07-31`;
  const { data: payments, error: pErr } = await supabase.from('fee_payments').select('student_id_display, amount_paid').gte('payment_date', paymentsStartDate).lte('payment_date', paymentsEndDate).eq('school_id', schoolId);
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
        // Update each student but scope by school_id to satisfy RLS and be explicit about the target school.
        const updatePromises = promotionUpdates.map(p =>
          supabase
            .from('students')
            .update({ grade_level: p.grade_level, total_paid_override: null })
            .eq('id', p.id)
            .eq('school_id', schoolId)
            .select()
            .maybeSingle()
        );

        const results = await Promise.allSettled(updatePromises);
        const failed: any[] = [];
        let successCount = 0;
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const value = r.value as any;
            if (value && value.error) {
              failed.push(value.error);
            } else {
              successCount++;
            }
          } else {
            failed.push(r.reason);
          }
        }

        if (failed.length > 0) {
          console.error('endOfYearProcessAction: some student promotions failed', failed);
          return { success: false, message: `Promoted ${successCount}/${promotionUpdates.length} students; ${failed.length} failed. Check server logs for details.` };
        }
      }
    }
    
    return { success: true, message: `Arrears calculated and students promoted successfully.` };
  } catch (error: any) {
    console.error("End of year process error:", error);
    return { success: false, message: `Process failed: ${error.message}` };
  }
}

    