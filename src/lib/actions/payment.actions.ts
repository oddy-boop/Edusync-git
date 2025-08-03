
'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server'; // For getting user session
import { format } from 'date-fns';

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

export async function verifyPaystackTransaction(reference: string): Promise<ActionResponse> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseServer = await createClient();

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Payment Verification Error: Missing Supabase server environment variables.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }
    
    if (!paystackSecretKey) {
        console.error("Payment Verification Error: Paystack Secret Key is not configured in environment variables.");
        return { success: false, message: "Server is not configured for payment verification. Please contact support." };
    }

    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
        return { success: false, message: "Authentication failed. You must be logged in to verify a payment." };
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
            if (verificationData.data.metadata?.donation === "true") {
                return { success: true, message: "Donation successful! Thank you." };
            }
            
            const { data: serverVerifiedStudent, error: studentError } = await supabaseAdmin
                .from('students')
                .select('student_id_display, full_name, grade_level, auth_user_id')
                .eq('auth_user_id', user.id)
                .single();
            
            if (studentError || !serverVerifiedStudent) {
                 return { success: false, message: "Critical error: Could not verify your student profile after successful payment. Please contact support immediately." };
            }
            
            const { amount, paid_at } = verificationData.data;

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
            
            const paymentToSave = {
                payment_id_display: `PS-${reference}`,
                student_id_display: serverVerifiedStudent.student_id_display,
                student_name: serverVerifiedStudent.full_name,
                grade_level: serverVerifiedStudent.grade_level,
                amount_paid: amount / 100,
                payment_date: format(new Date(paid_at), 'yyyy-MM-dd'),
                payment_method: 'Paystack',
                term_paid_for: 'Online Payment',
                notes: `Online payment via Paystack with reference: ${reference}`,
                received_by_name: 'Paystack Gateway',
                received_by_user_id: serverVerifiedStudent.auth_user_id
            };

            const { data: insertedPayment, error: insertError } = await supabaseAdmin
                .from('fee_payments')
                .insert([paymentToSave])
                .select()
                .single();

            if (insertError) {
                console.error('Failed to save verified payment to database for reference:', reference, 'Payload:', paymentToSave, 'Error:', JSON.stringify(insertError, null, 2));
                let userMessage = `Payment was verified but failed to save to our system. Please contact support with reference: ${reference}.`;
                if (insertError.message.includes('violates row-level security policy')) {
                    userMessage = "Database security policy prevented saving your payment. Please contact administration to resolve this.";
                } else if (insertError.message.includes('violates not-null constraint')) {
                    userMessage = "Payment could not be saved because some required information was missing. Please contact administration.";
                }
                return { success: false, message: userMessage };
            }

            return { success: true, message: `Payment of GHS ${(amount / 100).toFixed(2)} recorded successfully.`, payment: insertedPayment as FeePaymentRecord };

        } else {
            return { success: false, message: `Paystack verification failed: ${verificationData.message}` };
        }
    } catch (error: any) {
        console.error('Error during Paystack verification:', error);
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
}
