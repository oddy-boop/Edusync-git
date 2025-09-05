
'use server';

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { sendSms } from '@/lib/sms';
import { isSmsNotificationEnabled } from '@/lib/notification-settings';
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
    errorCode?: string | null;
    errorDetails?: string | null;
};

export async function recordPaymentAction(payload: OnlinePaymentFormData): Promise<ActionResponse> {
    const supabase = createClient();

    try {
        // Get the current admin's information for the receipt
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        let adminInfo = 'Admin'; // fallback
        
        if (user) {
            // Try to get admin name from user metadata or email
            adminInfo = user.user_metadata?.full_name || user.email || 'Admin';
        }

        // Get school_id from the first school (since role checking happens before login)
        const { data: schoolData } = await supabase.from('schools').select('id').limit(1).single();
        if (!schoolData) {
            return { success: false, message: "Could not identify school. Please contact support.", errorField: 'auth' };
        }

        const schoolId = schoolData.id;

        // Normalize the provided student ID and perform a case-insensitive lookup scoped to the school.
        const normalizedStudentId = String(payload.studentIdDisplay || '').trim();
        // Lookup student by case-insensitive match but retrieve canonical student_id_display and auth_user_id
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
            .eq('school_id', schoolId) // Ensure student belongs to the school
            .ilike('student_id_display', normalizedStudentId)
            .maybeSingle();

        if (studentError || !student) {
            console.warn('recordPaymentAction: student lookup failed', { provided: payload.studentIdDisplay, normalized: normalizedStudentId, studentError });
            return { success: false, message: `Student ID not found in records for this school (tried: "${normalizedStudentId}"). Please verify the Student ID and school.`, errorField: 'studentIdDisplay' };
        }

    const studentMapped = { ...(student as any), full_name: (student as any).full_name };

        const paymentIdDisplay = `${payload.paymentMethod.substring(0,3).toUpperCase()}-${Date.now()}`;
        
        const paymentPayload = {
            school_id: schoolId,
            payment_id_display: paymentIdDisplay,
            // Use canonical student_id_display from the DB when available to keep formats consistent
            student_id_display: (student as any)?.student_id_display ? String((student as any).student_id_display).toUpperCase() : String(payload.studentIdDisplay || '').toUpperCase(),
            student_name: (student as any).full_name,
            // capture student auth_user_id where available for downstream RLS checks
            student_auth_user_id: (student as any)?.auth_user_id || null,
            amount_paid: payload.amountPaid,
            payment_date: format(payload.paymentDate, 'yyyy-MM-dd'),
            payment_method: payload.paymentMethod,
            term_paid_for: payload.termPaidFor,
            notes: payload.notes,
            received_by_name: adminInfo
        };

        // Attempt insert and capture detailed error information for debugging RLS failures
        const { data: insertedRow, error: insertError } = await supabase.from('fee_payments').insert(paymentPayload).select('id').limit(1).single();
        if (insertError) {
            console.error('Fee payment insert payload:', {
                school_id: paymentPayload.school_id,
                student_id_display: paymentPayload.student_id_display,
                payment_id_display: paymentPayload.payment_id_display,
                amount_paid: paymentPayload.amount_paid,
            });
            console.error('Fee payments insertError:', insertError);
            // Return structured information so callers (and logs) can reveal RLS failures
            return { success: false, message: insertError.message || 'Insert failed', errorCode: insertError.code ?? null, errorDetails: insertError.details ?? null };
        }

    const { data: schoolBranding } = await supabase.from('schools').select('name, address, logo_url, updated_at').eq('id', schoolId).single();

                // Normalize branding so receipts render logos consistently
                try {
                    if (schoolBranding?.logo_url) {
                        const r = await resolveAssetUrl(schoolBranding.logo_url);
                        (schoolBranding as any).logo_url = r ?? schoolBranding.logo_url;
                        (schoolBranding as any).school_logo_url = r ?? schoolBranding.logo_url;
                    } else {
                        (schoolBranding as any).school_logo_url = schoolBranding?.logo_url ?? null;
                    }
                } catch (e) {
                    (schoolBranding as any).school_logo_url = schoolBranding?.logo_url ?? null;
                }

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
            schoolLogoUrl: (schoolBranding as any)?.school_logo_url || schoolBranding?.logo_url || null,
            gradeLevel: (student as any).grade_level || 'N/A',
            receivedBy: adminInfo
        };

        if (student.guardian_contact) {
            // Check if SMS notifications are enabled for this school
            const smsEnabled = await isSmsNotificationEnabled(schoolId);
            if (smsEnabled) {
                const amountStr = (() => { const n = Number(payload.amountPaid); return isNaN(n) ? '0.00' : n.toFixed(2); })();
                sendSms({
                    schoolId: schoolId,
                    message: `Hello, a payment of GHS ${amountStr} has been recorded for ${(student as any).full_name}. Receipt ID: ${paymentIdDisplay}. Thank you.`,
                    recipients: [{ phoneNumber: student.guardian_contact }]
                });
            }
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

    // Guard: ensure the server environment has the service role key available.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('verifyPaystackTransaction: SUPABASE_SERVICE_ROLE_KEY is missing in server environment');
        return { success: false, message: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' };
    }
    
    const { data: roleData } = await supabase.from('user_roles').select('school_id').eq('user_id', userId).maybeSingle();
    let schoolId = roleData?.school_id ?? null;

    // If the caller isn't an admin (no user_roles row), try to resolve the school via the students table
    if (!schoolId) {
        try {
            const { data: studentRow, error: studentRowError } = await supabase
                .from('students')
                .select('school_id')
                .eq('auth_user_id', userId)
                .maybeSingle();
            if (studentRow && studentRow.school_id) {
                schoolId = studentRow.school_id;
            } else {
                console.warn('verifyPaystackTransaction: could not find school from user_roles or students for userId', userId, { studentRowError });
            }
        } catch (e) {
            console.warn('verifyPaystackTransaction: students lookup failed', e);
        }
    }

    if (!schoolId) return { success: false, message: "Could not identify user's school." };

    const { data: schoolKeys } = await supabase.from('schools').select('paystack_secret_key').eq('id', schoolId).single();
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
            school_id: schoolId,
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
