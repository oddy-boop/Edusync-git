
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from 'date-fns';
import { sendSms } from '@/lib/sms';
import { Resend } from 'resend';
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';
import { z } from 'zod';

const onlinePaymentSchema = z.object({
  studentIdDisplay: z.string().min(1, "Student ID is required."),
  amountPaid: z.coerce.number().positive("Amount paid must be a positive number."),
  paymentDate: z.date({ required_error: "Payment date is required."}),
  paymentMethod: z.string().min(1, "Payment method is required."),
  termPaidFor: z.string().min(1, "Term/Period is required."),
  notes: z.string().optional(),
});
type OnlinePaymentFormData = z.infer<typeof onlinePaymentSchema>;

type ActionResponse = {
    success: boolean;
    message: string;
    receiptData?: PaymentDetailsForReceipt | null;
    errorField?: string;
};

export async function recordPaymentAction(payload: OnlinePaymentFormData): Promise<ActionResponse> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Admin not authenticated" };
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return { success: false, message: "Admin not associated with a school" };

    try {
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('full_name, grade_level, guardian_contact')
            .eq('student_id_display', payload.studentIdDisplay)
            .eq('school_id', roleData.school_id)
            .single();

        if (studentError || !student) {
            return { success: false, message: "Student ID not found in records for this school.", errorField: 'studentIdDisplay' };
        }

        const paymentIdDisplay = `${payload.paymentMethod.substring(0,3).toUpperCase()}-${Date.now()}`;
        
        const paymentPayload = {
            school_id: roleData.school_id,
            payment_id_display: paymentIdDisplay,
            student_id_display: payload.studentIdDisplay.toUpperCase(),
            student_name: student.full_name,
            grade_level: student.grade_level,
            amount_paid: payload.amountPaid,
            payment_date: format(payload.paymentDate, 'yyyy-MM-dd'),
            payment_method: payload.paymentMethod,
            term_paid_for: payload.termPaidFor,
            notes: payload.notes,
            received_by_name: user.user_metadata?.full_name || 'Admin',
            received_by_user_id: user.id
        };

        const { error: insertError } = await supabase.from('fee_payments').insert(paymentPayload);
        if (insertError) throw insertError;

        const { data: schoolBranding } = await supabase.from('schools').select('name, address, logo_url').eq('id', roleData.school_id).single();

        const receiptData: PaymentDetailsForReceipt = {
            paymentId: paymentIdDisplay,
            studentId: payload.studentIdDisplay.toUpperCase(),
            studentName: student.full_name,
            gradeLevel: student.grade_level,
            amountPaid: payload.amountPaid,
            paymentDate: format(payload.paymentDate, 'PPP'),
            paymentMethod: payload.paymentMethod,
            termPaidFor: payload.termPaidFor,
            notes: payload.notes,
            schoolName: schoolBranding?.name || "School",
            schoolLocation: schoolBranding?.address || "N/A",
            schoolLogoUrl: schoolBranding?.logo_url || null,
            receivedBy: user.user_metadata?.full_name || 'Admin'
        };

        if (student.guardian_contact) {
            sendSms({
                message: `Hello, a payment of GHS ${payload.amountPaid.toFixed(2)} has been recorded for ${student.full_name}. Receipt ID: ${paymentIdDisplay}. Thank you.`,
                recipients: [{ phoneNumber: student.guardian_contact }]
            });
        }
        
        return { success: true, message: "Payment recorded.", receiptData };
        
    } catch(e: any) {
        console.error("Record Payment Error:", e);
        return { success: false, message: e.message };
    }
}

export async function getSchoolBrandingAction(): Promise<{ school_name: string | null, school_address: string | null, school_logo_url: string | null } | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).single();
    if (!roleData?.school_id) return null;
    
    const { data } = await supabase.from('schools').select('name, address, logo_url').eq('id', roleData.school_id).single();

    return data ? { school_name: data.name, school_address: data.address, school_logo_url: data.logo_url } : null;
}
