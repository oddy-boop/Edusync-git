
'use server';

import pool from "@/lib/db";
import { getSession } from "@/lib/session";
import { GRADE_LEVELS } from '@/lib/constants';
import { sendSms } from '@/lib/sms';

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getSchoolSettings(): Promise<any> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) return null;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM schools WHERE id = $1', [session.schoolId]);
        return rows[0] || null;
    } catch (e) {
        console.error("Error fetching school settings:", e);
        return null;
    } finally {
        client.release();
    }
}

export async function saveSchoolSettings(settings: any): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) {
        return { success: false, message: "Not authenticated" };
    }
    const client = await pool.connect();
    try {
        // Ensure complex objects are stringified for JSONB
        const whyUsPoints = typeof settings.homepage_why_us_points === 'string' ? settings.homepage_why_us_points : JSON.stringify(settings.homepage_why_us_points);
        const admissionsSteps = typeof settings.admissions_steps === 'string' ? settings.admissions_steps : JSON.stringify(settings.admissions_steps);
        const teamMembers = typeof settings.team_members === 'string' ? settings.team_members : JSON.stringify(settings.team_members);

        const { rows } = await client.query(
            `UPDATE schools SET
                name = $1, address = $2, phone = $3, email = $4, logo_url = $5, current_academic_year = $6,
                paystack_public_key = $7, paystack_secret_key = $8, resend_api_key = $9, google_api_key = $10,
                twilio_account_sid = $11, twilio_auth_token = $12, twilio_phone_number = $13, twilio_messaging_service_sid = $14,
                enable_email_notifications = $15, enable_sms_notifications = $16, email_footer_signature = $17,
                school_latitude = $18, school_longitude = $19, check_in_radius_meters = $20,
                facebook_url = $21, twitter_url = $22, instagram_url = $23, linkedin_url = $24,
                homepage_title = $25, homepage_subtitle = $26, hero_image_url_1 = $27, hero_image_url_2 = $28, hero_image_url_3 = $29, hero_image_url_4 = $30, hero_image_url_5 = $31,
                homepage_welcome_title = $32, homepage_welcome_message = $33, homepage_welcome_image_url = $34,
                homepage_why_us_title = $35, homepage_why_us_points = $36, homepage_news_title = $37,
                about_mission = $38, about_vision = $39, about_image_url = $40,
                admissions_intro = $41, admissions_pdf_url = $42, admissions_steps = $43,
                programs_intro = $44, team_members = $45,
                program_creche_image_url = $46, program_kindergarten_image_url = $47, program_primary_image_url = $48, program_jhs_image_url = $49, donate_image_url = $50,
                color_primary = $51, color_accent = $52, color_background = $53,
                updated_at = now()
            WHERE id = $54 RETURNING *`,
            [
                settings.name, settings.address, settings.phone, settings.email, settings.school_logo_url, settings.current_academic_year,
                settings.paystack_public_key, settings.paystack_secret_key, settings.resend_api_key, settings.google_api_key,
                settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_phone_number, settings.twilio_messaging_service_sid,
                settings.enable_email_notifications, settings.enable_sms_notifications, settings.email_footer_signature,
                settings.school_latitude, settings.school_longitude, settings.check_in_radius_meters,
                settings.facebook_url, settings.twitter_url, settings.instagram_url, settings.linkedin_url,
                settings.homepage_title, settings.homepage_subtitle, settings.hero_image_url_1, settings.hero_image_url_2, settings.hero_image_url_3, settings.hero_image_url_4, settings.hero_image_url_5,
                settings.homepage_welcome_title, settings.homepage_welcome_message, settings.homepage_welcome_image_url,
                settings.homepage_why_us_title, whyUsPoints, settings.homepage_news_title,
                settings.about_mission, settings.about_vision, settings.about_image_url,
                settings.admissions_intro, settings.admissions_pdf_url, admissionsSteps,
                settings.programs_intro, teamMembers,
                settings.program_creche_image_url, settings.program_kindergarten_image_url, settings.program_primary_image_url, settings.program_jhs_image_url, settings.donate_image_url,
                settings.color_primary, settings.color_accent, settings.color_background,
                session.schoolId
            ]
        );
        return { success: true, message: 'Settings saved.', data: rows[0] };
    } catch (error: any) {
        console.error("Error saving settings:", error);
        return { success: false, message: `Failed to save settings: ${error.message}` };
    } finally {
        client.release();
    }
}

export async function uploadSchoolAsset(formData: FormData): Promise<{ success: boolean; message: string; url?: string; }> {
    // This function would need to be implemented with a cloud storage provider like S3, Cloudinary, or Vercel Blob.
    // For this context, we will simulate a successful upload and return a placeholder URL.
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, message: "No file provided." };
    }
    // Simulate upload and return a placeholder
    const placeholderUrl = `https://placehold.co/600x400.png?text=${file.name}`;
    return { success: true, message: "File uploaded (simulated).", url: placeholderUrl };
}

export async function getNewsPosts(): Promise<any[] | null> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) return null;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM news_posts WHERE school_id = $1 ORDER BY published_at DESC', [session.schoolId]);
        return rows;
    } catch (e) {
        console.error("Error fetching news posts:", e);
        return null;
    } finally {
        client.release();
    }
}

export async function saveNewsPost(payload: any): Promise<any> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId || !session.schoolId) throw new Error("Not authenticated");
    const client = await pool.connect();
    try {
        if (payload.id) {
            const { rows } = await client.query('UPDATE news_posts SET title = $1, content = $2, image_url = $3, updated_at = now() WHERE id = $4 AND school_id = $5 RETURNING *',
                [payload.title, payload.content, payload.image_url, payload.id, session.schoolId]);
            return rows[0];
        } else {
            const { rows } = await client.query('INSERT INTO news_posts (school_id, author_id, author_name, title, content, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [session.schoolId, session.userId, session.fullName, payload.title, payload.content, payload.image_url]);
            return rows[0];
        }
    } catch (e: any) {
        throw new Error(`Failed to save news post: ${e.message}`);
    } finally {
        client.release();
    }
}

export async function deleteNewsPost(postId: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session.isLoggedIn || !session.schoolId) return { success: false, message: "Not authenticated" };
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM news_posts WHERE id = $1 AND school_id = $2', [postId, session.schoolId]);
        return { success: true, message: "News post deleted." };
    } catch (e: any) {
        return { success: false, message: `Failed to delete post: ${e.message}` };
    } finally {
        client.release();
    }
}


export async function endOfYearProcessAction(previousAcademicYear: string): Promise<ActionResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.schoolId) {
    return { success: false, message: "User not authenticated." };
  }
  const schoolId = session.schoolId;

  const nextAcademicYear = `${parseInt(previousAcademicYear.split('-')[0]) + 1}-${parseInt(previousAcademicYear.split('-')[1]) + 1}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Step 1: Calculate and Log Arrears
    const { rows: students } = await client.query('SELECT * FROM students WHERE school_id = $1', [schoolId]);
    const { rows: feeItems } = await client.query('SELECT grade_level, amount FROM school_fee_items WHERE academic_year = $1 AND school_id = $2', [previousAcademicYear, schoolId]);
    const { rows: payments } = await client.query('SELECT student_id_display, amount_paid FROM fee_payments WHERE payment_date >= $1 AND payment_date <= $2 AND school_id = $3', [`${previousAcademicYear.split('-')[0]}-08-01`, `${previousAcademicYear.split('-')[1]}-07-31`, schoolId]);

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
            created_by_user_id: session.userId,
            guardian_contact: student.guardian_contact,
          };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (arrearsToInsert.length > 0) {
      await client.query('DELETE FROM student_arrears WHERE school_id = $1 AND academic_year_from = $2 AND academic_year_to = $3', [schoolId, previousAcademicYear, nextAcademicYear]);
      
      const insertArrearsQuery = `INSERT INTO student_arrears (school_id, student_id_display, student_name, grade_level_at_arrear, academic_year_from, academic_year_to, amount, status, created_by_user_id) VALUES ${arrearsToInsert.map((_, i) => `($${i*9+1}, $${i*9+2}, $${i*9+3}, $${i*9+4}, $${i*9+5}, $${i*9+6}, $${i*9+7}, $${i*9+8}, $${i*9+9})`).join(',')}`;
      const insertArrearsValues = arrearsToInsert.flatMap(a => [a.school_id, a.student_id_display, a.student_name, a.grade_level_at_arrear, a.academic_year_from, a.academic_year_to, a.amount, a.status, a.created_by_user_id]);
      await client.query(insertArrearsQuery, insertArrearsValues);
      
      const smsRecipients = arrearsToInsert.filter(a => a.guardian_contact).map(a => ({ phoneNumber: a.guardian_contact!, message: `Hello, please note that an outstanding balance of GHS ${a.amount.toFixed(2)} for ${a.student_name} from the ${previousAcademicYear} academic year has been carried forward as arrears.` }));
      for(const recipient of smsRecipients) { await sendSms({ message: recipient.message, recipients: [{phoneNumber: recipient.phoneNumber}] }); }
    }

    // Step 2: Promote Students
    const { rows: studentsToPromote } = await client.query('SELECT * FROM students WHERE school_id = $1 AND grade_level != $2', [schoolId, 'Graduated']);
    if (studentsToPromote.length > 0) {
      const promotionUpdates = studentsToPromote.map((student: any) => {
        const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
        const nextGrade = (currentGradeIndex > -1 && currentGradeIndex < GRADE_LEVELS.length - 1) ? GRADE_LEVELS[currentGradeIndex + 1] : student.grade_level;
        return { id: student.id, grade_level: nextGrade };
      }).filter((update, index) => update.grade_level !== studentsToPromote[index].grade_level);

      if (promotionUpdates.length > 0) {
        const updatePromises = promotionUpdates.map(p => client.query('UPDATE students SET grade_level = $1, total_paid_override = NULL, updated_at = now() WHERE id = $2', [p.grade_level, p.id]));
        await Promise.all(updatePromises);
      }
    }
    
    await client.query('COMMIT');
    return { success: true, message: `Arrears calculated and students promoted successfully.` };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("End of year process error:", error);
    return { success: false, message: `Process failed: ${error.message}` };
  } finally {
    client.release();
  }
}
