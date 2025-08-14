
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { sendSms } from '@/lib/sms';
import { Resend } from 'resend';
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';
import { z } from 'zod';
import { headers } from 'next/headers';
import { getSubdomain } from "../utils";

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

export async function getSchoolBrandingAction(): Promise<{ data: any | null, error: string | null }> {
    const supabase = createClient();
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);

    let schoolQuery = supabase.from('schools').select('*');
    if (subdomain) {
        schoolQuery = schoolQuery.eq('domain', subdomain);
    } else {
        // Fallback for main domain or local dev: get the first school created.
        schoolQuery = schoolQuery.order('created_at', { ascending: true });
    }

    const { data, error } = await schoolQuery.limit(1).single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which we handle
        console.error("getSchoolBrandingAction Error:", error);
        return { data: null, error: error.message };
    }
    
    if (!data) {
        return { data: null, error: 'No school has been configured yet.\n\nPlease ensure your database is running and at least one school has been configured.' };
    }

    return { data, error: null };
}


interface VerifyPaymentPayload {
  reference: string;
  userId: string;
}

export async function verifyPaystackTransaction(payload: VerifyPaymentPayload): Promise<ActionResponse> {
    const supabase = createClient();
    const { reference, userId } = payload;
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', userId).single();
    if (!roleData?.school_id) return { success: false, message: "Could not identify user's school." };

    const { data: schoolKeys } = await supabase.from('schools').select('paystack_secret_key').eq('id', roleData.school_id).single();
    const secretKey = schoolKeys?.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return { success: false, message: "Paystack secret key not configured." };
    
    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Paystack API Error: ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();

        if (data.data.status !== 'success') {
            return { success: false, message: `Payment not successful. Status: ${data.data.status}` };
        }

        const { data: existingPayment } = await supabase.from('fee_payments').select('id').eq('payment_id_display', reference).single();
        if (existingPayment) {
            return { success: true, message: "This transaction has already been recorded." };
        }

        const { amount, customer, metadata } = data.data;
        const studentIdDisplay = metadata?.custom_fields?.find((f: any) => f.variable_name === 'student_id_display')?.value || 'N/A';
        const studentName = metadata?.custom_fields?.find((f: any) => f.variable_name === 'student_name')?.value || 'N/A';
        const gradeLevel = metadata?.custom_fields?.find((f: any) => f.variable_name === 'grade_level')?.value || 'N/A';
        
        const paymentPayload = {
            school_id: roleData.school_id,
            payment_id_display: reference,
            student_id_display: studentIdDisplay,
            student_name: studentName,
            grade_level: gradeLevel,
            amount_paid: amount / 100, // Convert from pesewas/kobos
            payment_date: format(new Date(), 'yyyy-MM-dd'),
            payment_method: 'Online Payment',
            term_paid_for: 'Online Payment',
            notes: `Online payment via Paystack. Customer: ${customer.email}`,
            received_by_name: 'System',
            received_by_user_id: null,
        };
        
        const { error: insertError } = await supabase.from('fee_payments').insert(paymentPayload);
        if (insertError) throw insertError;
        
        return { success: true, message: "Payment verified and recorded." };

    } catch (error: any) {
        console.error("Verify Paystack Transaction Error:", error);
        return { success: false, message: error.message };
    }
}
