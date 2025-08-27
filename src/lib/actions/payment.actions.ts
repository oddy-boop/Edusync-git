
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { sendSms } from '@/lib/sms';
import { Resend } from 'resend';
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';
import { z } from 'zod';
import { headers } from 'next/headers';

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
        // Normalize the provided student ID and perform a case-insensitive lookup scoped to the admin's school.
        const normalizedStudentId = String(payload.studentIdDisplay || '').trim();
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('full_name, grade_level, guardian_contact')
            .ilike('student_id_display', normalizedStudentId)
            .eq('school_id', roleData.school_id)
            .maybeSingle();

        if (studentError || !student) {
            console.warn('recordPaymentAction: student lookup failed', { provided: payload.studentIdDisplay, normalized: normalizedStudentId, schoolId: roleData.school_id, studentError });
            return { success: false, message: `Student ID not found in records for this school (tried: "${normalizedStudentId}"). Please verify the Student ID and school.`, errorField: 'studentIdDisplay' };
        }

    const studentMapped = { ...(student as any), full_name: (student as any).full_name };

        const paymentIdDisplay = `${payload.paymentMethod.substring(0,3).toUpperCase()}-${Date.now()}`;
        
        const paymentPayload = {
            school_id: roleData.school_id,
            payment_id_display: paymentIdDisplay,
            student_id_display: payload.studentIdDisplay.toUpperCase(),
            student_name: (student as any).full_name,
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
            studentName: (student as any).full_name,
            amountPaid: payload.amountPaid,
            paymentDate: format(payload.paymentDate, 'PPP'),
            paymentMethod: payload.paymentMethod,
            termPaidFor: payload.termPaidFor,
            notes: payload.notes,
            schoolName: schoolBranding?.name || "School",
            schoolLocation: schoolBranding?.address || "N/A",
            schoolLogoUrl: schoolBranding?.logo_url || null,
            gradeLevel: (student as any).grade_level || 'N/A',
            receivedBy: user.user_metadata?.full_name || 'Admin'
        };

        if (student.guardian_contact) {
            const amountStr = (() => { const n = Number(payload.amountPaid); return isNaN(n) ? '0.00' : n.toFixed(2); })();
            sendSms({
                schoolId: roleData.school_id,
                message: `Hello, a payment of GHS ${amountStr} has been recorded for ${(student as any).full_name}. Receipt ID: ${paymentIdDisplay}. Thank you.`,
                recipients: [{ phoneNumber: student.guardian_contact }]
            });
        }
        
        return { success: true, message: "Payment recorded.", receiptData };
        
    } catch(e: any) {
        console.error("Record Payment Error:", e);
        return { success: false, message: e.message };
    }
}

import { resolveAssetUrl } from '@/lib/supabase/storage.server';

export async function getSchoolBrandingAction(schoolId?: number): Promise<{ data: any | null, error: string | null }> {
    const supabase = createClient();

    let schoolQuery = supabase.from('schools').select('*');
    
    if (schoolId) {
        schoolQuery = schoolQuery.eq('id', schoolId);
    } else {
        // Fallback for public pages: get the first school created.
        schoolQuery = schoolQuery.order('created_at', { ascending: true });
    }

    const { data, error } = await schoolQuery.limit(1).single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which we handle
        console.error("getSchoolBrandingAction Error:", error);
        return { data: null, error: error.message };
    }
    
    if (!data) {
        // Return a harmless default public-facing school so the public site can render
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

        // Resolve logo_url to a public URL if necessary
        if (data?.logo_url) {
            try {
                const resolved = await resolveAssetUrl(data.logo_url);
                data.logo_url = resolved ?? data.logo_url;
            } catch (e) {
                // ignore and keep existing value
            }
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
