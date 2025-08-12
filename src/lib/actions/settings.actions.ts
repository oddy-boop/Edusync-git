
'use server';

import { createClient } from '@/lib/supabase/server';
import { GRADE_LEVELS } from '@/lib/constants';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendSms } from '@/lib/sms';

type ActionResponse = {
  success: boolean;
  message: string;
};

export async function endOfYearProcessAction(previousAcademicYear: string): Promise<ActionResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { success: false, message: "Server configuration error for database." };
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);
  const nextAcademicYear = `${parseInt(previousAcademicYear.split('-')[0]) + 1}-${parseInt(previousAcademicYear.split('-')[1]) + 1}`;

  // Get the current user's school_id
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }
  const { data: roleData } = await supabaseAdmin.from('user_roles').select('school_id').eq('user_id', user.id).single();
  if (!roleData || !roleData.school_id) {
    return { success: false, message: "Could not determine school for the current user." };
  }
  const schoolId = roleData.school_id;


  // Step 1: Calculate and Log Arrears
  try {
    const { data: students, error: studentsError } = await supabaseAdmin.from('students').select('*').eq('school_id', schoolId);
    if (studentsError) throw new Error(`Error fetching students: ${studentsError.message}`);

    const { data: feeItems, error: feesError } = await supabaseAdmin.from('school_fee_items').select('grade_level, amount').eq('academic_year', previousAcademicYear).eq('school_id', schoolId);
    if (feesError) throw new Error(`Error fetching fee items: ${feesError.message}`);

    const { data: payments, error: paymentsError } = await supabaseAdmin.from('fee_payments').select('student_id_display, amount_paid').gte('payment_date', `${previousAcademicYear.split('-')[0]}-08-01`).lte('payment_date', `${previousAcademicYear.split('-')[1]}-07-31`).eq('school_id', schoolId);
    if (paymentsError) throw new Error(`Error fetching payments: ${paymentsError.message}`);

    const paymentsByStudent = (payments || []).reduce((acc, p) => {
      acc[p.student_id_display] = (acc[p.student_id_display] || 0) + p.amount_paid;
      return acc;
    }, {} as Record<string, number>);

    const feesByGrade = (feeItems || []).reduce((acc, f) => {
      acc[f.grade_level] = (acc[f.grade_level] || 0) + f.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const { data: authData } = await (await createClient()).auth.getUser();

    const arrearsToInsert = (students || []).map(student => {
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
          created_by_user_id: authData.user?.id,
          // For SMS notification
          guardian_contact: student.guardian_contact,
        };
      }
      return null;
    }).filter((p): p is NonNullable<typeof p> => p !== null);
    
    if (arrearsToInsert.length > 0) {
      await supabaseAdmin.from('student_arrears').delete().eq('school_id', schoolId).eq('academic_year_from', previousAcademicYear).eq('academic_year_to', nextAcademicYear);
      
      const insertPayload = arrearsToInsert.map(({ guardian_contact, ...rest }) => rest);
      await supabaseAdmin.from('student_arrears').insert(insertPayload);
      
      // Send SMS notifications for arrears
      const smsRecipients = arrearsToInsert
        .filter(a => a.guardian_contact)
        .map(a => ({ phoneNumber: a.guardian_contact!, message: `Hello, please note that an outstanding balance of GHS ${a.amount.toFixed(2)} for ${a.student_name} from the ${previousAcademicYear} academic year has been carried forward as arrears.` }));
        
      if(smsRecipients.length > 0){
        for(const recipient of smsRecipients){
          await sendSms({ message: recipient.message, recipients: [{phoneNumber: recipient.phoneNumber}] });
        }
      }
    }
    
  } catch (error: any) {
    return { success: false, message: `Failed to calculate arrears: ${error.message}` };
  }

  // Step 2: Promote Students
  try {
    const { data: studentsToPromote, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
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
        total_paid_override: null, 
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
