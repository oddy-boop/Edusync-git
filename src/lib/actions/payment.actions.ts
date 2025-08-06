
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { sendAnnouncementEmail } from '@/lib/email';
import { Resend } from 'resend';

type PaystackVerificationResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number; // in pesewas
    customer: {
      email: string;
    };
    metadata: {
        student_id_display?: string; 
        student_name?: string;
        grade_level?: string;
        donation?: string;
    };
    paid_at: string; // ISO 8601 string
  };
};

interface FeePaymentRecord {
  id: string;
  payment_id_display: string;
  student_id_display: string;
  amount_paid: number;
  payment_date: string; 
  payment_method: string;
  term_paid_for: string;
  notes?: string | null;
}

type ActionResponse = {
    success: boolean;
    message: string;
    payment?: FeePaymentRecord | null;
}

interface VerificationPayload {
    reference: string;
    userId: string;
}

export async function verifyPaystackTransaction(payload: VerificationPayload): Promise<ActionResponse> {
    const { reference, userId } = payload;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Payment Verification Error: Missing Supabase server environment variables.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }
    
    if (!paystackSecretKey || paystackSecretKey.includes("YOUR")) {
        console.error("Payment Verification Error: Paystack Secret Key is not configured in environment variables.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }

    if (!userId) {
        return { success: false, message: "Authentication failed. User ID is missing." };
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Paystack API returned an error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const verificationData: PaystackVerificationResponse = await response.json();

        if (verificationData.status && verificationData.data.status === 'success') {
            
            // Handle Donation
            if (verificationData.data.metadata?.donation === "true") {
                return { success: true, message: "Donation successful! Thank you." };
            }
            
            // Check if payment already recorded
            const { data: existingPayment, error: checkError } = await supabaseAdmin
                .from('fee_payments')
                .select('*')
                .eq('payment_id_display', `PS-${reference}`)
                .maybeSingle();
            
            if (checkError) {
                throw new Error(`Database error checking for existing payment: ${checkError.message}`);
            }

            if (existingPayment) {
                console.log(`Transaction with reference ${reference} already processed. Returning existing record.`);
                return { success: true, message: 'Payment was already recorded successfully.', payment: existingPayment as FeePaymentRecord };
            }
            
            // Verify student profile server-side
            const { data: serverVerifiedStudent, error: studentError } = await supabaseAdmin
                .from('students')
                .select('student_id_display, full_name, grade_level, auth_user_id')
                .eq('auth_user_id', userId)
                .single();
            
            if (studentError || !serverVerifiedStudent) {
                 return { success: false, message: "Critical error: Could not verify your student profile after successful payment. Please contact support immediately." };
            }

            const { amount, paid_at } = verificationData.data;
            
            const paymentArgs = {
                p_payment_id_display: `PS-${reference}`,
                p_student_id_display: serverVerifiedStudent.student_id_display,
                p_student_name: serverVerifiedStudent.full_name,
                p_grade_level: serverVerifiedStudent.grade_level,
                p_amount_paid: amount / 100,
                p_payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
                p_payment_method: 'Paystack',
                p_term_paid_for: 'Online Payment',
                p_notes: `Online payment via Paystack with reference: ${reference}`,
                p_received_by_name: 'Paystack Gateway',
                p_received_by_user_id: serverVerifiedStudent.auth_user_id
            };

            const { error: rpcError } = await supabaseAdmin.rpc('record_fee_payment', paymentArgs);

            if (rpcError) {
                console.error('Failed to save verified payment via RPC for reference:', reference, 'Args:', paymentArgs, 'Error:', JSON.stringify(rpcError, null, 2));
                return { success: false, message: `Payment was verified but failed to save to our system. Please contact support with reference: ${reference}. Reason: ${rpcError.message}` };
            }
            
            // Send email notification to admin on successful payment
            const { data: settings } = await supabaseAdmin.from('app_settings').select('school_email, school_name').single();
            if (settings?.school_email) {
                const resendApiKey = process.env.RESEND_API_KEY;
                const emailFrom = process.env.EMAIL_FROM_ADDRESS || 'noreply@edusync.app';
                if (resendApiKey && emailFrom) {
                    const resend = new Resend(resendApiKey);
                    await resend.emails.send({
                        from: `EduSync Payments <${emailFrom}>`,
                        to: settings.school_email,
                        subject: `New Online Payment Received - ${serverVerifiedStudent.full_name}`,
                        html: `
                            <p>A new online payment has been successfully processed.</p>
                            <p><strong>Student:</strong> ${serverVerifiedStudent.full_name} (${serverVerifiedStudent.student_id_display})</p>
                            <p><strong>Amount:</strong> GHS ${(amount / 100).toFixed(2)}</p>
                            <p><strong>Reference:</strong> ${reference}</p>
                            <p>This payment has been automatically recorded in the system.</p>
                        `,
                    });
                }
            }


            return { success: true, message: `Payment of GHS ${(amount / 100).toFixed(2)} recorded successfully.`, payment: null };

        } else {
            return { success: false, message: `Paystack verification failed: ${verificationData.message}` };
        }
    } catch (error: any) {
        console.error('Error during Paystack verification:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
