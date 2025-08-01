
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { GRADE_LEVELS } from '@/lib/constants';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const appSettingsSchema = z.object({
  id: z.number().optional(),
  current_academic_year: z.string().regex(/^\d{4}-\d{4}$/, "Academic Year must be in YYYY-YYYY format."),
  school_name: z.string().min(3, "School name is required."),
  school_address: z.string().optional().nullable(),
  school_phone: z.string().optional().nullable(),
  school_email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  paystack_public_key: z.string().optional().nullable(),
  paystack_secret_key: z.string().optional().nullable(),
  resend_api_key: z.string().optional().nullable(),
  google_api_key: z.string().optional().nullable(),
  homepage_title: z.string().optional().nullable(),
  homepage_subtitle: z.string().optional().nullable(),
  color_primary: z.string().optional().nullable(),
  color_accent: z.string().optional().nullable(),
  color_background: z.string().optional().nullable(),
});

export type AppSettingsSchemaType = z.infer<typeof appSettingsSchema>;

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function updateAppSettingsAction(data: AppSettingsSchemaType): Promise<ActionResponse> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated." };
  }

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  if (!roleData || !['admin', 'super_admin'].includes(roleData.role)) {
    return { success: false, message: "Permission denied. Admin access required." };
  }

  const validatedFields = appSettingsSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data format." };
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ ...validatedFields.data, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    console.error("Settings Update Error:", error);
    return { success: false, message: `Failed to update settings: ${error.message}` };
  }

  // Revalidate public pages since their content might have changed
  revalidatePath('/');
  revalidatePath('/about');
  revalidatePath('/admissions');
  revalidatePath('/programs');
  revalidatePath('/contact');
  revalidatePath('/donate');
  revalidatePath('/news');

  return { success: true, message: "Settings updated successfully." };
}


export async function endOfYearProcessAction(previousAcademicYear: string): Promise<ActionResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error for database." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);
  const nextAcademicYear = `${parseInt(previousAcademicYear.split('-')[0]) + 1}-${parseInt(previousAcademicYear.split('-')[1]) + 1}`;

  // Step 1: Calculate and Log Arrears
  try {
    const { data: students, error: studentsError } = await supabaseAdmin.from('students').select('*');
    if (studentsError) throw new Error(`Error fetching students: ${studentsError.message}`);

    const { data: feeItems, error: feesError } = await supabaseAdmin.from('school_fee_items').select('grade_level, amount').eq('academic_year', previousAcademicYear);
    if (feesError) throw new Error(`Error fetching fee items: ${feesError.message}`);

    const { data: payments, error: paymentsError } = await supabaseAdmin.from('fee_payments').select('student_id_display, amount_paid').gte('payment_date', `${previousAcademicYear.split('-')[0]}-08-01`).lte('payment_date', `${previousAcademicYear.split('-')[1]}-07-31`);
    if (paymentsError) throw new Error(`Error fetching payments: ${paymentsError.message}`);

    const paymentsByStudent = (payments || []).reduce((acc, p) => {
      acc[p.student_id_display] = (acc[p.student_id_display] || 0) + p.amount_paid;
      return acc;
    }, {} as Record<string, number>);

    const feesByGrade = (feeItems || []).reduce((acc, f) => {
      acc[f.grade_level] = (acc[f.grade_level] || 0) + f.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const { data: authData } = await createClient().auth.getUser();

    const arrearsToInsert = (students || []).map(student => {
      const totalDue = feesByGrade[student.grade_level] || 0;
      const totalPaid = paymentsByStudent[student.student_id_display] || 0;
      const balance = totalDue - totalPaid;
      
      if (balance > 0) {
        return {
          student_id_display: student.student_id_display,
          student_name: student.full_name,
          grade_level_at_arrear: student.grade_level,
          academic_year_from: previousAcademicYear,
          academic_year_to: nextAcademicYear,
          amount: balance,
          status: 'outstanding',
          created_by_user_id: authData.user?.id,
        };
      }
      return null;
    }).filter((p): p is NonNullable<typeof p> => p !== null);
    
    if (arrearsToInsert.length > 0) {
      await supabaseAdmin.from('student_arrears').delete().eq('academic_year_from', previousAcademicYear).eq('academic_year_to', nextAcademicYear);
      await supabaseAdmin.from('student_arrears').insert(arrearsToInsert);
    }
    
  } catch (error: any) {
    return { success: false, message: `Failed to calculate arrears: ${error.message}` };
  }

  // Step 2: Promote Students
  try {
    const { data: studentsToPromote, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('*')
      .neq('grade_level', 'Graduated');

    if (fetchError) throw fetchError;

    if (!studentsToPromote || studentsToPromote.length === 0) {
      return { success: true, message: "Arrears calculated. No students needed promotion." };
    }

    const promotionUpdates = studentsToPromote.map(student => {
      const currentGradeIndex = GRADE_LEVELS.indexOf(student.grade_level);
      let nextGrade = student.grade_level;

      if (currentGradeIndex > -1 && currentGradeIndex < GRADE_LEVELS.length - 1) {
        nextGrade = GRADE_LEVELS[currentGradeIndex + 1];
      }

      return {
        ...student,
        grade_level: nextGrade,
        total_paid_override: null, // Reset payment override on promotion
        updated_at: new Date().toISOString()
      };
    }).filter(update => update.grade_level !== studentsToPromote.find(s => s.id === update.id)?.grade_level);

    if (promotionUpdates.length === 0) {
      return { success: true, message: "Arrears calculated. All students are already in the highest grade." };
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .upsert(promotionUpdates, { onConflict: 'id' });

    if (updateError) throw updateError;

    return { success: true, message: `Arrears calculated and ${promotionUpdates.length} student(s) promoted successfully.` };
  } catch (error: any) {
    return { success: false, message: `Student promotion failed: ${error.message}` };
  }
}

    
