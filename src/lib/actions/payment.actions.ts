
'use server';

import { createClient, createAuthClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { sendSmsServer } from '@/lib/sms.server';
import { isSmsNotificationEnabled } from '@/lib/notification-settings';
import type { PaymentDetailsForReceipt } from '@/components/shared/PaymentReceipt';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

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

export async function recordPaymentAction(payload: OnlinePaymentFormData, schoolIdOverride?: number | null): Promise<ActionResponse> {
    // service-role client for privileged reads/writes
    const supabase = createClient();
    // auth client that propagates caller cookies to resolve the authenticated user
    const authSupabase = createAuthClient();

    try {
        // Get the current admin's information for the receipt
        const { data: { user }, error: authError } = await authSupabase.auth.getUser();
        let adminInfo = 'Admin'; // fallback

        if (user) {
            // Try to get admin name from user metadata or email
            adminInfo = (user as any).user_metadata?.full_name || user.email || 'Admin';
        }

        // Resolve the admin's school. Preference order:
        // 1) explicit schoolIdOverride parameter (e.g., passed from client cache)
        // 2) school stored in user_roles for the authenticated admin
        // 3) fallback to the first school row for public pages or legacy behavior
        let schoolId: number | null = null;

        // 1) honor explicit override (this is the cached/selected branch from client)
        if (typeof schoolIdOverride === 'number' && !Number.isNaN(schoolIdOverride) && schoolIdOverride > 0) {
            // validate that the acting user is authorized for this school
                    if (user && user.id) {
                        try {
                            // Use service-role client to validate roles regardless of RLS
                            const { data: allowedRole, error: allowedError } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).eq('school_id', schoolIdOverride).maybeSingle();
                    if (allowedError) {
                        console.warn('recordPaymentAction: error validating override school role', { userId: user.id, schoolIdOverride, allowedError });
                        // ignore the override on error and fall back
                    } else if (allowedRole && allowedRole.school_id) {
                        schoolId = schoolIdOverride;
                    } else {
                        console.warn('recordPaymentAction: provided schoolIdOverride is not authorized for this user, ignoring override', { userId: user.id, schoolIdOverride });
                        // leave schoolId null so fallback resolution can run
                    }
                } catch (e) {
                    console.warn('recordPaymentAction: validating school override threw', { userId: user.id, schoolIdOverride, error: e });
                }
            } else {
                // no authenticated user; don't honor override coming from unauthenticated contexts
                console.warn('recordPaymentAction: received schoolIdOverride but no authenticated user; ignoring override', { schoolIdOverride });
            }
        }

        // 2) if no override, try user_roles
        if (!schoolId) {
            try {
                if (user && user.id) {
                    const { data: roleData, error: roleError } = await supabase.from('user_roles').select('school_id').eq('user_id', user.id).maybeSingle();
                    if (roleError) {
                        console.warn('recordPaymentAction: error loading user_roles for admin', { userId: user.id, roleError });
                    }
                    schoolId = roleData?.school_id ?? null;
                }
            } catch (e) {
                console.warn('recordPaymentAction: user_roles lookup failed', e);
            }
        }

        // 3) fallback: use the first school in the database (keeps prior behavior)
        if (!schoolId) {
            const { data: schoolData } = await supabase.from('schools').select('id').order('created_at', { ascending: true }).limit(1).single();
            if (!schoolData) {
                return { success: false, message: "Could not identify school. Please contact support.", errorField: 'auth' };
            }
            schoolId = schoolData.id;
        }

    // Narrow schoolId (number | null) to a number since we ensured it above.
    const schoolIdNum: number = Number(schoolId);
        // Multi-strategy student lookup to reduce false-negatives. We try several
        // progressively broader matches and log which strategy succeeded (or
        // failed) for diagnostics. We avoid logging any sensitive fields.
        const providedRaw = String(payload.studentIdDisplay || '');
        const normalizedStudentId = providedRaw.trim();

        async function tryLookupStudent(): Promise<{ student: any | null; strategy?: string; error?: any }> {
            // 1) Exact normalized-case-insensitive match (best)
            try {
                const exact = await supabase
                    .from('students')
                    .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
                    .eq('school_id', schoolIdNum)
                    .ilike('student_id_display', normalizedStudentId)
                    .maybeSingle();
                if (exact.data) return { student: exact.data, strategy: 'ilike-exact' };
            } catch (e) {
                // continue to other strategies but capture error
                console.warn('recordPaymentAction: student lookup exact attempt failed', { schoolId: schoolIdNum, error: e });
            }

            // 2) Uppercase equality against canonical stored value (some schools store uppercase IDs)
            try {
                const upper = await supabase
                    .from('students')
                    .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
                    .eq('school_id', schoolIdNum)
                    .eq('student_id_display', normalizedStudentId.toUpperCase())
                    .maybeSingle();
                if (upper.data) return { student: upper.data, strategy: 'eq-upper' };
            } catch (e) {
                console.warn('recordPaymentAction: student lookup uppercase attempt failed', { schoolId: schoolIdNum, error: e });
            }

            // 3) Wildcard ilike (contains) to tolerate formatting differences
            try {
                const wildcard = await supabase
                    .from('students')
                    .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
                    .eq('school_id', schoolIdNum)
                    .ilike('student_id_display', `%${normalizedStudentId}%`)
                    .limit(1)
                    .maybeSingle();
                if (wildcard.data) return { student: wildcard.data, strategy: 'ilike-wildcard' };
            } catch (e) {
                console.warn('recordPaymentAction: student lookup wildcard attempt failed', { schoolId: schoolIdNum, error: e });
            }

            // 4) If the provided value looks like an auth_user_id (UUID-ish), try that
            const possiblyAuthUserId = normalizedStudentId.match(/^[0-9a-fA-F\-]{8,}$/);
            if (possiblyAuthUserId) {
                try {
                    const authLookup = await supabase
                        .from('students')
                        .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
                        .eq('school_id', schoolIdNum)
                        .eq('auth_user_id', normalizedStudentId)
                        .maybeSingle();
                    if (authLookup.data) return { student: authLookup.data, strategy: 'auth_user_id' };
                } catch (e) {
                    console.warn('recordPaymentAction: student lookup by auth_user_id failed', { schoolId: schoolIdNum, error: e });
                }
            }

            // 5) Try searching by guardian contact (if admin entered a phone number)
            const phoneLike = normalizedStudentId.replace(/[^0-9+]/g, '');
            if (phoneLike.length >= 7) {
                try {
                    const phoneLookup = await supabase
                        .from('students')
                        .select('full_name, grade_level, guardian_contact, student_id_display, auth_user_id, school_id')
                        .eq('school_id', schoolIdNum)
                        .ilike('guardian_contact', `%${phoneLike}%`)
                        .limit(1)
                        .maybeSingle();
                    if (phoneLookup.data) return { student: phoneLookup.data, strategy: 'guardian_contact' };
                } catch (e) {
                    console.warn('recordPaymentAction: student lookup by guardian_contact failed', { schoolId: schoolIdNum, error: e });
                }
            }

            // none matched
            return { student: null };
        }

        // Diagnostics: check whether the current connection is recognized as service role
        try {
            const { data: svcData, error: svcError } = await supabase.rpc('is_service_role');
            if (svcError) {
                console.warn('recordPaymentAction: is_service_role() rpc check returned error', { schoolId: schoolIdNum, error: svcError?.message ?? svcError });
            } else {
                console.info('recordPaymentAction: is_service_role()', { schoolId: schoolIdNum, is_service_role: svcData });
            }
        } catch (e) {
            console.warn('recordPaymentAction: is_service_role() rpc threw', { schoolId: schoolIdNum, error: e });
        }

        // Simple sanity check: try a lightweight students select to see if reads are allowed
        try {
            const { data: sample, error: sampleError } = await supabase.from('students').select('id').limit(1).maybeSingle();
            if (sampleError) {
                console.warn('recordPaymentAction: students test select failed', { schoolId: schoolIdNum, error: sampleError?.message ?? sampleError });
            } else {
                console.info('recordPaymentAction: students test select OK', { schoolId: schoolIdNum, gotRow: !!sample });
            }
        } catch (e) {
            console.warn('recordPaymentAction: students test select threw', { schoolId: schoolIdNum, error: e });
        }

        const lookupResult = await tryLookupStudent();
        if (!lookupResult.student) {
            // Provide structured, non-sensitive diagnostics in logs to help support.
            console.warn('recordPaymentAction: student lookup failed (all strategies)', {
                provided: providedRaw,
                normalized: normalizedStudentId,
                schoolId: schoolIdNum,
            });
            return { success: false, message: `Student ID not found in records for this school (tried: "${normalizedStudentId}"). Please verify the Student ID and school.`, errorField: 'studentIdDisplay' };
        }
        const student = lookupResult.student;
        console.info('recordPaymentAction: student matched', { strategy: lookupResult.strategy, schoolId: schoolIdNum, student_id_display: (student as any)?.student_id_display });

    const studentMapped = { ...(student as any), full_name: (student as any).full_name };

        const paymentIdDisplay = `${payload.paymentMethod.substring(0,3).toUpperCase()}-${Date.now()}`;
        
        const paymentPayload = {
            school_id: schoolIdNum,
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

        // Create audit log for payment recording
        await createAuditLog({
            action: AUDIT_ACTIONS.PAYMENT_RECORDED,
            table_name: 'fee_payments',
            record_id: insertedRow.id?.toString(),
            target_id: payload.studentIdDisplay,
            details: {
                amount_paid: payload.amountPaid,
                payment_method: payload.paymentMethod,
                term_paid_for: payload.termPaidFor,
                student_name: (student as any)?.full_name,
                payment_id: paymentIdDisplay
            },
            school_id: schoolIdNum
        });

    const { data: schoolBranding } = await supabase.from('schools').select('name, address, logo_url, updated_at').eq('id', schoolIdNum).single();

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
            const smsEnabled = await isSmsNotificationEnabled(schoolIdNum);
                if (smsEnabled) {
                const amountStr = (() => { const n = Number(payload.amountPaid); return isNaN(n) ? '0.00' : n.toFixed(2); })();
                await sendSmsServer({
                    schoolId: schoolIdNum,
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
